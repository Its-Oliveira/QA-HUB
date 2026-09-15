import { validateInputs, type InputSpec } from "../_shared/dispatch-inputs.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  ApiError,
  db,
  github,
  pages,
  cached,
  definition,
  repository,
  syncRun,
} from "../_shared/actions.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  try {
    if (req.method !== "POST") throw new ApiError(405, "Use POST.");
    const store = db();
    const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
    const {
      data: { user },
      error,
    } = await store.auth.getUser(token || "");
    if (error || !user)
      throw new ApiError(401, "Entre novamente para acessar a automação.");
    const body = await req.json();
    if (body.action === "catalog")
      return json(
        await cached("catalog", async () => ({
          branches: (await pages("branches")).map((b) => b.name),
          workflows: (await pages("actions/workflows", "workflows"))
            .filter((w) => w.state === "active")
            .map((w) => ({ id: String(w.id), name: w.name })),
          environments: (await pages("environments", "environments")).map(
            (e) => e.name,
          ),
          repository: repository(),
        })),
      );
    if (body.action === "definition")
      return json(
        await cached(`definition:${body.workflow}:${body.branch}`, () =>
          definition(String(body.workflow), String(body.branch)),
        ),
      );
    if (body.action === "bootstrap") {
      await cached(
        "bootstrap",
        async () => {
          const runs = await (await github("actions/runs?per_page=50")).json();
          for (const run of runs.workflow_runs) await syncRun(run);
          return { ok: true };
        },
        300,
      );
      return json({ ok: true });
    }
    if (body.action === "artifacts")
      return json(
        await cached(
          `artifacts:${body.run}`,
          () =>
            pages(
              `actions/runs/${encodeURIComponent(body.run)}/artifacts`,
              "artifacts",
            ),
          30,
        ),
      );
    if (body.action === "download") {
      if (
        !/^\d+$/.test(String(body.artifact)) ||
        !/^\d+$/.test(String(body.run))
      )
        throw new ApiError(400, "Artefato inválido.");
      const artifacts = await pages(
        `actions/runs/${body.run}/artifacts`,
        "artifacts",
      );
      const artifact = artifacts.find(
        (a) => String(a.id) === String(body.artifact),
      );
      if (!artifact || artifact.expired)
        throw new ApiError(410, "Artefato expirado ou indisponível.");
      // GitHub's signed redirect is fetched server-side; credentials never reach the browser.
      const response = await github(`actions/artifacts/${body.artifact}/zip`, {
        redirect: "manual",
      });
      return json({ url: response.headers.get("location") });
    }
    if (body.action !== "dispatch")
      throw new ApiError(400, "Operação inválida.");
    const workflow = await definition(
      String(body.workflow),
      String(body.branch),
    );
    await github(`branches/${encodeURIComponent(body.branch)}`);
    let inputs: Record<string, string | boolean | number>;
    try {
      const environments = (Object.values(workflow.inputs) as InputSpec[]).some(
        (spec) => spec.type === "environment",
      )
        ? (await pages("environments", "environments")).map((e) => e.name)
        : [];
      inputs = validateInputs(workflow.inputs, body.inputs, environments);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, (error as Error).message);
    }
    const active = await (
      await github(
        `actions/workflows/${workflow.id}/runs?branch=${encodeURIComponent(body.branch)}&per_page=100`,
      )
    ).json();
    if (
      active.workflow_runs.some(
        (r: { status: string }) => r.status !== "completed",
      )
    )
      throw new ApiError(
        409,
        "Já existe uma execução ativa para este workflow e branch.",
      );
    const correlation_id = crypto.randomUUID();
    const { data: local, error: insert } = await store
      .from("test_runs")
      .insert({
        correlation_id,
        workflow_id: String(workflow.id),
        workflow_name: workflow.name,
        branch: body.branch,
        environment: inputs.environment || "—",
        triggered_by: user.email || user.id,
        actor_id: user.id,
        status: "queued",
      })
      .select()
      .single();
    if (insert)
      throw new ApiError(
        insert.code === "23505" ? 409 : 500,
        insert.code === "23505"
          ? "Já existe uma execução ativa para este workflow e branch."
          : "Falha ao registrar execução.",
      );
    try {
      const audit = await store.from("actions_audit").insert({
        actor_id: user.id,
        actor: user.email || user.id,
        workflow_id: String(workflow.id),
        branch: body.branch,
        correlation_id,
      });
      if (audit.error) throw new ApiError(500, "Falha ao registrar auditoria.");
      const response = await github(
        `actions/workflows/${workflow.id}/dispatches`,
        { method: "POST", body: JSON.stringify({ ref: body.branch, inputs }) },
      );
      const dispatch = await response.json();
      const { error: link } = await store.rpc("bind_workflow_run", {
        local_id: local.id,
        run_id: String(dispatch.workflow_run_id),
      });
      if (link)
        throw new ApiError(
          500,
          "Workflow disparado, mas falhou a associação do histórico.",
        );
      await syncRun(
        await (await github(`actions/runs/${dispatch.workflow_run_id}`)).json(),
      );
      return json({ ok: true, correlation_id });
    } catch (error) {
      await store
        .from("test_runs")
        .update({
          status: "error_ao_disparar",
          finished_at: new Date().toISOString(),
        })
        .eq("id", local.id)
        .is("github_run_id", null);
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError))
      console.error("github-actions failure:", error);
    return json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "Falha na integração. Tente novamente.",
      },
      error instanceof ApiError ? error.status : 500,
    );
  }
});
