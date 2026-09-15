import { useState } from "react";
import {
  buildTree,
  countTests,
  formatDuration,
  nodeStatus,
  specUrl,
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
  ExternalLink,
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

function TestRow({
  test,
  link,
}: {
  test: TestResult;
  link: LinkInfo;
}) {
  const [open, setOpen] = useState(false);
  const url = specUrl(link.repository, link.commitSha, test.spec, test.source_line);
  const failed = test.status === "failed";
  return (
    <li className="py-1">
      <div className="flex items-start gap-2 text-sm">
        <StatusIcon status={test.status} />
        <span className="flex-1 break-words">
          {test.title}
          {test.attempts > 1 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {test.attempts} tentativas
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDuration(test.duration_ms)}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary"
            aria-label="Ver teste no GitHub"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {failed && (test.error_message || test.error_stack) && (
        <div className="ml-6 mt-1">
          <button
            className="text-xs text-primary underline"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Ocultar erro" : "Ver erro"}
          </button>
          {open && (
            <pre className="mt-1 max-h-60 overflow-auto rounded bg-secondary p-2 text-xs whitespace-pre-wrap break-all">
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

function TestList({ tests, link }: { tests: TestResult[]; link: LinkInfo }) {
  const [limit, setLimit] = useState(CHUNK);
  return (
    <>
      <ul className="ml-2 border-l pl-3">
        {tests.slice(0, limit).map((test) => (
          <TestRow key={test.id} test={test} link={link} />
        ))}
      </ul>
      {tests.length > limit && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-2"
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
    <li className="py-1">
      <button
        className="flex w-full items-center gap-2 text-left text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <StatusIcon status={status} />
        <span className="flex-1 break-words">{node.title}</span>
        <span className="text-xs text-muted-foreground">{countTests(node)}</span>
      </button>
      {open && (
        <div className="ml-4">
          <ul className="border-l pl-3">
            {node.children.map((child) => (
              <Branch
                key={child.key}
                node={child}
                link={link}
                defaultOpen={false}
              />
            ))}
          </ul>
          {!!node.tests.length && <TestList tests={node.tests} link={link} />}
        </div>
      )}
    </li>
  );
}

function Spec({
  node,
  link,
}: {
  node: SpecNode;
  link: LinkInfo;
}) {
  const status = nodeStatus(node);
  const [open, setOpen] = useState(status === "failed" || status === "running");
  const url = specUrl(link.repository, link.commitSha, node.spec);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <button
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <StatusIcon status={status} />
          <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 break-all font-mono text-sm">{node.fileName}</span>
          <span className="text-xs text-muted-foreground">
            {countTests(node)} testes
          </span>
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary"
            aria-label="Ver arquivo no GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      {open && (
        <div className="mt-2">
          <ul>
            {node.children.map((child) => (
              <Branch key={child.key} node={child} link={link} defaultOpen={false} />
            ))}
          </ul>
          {!!node.tests.length && <TestList tests={node.tests} link={link} />}
        </div>
      )}
    </div>
  );
}

function Folder({ folder, link }: { folder: FolderNode; link: LinkInfo }) {
  const status = folderStatus(folder);
  const [open, setOpen] = useState(status === "failed" || status === "running");
  return (
    <div className="rounded-lg border border-dashed bg-card/40 p-2">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <StatusIcon status={status} />
        {open ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-warning" />
        ) : (
          <FolderIcon className="h-4 w-4 shrink-0 text-warning" />
        )}
        <span className="flex-1 break-all text-sm font-medium">{folder.name}</span>
        <span className="text-xs text-muted-foreground">
          {countFolderTests(folder)} testes
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-4">
          {folder.folders.map((child) => (
            <Folder key={child.key} folder={child} link={link} />
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
    <div className="space-y-2">
      {root.folders.map((folder) => (
        <Folder key={folder.key} folder={folder} link={link} />
      ))}
      {root.specs.map((spec) => (
        <Spec key={spec.spec} node={spec} link={link} />
      ))}
    </div>
  );
}
