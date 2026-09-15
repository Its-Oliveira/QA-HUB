import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Receives granular Cypress/Mocha results for a test run.
//
// Auth: shared secret in header `X-QAHub-Secret` matching env `QAHUB_EVENTS_SECRET`.
//
// Two payload kinds (field `type`):
//  - "event":  a single test starting/finishing (live tree updates)
//  - "report": the consolidated mochawesome JSON (final, authoritative)
//
// Both identify the run by `correlation_id` (preferred) or `github_run_id`.
// Upsert key is (run_id, spec, full_title) so live events and the final report
// reconcile instead of duplicating. Retries overwrite the previous attempt:
// only the final outcome of each test is stored, `attempts` counts the tries.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Status = "running" | "passed" | "failed" | "pending" | "skipped";

interface TestRow {
  run_id: string;
  spec: string;
  describe_path: string[];
  title: string;
  full_title: string;
  status: Status;
  duration_ms: number | null;
  error_message: string | null;
  error_stack: string | null;
  screenshot: string | null;
  video: string | null;
  source_line: number | null;
  attempts: number;
}

const normalizeSpec = (spec: string) =>
  String(spec || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();

const isUnknownSpec = (spec: string) =>
  !spec || /^spec desconhecid[ao]$/i.test(normalizeSpec(spec));

function findCypressSpec(value: unknown, seen = new Set<unknown>()): string {
  if (!value || seen.has(value)) return "";
  if (typeof value === "string") {
    const match = value.replace(/\\/g, "/").match(/(?:^|[\s"'])([^\s"']+\.cy\.(?:js|jsx|ts|tsx))(?=$|[\s"'])/i);
    return normalizeSpec(match?.[1] ?? "");
  }
  if (typeof value !== "object") return "";
  seen.add(value);
  const record = value as Record<string, unknown>;
  for (const key of ["relativeFile", "absoluteFile", "file", "fullFile", "fileUrl"]) {
    const found = findCypressSpec(record[key], seen);
    if (found) return found;
  }
  for (const nested of Object.values(record)) {
    const found = findCypressSpec(nested, seen);
    if (found) return found;
  }
  return "";
}

const buildFullTitle = (describePath: string[], title: string) =>
  [...describePath, title].filter(Boolean).join(" > ");

/* ---------------- mochawesome parsing ---------------- */

interface MochaTest {
  title?: string;
  fullTitle?: string;
  state?: string;
  pass?: boolean;
  fail?: boolean;
  pending?: boolean;
  skipped?: boolean;
  duration?: number;
  currentRetry?: number;
  err?: { message?: string; estack?: string; stack?: string };
  context?: unknown;
}

interface MochaSuite {
  title?: string;
  tests?: MochaTest[];
  suites?: MochaSuite[];
}

// mochawesome stores attached screenshots/videos in a `context` field that may
// be a JSON-encoded string, an object, or an array of { title, value }.
function extractMedia(context: unknown): { screenshot?: string; video?: string } {
  const out: { screenshot?: string; video?: string } = {};
  let ctx = context;
  if (typeof ctx === "string") {
    try {
      ctx = JSON.parse(ctx);
    } catch {
      ctx = { value: ctx };
    }
  }
  const items = Array.isArray(ctx) ? ctx : ctx ? [ctx] : [];
  for (const item of items) {
    const value =
      typeof item === "string"
        ? item
        : typeof (item as { value?: unknown })?.value === "string"
          ? ((item as { value: string }).value)
          : undefined;
    if (!value) continue;
    if (/\.(png|jpe?g)$/i.test(value)) out.screenshot ??= value;
    if (/\.(mp4|webm)$/i.test(value)) out.video ??= value;
  }
  return out;
}

function mochaState(test: MochaTest): Status {
  if (test.fail || test.state === "failed") return "failed";
  if (test.pass || test.state === "passed") return "passed";
  if (test.pending || test.state === "pending") return "pending";
  return "skipped";
}

function walkSuite(
  suite: MochaSuite,
  spec: string,
  runId: string,
  path: string[],
  rows: TestRow[],
) {
  const nextPath = suite.title ? [...path, suite.title] : path;
  for (const test of suite.tests ?? []) {
    const title = test.title ?? "(sem título)";
    const media = extractMedia(test.context);
    rows.push({
      run_id: runId,
      spec,
      describe_path: nextPath,
      title,
      full_title: test.fullTitle?.trim() || buildFullTitle(nextPath, title),
      status: mochaState(test),
      duration_ms: typeof test.duration === "number" ? Math.round(test.duration) : null,
      error_message: test.err?.message ?? null,
      error_stack: test.err?.estack ?? test.err?.stack ?? null,
      screenshot: media.screenshot ?? null,
      video: media.video ?? null,
      source_line: null,
      attempts: (test.currentRetry ?? 0) + 1,
    });
  }
  for (const child of suite.suites ?? []) {
    walkSuite(child, spec, runId, nextPath, rows);
  }
}

function parseReport(
  report: unknown,
  runId: string,
  knownSpecs: Map<string, string>,
): TestRow[] {
  const rows: TestRow[] = [];
  const results =
    (report as { results?: { file?: string; fullFile?: string; suites?: MochaSuite[] }[] })
      ?.results ?? [];
  for (const result of results) {
    const detectedSpec = normalizeSpec(result.file || result.fullFile || findCypressSpec(result));
    const resultRows: TestRow[] = [];
    walkSuite({ suites: result.suites ?? [] }, detectedSpec, runId, [], resultRows);
    for (const row of resultRows) {
      row.spec = isUnknownSpec(row.spec)
        ? knownSpecs.get(row.full_title) ?? "spec desconhecida"
        : row.spec;
      rows.push(row);
    }
  }
  // de-duplicate on the upsert key (last one wins = final retry outcome)
  const byKey = new Map<string, TestRow>();
  for (const row of rows) byKey.set(`${row.spec}|${row.full_title}`, row);
  return [...byKey.values()];
}

/* ---------------- handler ---------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("QAHUB_EVENTS_SECRET");
    const provided = req.headers.get("x-qahub-secret");
    if (!secret || provided !== secret) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const correlationId = body?.correlation_id as string | undefined;
    const githubRunId = body?.github_run_id as string | undefined;
    if (!correlationId && !githubRunId)
      return json({ error: "correlation_id ou github_run_id é obrigatório" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let lookup = supabase.from("test_runs").select("id").limit(1);
    lookup = correlationId
      ? lookup.eq("correlation_id", correlationId)
      : lookup.eq("github_run_id", githubRunId!);
    const { data: run, error: lookupError } = await lookup.maybeSingle();
    if (lookupError) return json({ error: lookupError.message }, 500);
    if (!run) return json({ error: "Execução não encontrada" }, 404);
    const runId = run.id as string;

    const type = body?.type ?? "event";

    if (type === "event") {
      const spec = normalizeSpec(body?.spec);
      const title = String(body?.title ?? "").trim();
      if (!spec || !title) return json({ error: "spec e title são obrigatórios" }, 400);

      const describePath: string[] = Array.isArray(body?.describe_path)
        ? body.describe_path.map((s: unknown) => String(s)).filter(Boolean).slice(0, 20)
        : [];
      const allowed: Status[] = ["running", "passed", "failed", "pending", "skipped"];
      const status: Status = allowed.includes(body?.status) ? body.status : "running";

      const row: TestRow = {
        run_id: runId,
        spec,
        describe_path: describePath,
        title,
        full_title: String(body?.full_title || buildFullTitle(describePath, title)),
        status,
        duration_ms:
          typeof body?.duration_ms === "number" ? Math.round(body.duration_ms) : null,
        error_message: body?.error_message ? String(body.error_message).slice(0, 5000) : null,
        error_stack: body?.error_stack ? String(body.error_stack).slice(0, 20000) : null,
        screenshot: body?.screenshot ? String(body.screenshot) : null,
        video: body?.video ? String(body.video) : null,
        source_line: typeof body?.source_line === "number" ? body.source_line : null,
        attempts: typeof body?.attempts === "number" ? body.attempts : 1,
      };

      const { error } = await supabase
        .from("test_results")
        .upsert(row, { onConflict: "run_id,spec,full_title" });
      if (error) return json({ error: error.message }, 500);
      if (!isUnknownSpec(spec)) {
        await supabase
          .from("test_results")
          .delete()
          .eq("run_id", runId)
          .eq("full_title", row.full_title)
          .in("spec", ["spec desconhecida", "spec desconhecido"]);
      }
      return json({ ok: true });
    }

    if (type === "report") {
      const { data: existing } = await supabase
        .from("test_results")
        .select("spec,full_title")
        .eq("run_id", runId);
      const knownSpecs = new Map<string, string>();
      for (const item of existing ?? []) {
        if (!isUnknownSpec(item.spec)) knownSpecs.set(item.full_title, item.spec);
      }
      const rows = parseReport(body?.report ?? body, runId, knownSpecs);
      if (rows.length) {
        for (let i = 0; i < rows.length; i += 200) {
          const { error } = await supabase
            .from("test_results")
            .upsert(rows.slice(i, i + 200), { onConflict: "run_id,spec,full_title" });
          if (error) return json({ error: error.message }, 500);
        }
      }

      const resolvedTitles = [...new Set(
        rows.filter((row) => !isUnknownSpec(row.spec)).map((row) => row.full_title),
      )];
      for (let i = 0; i < resolvedTitles.length; i += 100) {
        await supabase
          .from("test_results")
          .delete()
          .eq("run_id", runId)
          .in("full_title", resolvedTitles.slice(i, i + 100))
          .in("spec", ["spec desconhecida", "spec desconhecido"]);
      }

      // anything still "running" was never reported by the final artifact
      await supabase
        .from("test_results")
        .update({ status: "skipped" })
        .eq("run_id", runId)
        .eq("status", "running");

      const counts = {
        total: rows.length,
        passed: rows.filter((r) => r.status === "passed").length,
        failed: rows.filter((r) => r.status === "failed").length,
        skipped: rows.filter((r) => r.status === "skipped" || r.status === "pending").length,
      };
      const specs = [...new Set(rows.map((r) => r.spec))];
      await supabase
        .from("test_runs")
        .update({
          ...counts,
          spec: specs.length === 1 ? specs[0] : `${specs.length} specs`,
          ...(body?.report_url ? { report_url: String(body.report_url) } : {}),
        })
        .eq("id", runId);

      return json({ ok: true, ...counts, specs: specs.length });
    }

    return json({ error: `Tipo desconhecido: ${type}` }, 400);
  } catch (e) {
    console.error("cypress-events error:", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
