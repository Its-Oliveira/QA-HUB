import { formatDuration, useTestResults, type TestResult } from "@/lib/testResults";
import { activeStatus, duration, type ActionRun } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "./TestTree";

/** Pinned card with the most recent run, independent of history filters. */
export default function LatestRunCard({
  run,
  repository,
  onOpen,
}: {
  run: ActionRun | null | undefined;
  repository?: string;
  onOpen: (id: string) => void;
}) {
  const results = useTestResults(run?.id);
  if (!run) return null;

  const live = activeStatus(run.status);
  const rows = (results.data || []) as TestResult[];
  const failed = rows.filter((r) => r.status === "failed");
  const running = rows.filter((r) => r.status === "running");
  const passed = rows.filter((r) => r.status === "passed").length;

  const meta = [
    run.workflow_name || "Cypress",
    run.branch,
    new Date(run.created_at).toLocaleString("pt-BR"),
    duration(run),
  ];

  return (
    <section className="scrollbar-subtle max-h-[440px] space-y-4 overflow-y-auto rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold">
            Última execução {live && <span className="text-primary">· ao vivo</span>}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meta.map((item, i) => (
              <span
                key={i}
                className="rounded-md bg-secondary/70 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-border/70 bg-transparent transition-colors duration-150 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpen(run.id)}
        >
          Ver detalhes
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/40 p-3 text-xs">
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-success" />
          <b className="font-display text-base tabular-nums text-success">{passed}</b>
          <span className="text-muted-foreground">passaram</span>
        </span>
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-destructive" />
          <b className="font-display text-base tabular-nums text-destructive">{failed.length}</b>
          <span className="text-muted-foreground">falharam</span>
        </span>
        {!!running.length && (
          <span className="flex items-center gap-2 text-primary">
            <i className="h-2 w-2 rounded-full bg-primary" />
            <span className="tabular-nums">{running.length} rodando</span>
          </span>
        )}
        <span className="tabular-nums text-muted-foreground">{rows.length} testes</span>
      </div>

      {live && !!running.length && (
        <div className="space-y-1 border-l-2 border-primary/70 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Executando agora</p>
          {running.slice(0, 5).map((test) => (
            <div key={test.id} className="flex items-center gap-2 text-sm">
              <StatusIcon status="running" />
              <span className="truncate font-mono text-xs text-muted-foreground" title={test.spec}>
                {test.spec}
              </span>
              <span className="break-words">
                {[...test.describe_path, test.title].join(" › ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {!!failed.length && (
        <div className="border-l-2 border-destructive/70 pl-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Testes que falharam <span className="tabular-nums text-destructive">({failed.length})</span>
          </p>
          <div className="divide-y divide-border/50">
            {failed.slice(0, 10).map((test) => (
              <div key={test.id} className="flex items-start gap-2 py-2 text-sm">
                <StatusIcon status="failed" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px] text-muted-foreground" title={test.spec}>
                    {test.spec}
                  </span>{" "}
                  <span className="line-clamp-2 break-words" title={[...test.describe_path, test.title].join(" › ")}>
                    {[...test.describe_path, test.title].join(" › ")}
                  </span>
                </span>
                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {formatDuration(test.duration_ms)}
                </span>
              </div>
            ))}
          </div>
          {failed.length > 10 && (
            <p className="text-xs text-muted-foreground">
              e mais {failed.length - 10} falhas — abra os detalhes.
            </p>
          )}
        </div>
      )}

      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          {live
            ? "Aguardando os primeiros testes…"
            : "Esta execução não enviou detalhamento por teste."}
        </p>
      )}
    </section>
  );
}
