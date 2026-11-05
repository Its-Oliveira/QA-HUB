import { Fragment, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
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

/** Tests are rendered in chunks so a suite with hundreds of `it`s stays fast. */
const CHUNK = 40;

const DOT: Record<TestStatus, string> = {
  passed: "bg-success",
  failed: "bg-destructive",
  running: "bg-primary",
  pending: "bg-warning",
  skipped: "bg-muted-foreground/50",
};

/** Every `it` under a spec or describe, in reporting order. */
function flatTests(node: TreeNode): TestResult[] {
  return [...node.tests, ...node.children.flatMap(flatTests)];
}

/** Sum of the tests' durations, shown as "38s" or "4m 12s". */
function totalDuration(tests: TestResult[]) {
  const ms = tests.reduce((sum, test) => sum + (test.duration_ms || 0), 0);
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** Specs of a module with the subfolder path in front ("Editar/"). */
function moduleSpecs(folder: FolderNode, prefix = ""): { spec: SpecNode; dir: string }[] {
  return [
    ...folder.specs.map((spec) => ({ spec, dir: prefix })),
    ...folder.folders.flatMap((child) => moduleSpecs(child, `${prefix}${child.name}/`)),
  ];
}

const ATTENTION: Partial<Record<TestStatus, number>> = { failed: 0, running: 1 };

function TestRow({ test }: { test: TestResult }) {
  const [open, setOpen] = useState(false);
  const failed = test.status === "failed";
  const firstLine = (test.error_message || "").split("\n")[0];
  return (
    <li className="border-t border-border/40 py-2">
      <div className="flex items-start gap-2.5 text-sm">
        <span className="mt-0.5">
          <StatusIcon status={test.status} />
        </span>
        <span className={`min-w-0 flex-1 break-words ${test.status === "passed" ? "text-foreground/80" : "text-foreground"}`}>
          {test.title}
          {test.attempts > 1 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {test.attempts} tentativas
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {formatDuration(test.duration_ms)}
        </span>
      </div>
      {failed && (test.error_message || test.error_stack) && (
        <div className="mt-1.5 pl-[26px]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {!open && firstLine && (
              <code className="min-w-0 flex-1 basis-72 truncate font-mono text-xs text-destructive">
                {firstLine}
              </code>
            )}
            <button
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Ocultar erro" : "Erro completo"}
            </button>
            {safeUrl(test.screenshot) && (
              <a
                className="text-xs text-primary underline-offset-2 hover:underline"
                href={safeUrl(test.screenshot)}
                target="_blank"
                rel="noreferrer"
              >
                Screenshot
              </a>
            )}
            {safeUrl(test.video) && (
              <a
                className="text-xs text-primary underline-offset-2 hover:underline"
                href={safeUrl(test.video)}
                target="_blank"
                rel="noreferrer"
              >
                Vídeo
              </a>
            )}
          </div>
          {open && (
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-md bg-destructive/5 p-3 font-mono text-xs text-foreground/90">
              {test.error_message}
              {test.error_stack ? `\n${test.error_stack}` : ""}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}

/** Tests grouped under their describe path, flat instead of nested boxes. */
function SpecTests({ spec, onlyFailed }: { spec: SpecNode; onlyFailed: boolean }) {
  const [limit, setLimit] = useState(CHUNK);
  const tests = flatTests(spec).filter((test) => !onlyFailed || test.status !== "passed");
  const shown = tests.slice(0, limit);
  return (
    <div className="pb-3 pl-10 pr-4 sm:pl-14">
      <ul>
        {shown.map((test, i) => {
          const describe = test.describe_path.join(" › ");
          const previous = shown[i - 1]?.describe_path.join(" › ");
          return (
            <Fragment key={test.id}>
              {describe && describe !== previous && (
                <li className="pb-1 pt-2 text-xs text-muted-foreground">{describe}</li>
              )}
              <TestRow test={test} />
            </Fragment>
          );
        })}
      </ul>
      {tests.length > limit && (
        <Button variant="ghost" size="sm" className="mt-1" onClick={() => setLimit((l) => l + CHUNK)}>
          Mostrar mais ({tests.length - limit})
        </Button>
      )}
    </div>
  );
}

function SpecRow({ spec, dir, onlyFailed }: { spec: SpecNode; dir: string; onlyFailed: boolean }) {
  const status = nodeStatus(spec);
  const tests = flatTests(spec);
  const [open, setOpen] = useState(status === "failed" || status === "running");
  const failed = tests.filter((test) => test.status === "failed").length;
  const passed = tests.filter((test) => test.status === "passed").length;
  return (
    <div className="border-t border-border/50 first:border-t-0">
      <button
        className="flex min-h-12 w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
        />
        <StatusIcon status={status} />
        <span className="min-w-0 flex-1 basis-48 truncate font-mono text-[13px]">
          <span className="text-muted-foreground">{dir}</span>
          {spec.fileName}
        </span>
        <span aria-hidden="true" className="hidden max-w-[200px] flex-wrap justify-end gap-[3px] sm:flex">
          {tests.map((test) => (
            <span key={test.id} className={`h-2 w-2 rounded-[2px] ${DOT[test.status]}`} />
          ))}
        </span>
        <span className={`w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums ${failed ? "text-destructive" : "text-success"}`}>
          {passed}/{tests.length}
        </span>
        <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {totalDuration(tests)}
        </span>
      </button>
      {open && <SpecTests spec={spec} onlyFailed={onlyFailed} />}
    </div>
  );
}

function ModuleGroup({
  title,
  folder,
  onlyFailed,
}: {
  title?: string;
  folder: FolderNode;
  onlyFailed: boolean;
}) {
  const specs = moduleSpecs(folder).sort(
    (a, b) => (ATTENTION[nodeStatus(a.spec)] ?? 2) - (ATTENTION[nodeStatus(b.spec)] ?? 2),
  );
  const tests = specs.flatMap(({ spec }) => flatTests(spec));
  const failed = tests.filter((test) => test.status === "failed").length;
  return (
    <section className="space-y-2">
      {title && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h3 className="font-display text-[15px] font-semibold">{title}</h3>
          <span className={`text-xs tabular-nums ${failed ? "text-destructive" : "text-muted-foreground"}`}>
            {tests.length} testes · {specs.length} specs
            {!!failed && ` · ${failed} ${failed > 1 ? "falhas" : "falha"}`}
          </span>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {specs.map(({ spec, dir }) => (
          <SpecRow key={spec.spec} spec={spec} dir={dir} onlyFailed={onlyFailed} />
        ))}
      </div>
    </section>
  );
}

const TAB =
  "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
const tabTone = (active: boolean) =>
  active
    ? "border-primary text-foreground"
    : "border-transparent text-muted-foreground hover:text-foreground";

export default function TestTree({
  results,
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
  const selected = base.folders.find((folder) => folder.key === moduleKey);
  const scope: FolderNode = selected
    ? { ...base, folders: [selected], specs: [] }
    : base;
  const visible = onlyFailed ? failedOnly(scope) : scope;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60">
        {base.folders.length > 1 ? (
          <nav aria-label="Módulos" className="flex flex-wrap gap-1">
            <button
              className={`${TAB} ${tabTone(!selected)}`}
              aria-pressed={!selected}
              onClick={() => setModuleKey("")}
            >
              Todos
              <span className="font-medium tabular-nums text-muted-foreground">{countFolderTests(base)}</span>
            </button>
            {base.folders.map((folder) => (
              <button
                key={folder.key}
                className={`${TAB} ${tabTone(folder.key === selected?.key)}`}
                aria-pressed={folder.key === selected?.key}
                onClick={() => setModuleKey(folder.key)}
              >
                {folderStatus(folder) === "failed" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label="Com falhas" />
                )}
                {folder.name}
                <span className="font-medium tabular-nums text-muted-foreground">{countFolderTests(folder)}</span>
              </button>
            ))}
          </nav>
        ) : (
          <span />
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-foreground/80">
          <Switch checked={onlyFailed} onCheckedChange={setOnlyFailed} />
          Só specs que falharam
          <span className="tabular-nums text-muted-foreground">{countFailedSpecs(scope)}</span>
        </label>
      </div>
      {!visible ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma spec falhou {selected ? "neste módulo" : "nesta execução"}.
        </p>
      ) : (
        <div className="space-y-7">
          {visible.folders.map((folder) => (
            <ModuleGroup
              key={`${folder.key}|${onlyFailed}`}
              title={folder.name}
              folder={folder}
              onlyFailed={onlyFailed}
            />
          ))}
          {!!visible.specs.length && (
            <ModuleGroup
              key={`raiz|${onlyFailed}`}
              title={visible.folders.length ? "Outros" : undefined}
              folder={{ ...visible, folders: [] }}
              onlyFailed={onlyFailed}
            />
          )}
        </div>
      )}
    </div>
  );
}
