import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TestStatus =
  | "running"
  | "passed"
  | "failed"
  | "pending"
  | "skipped";

export interface TestResult {
  id: string;
  run_id: string;
  spec: string;
  describe_path: string[];
  title: string;
  full_title: string;
  status: TestStatus;
  duration_ms: number | null;
  error_message: string | null;
  error_stack: string | null;
  screenshot: string | null;
  video: string | null;
  source_line: number | null;
  attempts: number;
}

export interface TreeNode {
  key: string;
  title: string;
  children: TreeNode[];
  tests: TestResult[];
}

export interface SpecNode extends TreeNode {
  spec: string;
}

const emptyNode = (key: string, title: string): TreeNode => ({
  key,
  title,
  children: [],
  tests: [],
});

/** Groups flat results into spec > describe (nested) > it. */
export function buildTree(results: TestResult[]): SpecNode[] {
  const specs = new Map<string, SpecNode>();
  for (const result of results) {
    let spec = specs.get(result.spec);
    if (!spec) {
      spec = { ...emptyNode(result.spec, result.spec), spec: result.spec };
      specs.set(result.spec, spec);
    }
    let node: TreeNode = spec;
    for (const title of result.describe_path) {
      const key = `${node.key}|${title}`;
      let child = node.children.find((c) => c.key === key);
      if (!child) {
        child = emptyNode(key, title);
        node.children.push(child);
      }
      node = child;
    }
    node.tests.push(result);
  }
  return [...specs.values()].sort((a, b) => a.spec.localeCompare(b.spec));
}

const RANK: Record<TestStatus, number> = {
  failed: 0,
  running: 1,
  pending: 2,
  skipped: 3,
  passed: 4,
};

/** Worst status inside a node — failures first, then anything still running. */
export function nodeStatus(node: TreeNode): TestStatus {
  const all = [
    ...node.tests.map((t) => t.status),
    ...node.children.map((c) => nodeStatus(c)),
  ];
  if (!all.length) return "skipped";
  return all.sort((a, b) => RANK[a] - RANK[b])[0];
}

export function countTests(node: TreeNode): number {
  return (
    node.tests.length +
    node.children.reduce((sum, child) => sum + countTests(child), 0)
  );
}

/** Link to the test file at the exact commit used in that run. */
export function specUrl(
  repository: string | undefined,
  commitSha: string | null | undefined,
  spec: string,
  line?: number | null,
) {
  if (!repository || !commitSha || !spec) return undefined;
  const path = spec.replace(/^\/+/, "");
  return `https://github.com/${repository}/blob/${commitSha}/${path}${
    line ? `#L${line}` : ""
  }`;
}

export function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Results of one run, kept fresh by the shared realtime channel. */
export function useTestResults(runId: string | null | undefined) {
  return useQuery({
    queryKey: ["test_results", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_results")
        .select("*")
        .eq("run_id", runId!)
        .order("spec")
        .order("created_at");
      if (error) throw error;
      return (data || []) as unknown as TestResult[];
    },
  });
}

/** Subscribes to granular test rows on the existing realtime channel name. */
export function useTestResultsRealtime() {
  const client = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("actions-test-results")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_results" },
        () => {
          client.invalidateQueries({ queryKey: ["test_results"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [client]);
}
