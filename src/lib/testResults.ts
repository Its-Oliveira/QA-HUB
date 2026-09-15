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
  /** Full spec path as reported (used for source links). */
  spec: string;
  /** File name only, used as the label in the tree. */
  fileName: string;
}

/** Directory grouping the specs; nests to any depth. */
export interface FolderNode {
  key: string;
  /** Real directory name (single-child chains are joined with "/"). */
  name: string;
  folders: FolderNode[];
  specs: SpecNode[];
}

const emptyNode = (key: string, title: string): TreeNode => ({
  key,
  title,
  children: [],
  tests: [],
});

/** Normalizes any reported path: windows separators, "./", leading slashes. */
export function normalizeSpecPath(spec: string): string {
  return String(spec || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter((part) => part && part !== ".")
    .join("/");
}

/** Splits a spec path into its directory segments and the file name. */
export function splitSpecPath(spec: string): { dirs: string[]; fileName: string } {
  const parts = normalizeSpecPath(spec).split("/").filter(Boolean);
  const fileName = parts.pop() || spec || "spec";
  return { dirs: parts, fileName };
}

/** Groups flat results into spec > describe (nested) > it. */
export function buildTree(results: TestResult[]): SpecNode[] {
  const specs = new Map<string, SpecNode>();
  for (const result of results) {
    const path = normalizeSpecPath(result.spec) || result.spec;
    let spec = specs.get(path);
    if (!spec) {
      spec = {
        ...emptyNode(path, path),
        spec: path,
        fileName: splitSpecPath(path).fileName,
      };
      specs.set(path, spec);
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

/** Collapses folders that only contain a single subfolder ("a" + "b" -> "a/b"). */
function collapse(folder: FolderNode): FolderNode {
  folder.folders = folder.folders.map(collapse);
  while (folder.name && folder.folders.length === 1 && !folder.specs.length) {
    const only = folder.folders[0];
    folder.name = `${folder.name}/${only.name}`;
    folder.key = only.key;
    folder.folders = only.folders;
    folder.specs = only.specs;
  }
  folder.folders.sort((a, b) => a.name.localeCompare(b.name));
  folder.specs.sort((a, b) => a.spec.localeCompare(b.spec));
  return folder;
}

/** Groups specs by their real directories, at any nesting depth. */
export function buildFolderTree(results: TestResult[]): FolderNode {
  const root: FolderNode = { key: "", name: "", folders: [], specs: [] };
  for (const spec of buildTree(results)) {
    const { dirs } = splitSpecPath(spec.spec);
    let node = root;
    for (const dir of dirs) {
      const key = node.key ? `${node.key}/${dir}` : dir;
      let child = node.folders.find((f) => f.key === key);
      if (!child) {
        child = { key, name: dir, folders: [], specs: [] };
        node.folders.push(child);
      }
      node = child;
    }
    node.specs.push(spec);
  }
  return collapse(root);
}

/** Worst status inside a folder (specs + subfolders). */
export function folderStatus(folder: FolderNode): TestStatus {
  const all = [
    ...folder.specs.map(nodeStatus),
    ...folder.folders.map(folderStatus),
  ];
  if (!all.length) return "skipped";
  return all.sort((a, b) => RANK[a] - RANK[b])[0];
}

export function countFolderTests(folder: FolderNode): number {
  return (
    folder.specs.reduce((sum, spec) => sum + countTests(spec), 0) +
    folder.folders.reduce((sum, child) => sum + countFolderTests(child), 0)
  );
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
