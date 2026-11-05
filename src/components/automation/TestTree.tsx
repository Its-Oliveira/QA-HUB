import { useState } from "react";
import {
  buildFolderTree,
  countFailedSpecs,
  countFolderTests,
  failedOnly,
  countTests,
  folderStatus,
  formatDuration,
  moduleRoot,
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
   "flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-10";

const Chevron = ({ open }: { open: boolean }) => (
  <ChevronRight
    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
  />
);

function TestRow({ test }: { test: TestResult }) {
  const [open, setOpen] = useState(false);
  const failed = test.status === "failed";
  return (
    <li className={failed ? "border-l-2 border-destructive bg-destructive/5" : "border-l-2 border-transparent"}>
      <div className="flex min-h-9 items-start gap-2 rounded-r-md px-2 py-2 text-sm transition-colors duration-150 hover:bg-secondary/40">
        <StatusIcon status={test.status} />
         <span className="min-w-0 flex-1 break-words">
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
       <ul className="ml-2 border-l border-border/50 pl-2 sm:pl-3">
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
         <span className="min-w-0 flex-1 break-words text-sm font-medium">{node.title}</span>
        <span className="shrink-0 rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {countTests(node)}
        </span>
      </button>
      {open && (
         <div className="ml-2 border-l border-border/50 pl-2 sm:ml-4 sm:pl-3">
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
    <div className={`overflow-hidden rounded-lg border bg-background/40 ${status === "failed" ? "border-destructive/30" : "border-border/50"}`}>
      <button className={`${ROW} px-3 py-3`} onClick={() => setOpen((o) => !o)}>
        <Chevron open={open} />
        <StatusIcon status={status} />
        <FileCode2 className="h-4 w-4 shrink-0 text-primary" />
         <span className="min-w-0 flex-1 break-all font-mono text-[13px]">{node.fileName}</span>
        <span className="shrink-0 rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {countTests(node)} testes
        </span>
      </button>
      {open && (
         <div className="border-t border-border/50 bg-background/30 px-1 py-2 sm:px-3">
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
  defaultOpen = false,
}: {
  folder: FolderNode;
  link: LinkInfo;
  depth?: number;
  defaultOpen?: boolean;
}) {
  const status = folderStatus(folder);
  const [open, setOpen] = useState(
    defaultOpen || status === "failed" || status === "running",
  );
  return (
    <div
      className={
        depth === 0
          ? "rounded-xl border border-border/60 bg-secondary/20 p-2"
          : "rounded-lg border border-border/50 bg-background/30 p-2"
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
           className={`min-w-0 flex-1 break-all ${
            depth === 0
              ? "font-display text-sm font-semibold"
              : "text-sm font-semibold"
          }`}
        >
          {folder.name}
        </span>
        <span className="shrink-0 rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {countFolderTests(folder)} testes
        </span>
      </button>
      {open && (
         <div className="ml-2 mt-2 space-y-3 border-l border-border/50 pt-1 pl-2 sm:ml-4 sm:pl-4">
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

const CHIP =
  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const chipTone = (active: boolean) =>
  active
    ? "border-primary/60 bg-primary/15 text-foreground"
    : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground";

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
  const [moduleKey, setModuleKey] = useState("");
  const [onlyFailed, setOnlyFailed] = useState(false);
  if (!results.length)
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  const base = moduleRoot(buildFolderTree(results));
  const link = { repository, commitSha };
  const selected = base.folders.find((folder) => folder.key === moduleKey);
  const scope: FolderNode = selected
    ? { ...base, folders: [selected], specs: [] }
    : base;
  const visible = onlyFailed ? failedOnly(scope) : scope;
  const failedSpecs = countFailedSpecs(scope);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {base.folders.length > 1 && (
          <div role="group" aria-label="Módulos" className="flex flex-wrap gap-2">
            <button
              className={`${CHIP} ${chipTone(!selected)}`}
              aria-pressed={!selected}
              onClick={() => setModuleKey("")}
            >
              Todos
              <span className="tabular-nums text-muted-foreground">{countFolderTests(base)}</span>
            </button>
            {base.folders.map((folder) => (
              <button
                key={folder.key}
                className={`${CHIP} ${chipTone(folder.key === selected?.key)}`}
                aria-pressed={folder.key === selected?.key}
                onClick={() => setModuleKey(folder.key)}
              >
                <StatusIcon status={folderStatus(folder)} />
                {folder.name}
                <span className="tabular-nums text-muted-foreground">{countFolderTests(folder)}</span>
              </button>
            ))}
          </div>
        )}
        <button
          className={`${CHIP} ${onlyFailed ? "border-destructive/60 bg-destructive/15 text-foreground" : chipTone(false)}`}
          aria-pressed={onlyFailed}
          onClick={() => setOnlyFailed((value) => !value)}
        >
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
          Só specs que falharam
          <span className="tabular-nums text-muted-foreground">{failedSpecs}</span>
        </button>
      </div>
      {!visible ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          Nenhuma spec falhou {selected ? "neste módulo" : "nesta execução"}.
        </p>
      ) : (
        <>
          {visible.folders.map((folder) => (
            <Folder
              key={`${folder.key}|${moduleKey}|${onlyFailed}`}
              folder={folder}
              link={link}
              defaultOpen={!!selected || onlyFailed}
            />
          ))}
          {visible.specs.map((spec) => (
            <Spec key={spec.spec} node={spec} link={link} />
          ))}
        </>
      )}
    </div>
  );
}
