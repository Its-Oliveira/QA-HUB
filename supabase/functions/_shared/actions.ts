import { createClient } from "npm:@supabase/supabase-js@2";
import { parse } from "npm:yaml@2.8.1";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const db = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
export const githubToken = () =>
  Deno.env.get("GITHUB_TOKEN") || Deno.env.get("GITHUB_PAT");
export function repository() {
  const owner = Deno.env.get("GITHUB_OWNER"),
    repo = Deno.env.get("GITHUB_REPO");
  if (!owner || !repo || !githubToken())
    throw new ApiError(503, "Integração GitHub não configurada no backend.");
  return `${owner}/${repo}`;
}
export async function github(path: string, init: RequestInit = {}) {
  const response = await fetch(
    `https://api.github.com/repos/${repository()}/${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${githubToken()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
  );
  if (
    !response.ok &&
    !(init.redirect === "manual" && response.status === 302)
  ) {
    const limited =
      response.status === 429 ||
      response.headers.get("x-ratelimit-remaining") === "0" ||
      response.headers.has("retry-after");
    throw new ApiError(
      limited ? 429 : response.status,
      limited
        ? "Limite da API GitHub atingido. Aguarde antes de tentar novamente."
        : response.status === 401
          ? "Token GitHub expirado ou inválido."
          : response.status === 403
            ? "Token GitHub sem permissão para esta operação."
            : response.status === 404
              ? "Repositório, workflow ou branch não encontrado, ou sem acesso."
              : response.status === 422
                ? "Branch ou inputs inválidos para este workflow."
                : "GitHub indisponível. Tente novamente.",
    );
  }
  return response;
}
export async function pages(path: string, field?: string) {
  const items = [];
  for (let page = 1; ; page++) {
    const response = await github(
      `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
    );
    const data = await response.json();
    const batch = field ? data[field] : data;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}
export async function cached(
  key: string,
  load: () => Promise<unknown>,
  seconds = 60,
) {
  const store = db();
  const { data } = await store
    .from("actions_cache")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (data && Date.parse(data.expires_at) > Date.now()) return data.value;
  const value = await load();
  const { error } = await store.from("actions_cache").upsert({
    key,
    value,
    expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
  });
  if (error) throw new ApiError(500, "Falha ao armazenar cache da integração.");
  return value;
}
export async function definition(id: string, branch: string) {
  const workflow = await (
    await github(`actions/workflows/${encodeURIComponent(id)}`)
  ).json();
  const content = await (
    await github(`contents/${workflow.path}?ref=${encodeURIComponent(branch)}`)
  ).json();
  const bytes = Uint8Array.from(atob(content.content.replace(/\s/g, "")), (c) =>
    c.charCodeAt(0),
  );
  const yaml = parse(new TextDecoder().decode(bytes));
  const on = yaml.on;
  const enabled =
    typeof on === "string"
      ? on === "workflow_dispatch"
      : Array.isArray(on)
        ? on.includes("workflow_dispatch")
        : on && Object.hasOwn(on, "workflow_dispatch");
  if (!enabled)
    throw new ApiError(
      422,
      "Este workflow não aceita workflow_dispatch nesta branch.",
    );
  return { ...workflow, inputs: on?.workflow_dispatch?.inputs || {} };
}
export async function syncRun(run: {
  id: number;
  workflow_id: number;
  status: string;
  conclusion: string | null;
  updated_at: string;
  run_started_at: string;
  head_branch: string;
  head_sha: string;
  name: string;
  display_title?: string;
  actor?: { login: string };
  created_at: string;
}) {
  const store = db();
  const { data: existing } = await store
    .from("test_runs")
    .select("*")
    .eq("github_run_id", String(run.id))
    .maybeSingle();
  const status =
    run.status === "completed"
      ? run.conclusion || "failure"
      : run.status === "in_progress"
        ? "in_progress"
        : "queued";
  const jobs = (await pages(`actions/runs/${run.id}/jobs`, "jobs")).map(
    (job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      steps: (job.steps || []).map(
        (step: {
          number: number;
          name: string;
          status: string;
          conclusion: string | null;
        }) => ({
          number: step.number,
          name: step.name,
          status: step.status,
          conclusion: step.conclusion,
        }),
      ),
    }),
  );
  const finished = run.status === "completed" ? run.updated_at : null;
  const row = {
    github_run_id: String(run.id),
    workflow_id: String(run.workflow_id),
    workflow_name: run.name,
    branch: run.head_branch || "(sem branch)",
    commit_sha: run.head_sha,
    status,
    jobs,
    started_at: run.run_started_at,
    finished_at: finished,
    duration_ms: finished
      ? Math.max(0, Date.parse(finished) - Date.parse(run.run_started_at))
      : null,
  };
  // GitHub run IDs are linked directly by the dispatch endpoint.
  const target = existing;
  const result = target
    ? await (() => {
        let update = store.from("test_runs").update(row).eq("id", target.id);
        if (status === "queued" || status === "in_progress")
          update = update.in("status", [
            "queued",
            "in_progress",
            "em_execucao",
          ]);
        return update;
      })()
    : await store.from("test_runs").upsert(
        {
          ...row,
          correlation_id: `github-${run.id}`,
          environment: "—",
          triggered_by: run.actor?.login || "GitHub",
          created_at: run.created_at,
        },
        { onConflict: "correlation_id" },
      );
  if (result.error) throw new ApiError(500, "Falha ao sincronizar execução.");
}
