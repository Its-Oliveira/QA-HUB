import { useState } from "react";
import {
  buildFolderTree,
  countFolderTests,
  countTests,
  folderStatus,
  formatDuration,
  nodeStatus,
  type FolderNode,
  type SpecNode,
  type TestResult,
  type TestStatus,
  type TreeNode,
} from "@/lib/testResults";
import { safeUrl } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FileCode2,
  Folder as FolderIcon,
  FolderOpen,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";

const STATUS_LABEL: Record<TestStatus, string> = {
  running: "Rodando",
  passed: "Passou",
  failed: "Falhou",
  pending: "Pendente",
  skipped: "Ignorado",
};

export const StatusIcon = ({ status }: { status: TestStatus }) => {
  const props = { className: "h-4 w-4 shrink-0", "aria-label": STATUS_LABEL[status] };
  if (status === "passed")
    return <CheckCircle2 {...props} className={`${props.className} text-success`} />;
  if (status === "failed")
    return <XCircle {...props} className={`${props.className} text-destructive`} />;
  if (status === "running")
    return (
      <Loader2 {...props} className={`${props.className} animate-spin text-primary`} />
    );
  if (status === "pending")
    return <CircleDashed {...props} className={`${props.className} text-warning`} />;
  return <MinusCircle {...props} className={`${props.className} text-muted-foreground`} />;
};

interface LinkInfo {
  repository?: string;
  commitSha?: string | null;
}

/** Tests are rendered in chunks so a suite with hundreds of `it`s stays fast. */
const CHUNK = 40;

/** Consistent, comfortable hit area for every expand/collapse control. */
const ROW =
  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary";

const Chevron = ({ open }: { open: boolean }) =>
  open ? (
    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
  ) : (
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
  );

function TestRow({ test }: { test: TestResult }) {
  const [open, setOpen] = useState(false);
  const failed = test.status === "failed";
  return (
    <li className="border-b border-border/50 last:border-0">
      <div className="flex min-h-9 items-start gap-2 px-2 py-2 text-sm hover:bg-secondary/40">
        <StatusIcon status={test.status} />
        <span className="flex-1 break-words">
          {test.title}
          {test.attempts > 1 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {test.attempts} tentativas
            </span>
          )}
        </span>
        <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {formatDuration(test.duration_ms)}
        </span>
      </div>
      {failed && (test.error_message || test.error_stack) && (
        <div className="ml-6 pb-2">
          <button
            className="text-xs text-primary underline"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Ocultar erro" : "Ver erro"}
          </button>
          {open && (
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-secondary p-2 text-xs">
              {test.error_message}
              {test.error_stack ? `\n${test.error_stack}` : ""}
            </pre>
          )}
          <div className="mt-1 flex gap-3">
            {safeUrl(test.screenshot) && (
              <a
                className="text-xs text-primary underline"
                href={safeUrl(test.screenshot)}
                target="_blank"
                rel="noreferrer"
              >
                Screenshot
              </a>
            )}
            {safeUrl(test.video) && (
              <a
                className="text-xs text-primary underline"
                href={safeUrl(test.video)}
                target="_blank"
                rel="noreferrer"
              >
                Vídeo
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function TestList({ tests }: { tests: TestResult[] }) {
  const [limit, setLimit] = useState(CHUNK);
  return (
    <>
      <ul className="ml-2 border-l border-border pl-4">
        {tests.slice(0, limit).map((test) => (
          <TestRow key={test.id} test={test} />
        ))}
      </ul>
      {tests.length > limit && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-3 mt-1"
          onClick={() => setLimit((l) => l + CHUNK)}
        >
          Mostrar mais ({tests.length - limit})
        </Button>
      )}
    </>
  );
}

function Branch({
  node,
  link,
  defaultOpen,
}: {
  node: TreeNode;
  link: LinkInfo;
  defaultOpen: boolean;
}) {
  const status = nodeStatus(node);
  const [open, setOpen] = useState(defaultOpen || status === "failed");
  return (
    <li>
      <button className={ROW} onClick={() => setOpen((o) => !o)}>
        <Chevron open={open} />
        <StatusIcon status={status} />
        <span className="flex-1 break-words text-sm font-medium">{node.title}</span>
        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {countTests(node)}
        </span>
      </button>
      {open && (
        <div className="ml-4 border-l border-border pl-4">
          <ul>
            {node.children.map((child) => (
              <Branch key={child.key} node={child} link={link} defaultOpen={false} />
            ))}
          </ul>
          {!!node.tests.length && <TestList tests={node.tests} />}
        </div>
      )}
    </li>
  );
}

function Spec({ node, link }: { node: SpecNode; link: LinkInfo }) {
  const status = nodeStatus(node);
  const [open, setOpen] = useState(status === "failed" || status === "running");
  return (
    <div className="overflow-hidden rounded-md border bg-background/40">
      <button className={`${ROW} px-3 py-3`} onClick={() => setOpen((o) => !o)}>
        <Chevron open={open} />
        <StatusIcon status={status} />
        <FileCode2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 break-all font-mono text-sm">{node.fileName}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {countTests(node)} testes
        </span>
      </button>
      {open && (
        <div className="border-t bg-background/30 px-3 py-2">
          <ul>
            {node.children.map((child) => (
              <Branch key={child.key} node={child} link={link} defaultOpen={false} />
            ))}
          </ul>
          {!!node.tests.length && <TestList tests={node.tests} />}
        </div>
      )}
    </div>
  );
}

function Folder({
  folder,
  link,
  depth = 0,
}: {
  folder: FolderNode;
  link: LinkInfo;
  depth?: number;
}) {
  const status = folderStatus(folder);
  const [open, setOpen] = useState(status === "failed" || status === "running");
  return (
    <div
      className={
        depth === 0
          ? "rounded-lg border bg-secondary/30 p-2"
          : "rounded-md border bg-background/40 p-2"
      }
    >
      <button className={`${ROW} px-3`} onClick={() => setOpen((o) => !o)}>
        <Chevron open={open} />
        <StatusIcon status={status} />
        {open ? (
          <FolderOpen className="h-5 w-5 shrink-0 text-primary" />
        ) : (
          <FolderIcon className="h-5 w-5 shrink-0 text-primary" />
        )}
        <span
          className={`flex-1 break-all ${
            depth === 0
              ? "font-display text-sm font-semibold"
              : "text-sm font-semibold"
          }`}
        >
          {folder.name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {countFolderTests(folder)} testes
        </span>
      </button>
      {open && (
        <div className="ml-4 mt-2 space-y-3 border-l border-t border-border pt-3 pl-4">
          {folder.folders.map((child) => (
            <Folder key={child.key} folder={child} link={link} depth={depth + 1} />
          ))}
          {folder.specs.map((spec) => (
            <Spec key={spec.spec} node={spec} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TestTree({
  results,
  repository,
  commitSha,
  emptyMessage = "Nenhum detalhe de teste recebido para esta execução.",
}: {
  results: TestResult[];
  repository?: string;
  commitSha?: string | null;
  emptyMessage?: string;
}) {
  if (!results.length)
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  const root = buildFolderTree(results);
  const link = { repository, commitSha };
  return (
    <div className="space-y-3">
      {root.folders.map((folder) => (
        <Folder key={folder.key} folder={folder} link={link} />
      ))}
      {root.specs.map((spec) => (
        <Spec key={spec.spec} node={spec} link={link} />
      ))}
    </div>
  );
}
