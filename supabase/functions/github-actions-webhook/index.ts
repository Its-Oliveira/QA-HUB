import { validSignature } from "../_shared/dispatch-inputs.ts";
import { ApiError, github, repository, syncRun } from "../_shared/actions.ts";
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST")
      return new Response("Method not allowed", { status: 405 });
    const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
    if (!secret) return new Response("Webhook not configured", { status: 503 });
    const raw = await req.text();
    if (
      !(await validSignature(
        raw,
        secret,
        req.headers.get("x-hub-signature-256") || "",
      ))
    )
      return new Response("Unauthorized", { status: 401 });
    const payload = JSON.parse(raw);
    if (
      payload.repository?.full_name?.toLowerCase() !==
      repository().toLowerCase()
    )
      return new Response("Wrong repository", { status: 403 });
    const event = req.headers.get("x-github-event");
    const id =
      event === "workflow_run"
        ? payload.workflow_run?.id
        : event === "workflow_job"
          ? payload.workflow_job?.run_id
          : null;
    // Fetch current state instead of trusting delivery order or replayed payloads.
    if (id) await syncRun(await (await github(`actions/runs/${id}`)).json());
    return new Response("ok");
  } catch (error) {
    return new Response(
      error instanceof ApiError ? error.message : "Webhook processing failed",
      { status: 500 },
    );
  }
});
