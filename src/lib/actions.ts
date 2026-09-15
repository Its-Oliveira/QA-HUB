import { supabase } from "@/integrations/supabase/client";
export interface WorkflowInput {
  description?: string;
  type?: string;
  required?: boolean;
  default?: string | boolean | number;
  options?: string[];
}
export interface ActionRun {
  id: string;
  github_run_id: string | null;
  status: string;
  workflow_id: string | null;
  workflow_name: string | null;
  branch: string;
  commit_sha: string | null;
  triggered_by: string;
  created_at: string;
  started_at: string | null;
  duration_ms: number | null;
  report_url: string | null;
  jobs: {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    steps?: {
      number: number;
      name: string;
      status: string;
      conclusion: string | null;
    }[];
  }[];
  failures: {
    name: string;
    message: string;
    stack?: string;
    screenshot?: string;
    video?: string;
  }[];
}
export const activeStatus = (status: string) =>
  [
    "queued",
    "in_progress",
    "em_execucao",
    "waiting",
    "pending",
    "requested",
  ].includes(status);
export const safeUrl = (url?: string | null) => {
  try {
    const parsed = new URL(url || "");
    return parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
};
export function duration(
  run: Pick<ActionRun, "status" | "started_at" | "created_at" | "duration_ms">,
) {
  const ms = activeStatus(run.status)
    ? Date.now() - Date.parse(run.started_at || run.created_at)
    : run.duration_ms;
  if (ms == null) return "—";
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
export async function actions<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("github-actions", {
    body,
  });
  if (error) {
    let message = error.message;
    if ("context" in error && error.context instanceof Response) {
      try {
        message = (await error.context.json()).error || message;
      } catch {
        /* network error */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
