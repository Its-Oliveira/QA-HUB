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

  return (
    <section className="max-h-[440px] space-y-3 overflow-y-auto rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold">
            Última execução {live && <span className="text-primary">· ao vivo</span>}
          </h2>
          <p className="text-sm text-muted-foreground">
            {run.workflow_name || "Cypress"} · {run.branch} ·{" "}
            {new Date(run.created_at).toLocaleString("pt-BR")} · {duration(run)}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => onOpen(run.id)}>
          Ver detalhes
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-y py-3 text-xs">
        <span className="text-success">{passed} passaram</span>
        <span className="text-destructive">{failed.length} falharam</span>
        {!!running.length && (
          <span className="text-primary">{running.length} rodando</span>
        )}
        <span className="text-muted-foreground">{rows.length} testes</span>
      </div>

      {live && !!running.length && (
        <div className="space-y-1 border-l-2 border-primary pl-3">
          <p className="text-xs uppercase text-muted-foreground">Executando agora</p>
          {running.slice(0, 5).map((test) => (
            <div key={test.id} className="flex items-center gap-2 text-sm">
              <StatusIcon status="running" />
              <span className="font-mono text-xs text-muted-foreground">
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
        <div className="space-y-1 border-l-2 border-destructive pl-3">
          <p className="text-xs uppercase text-muted-foreground">Testes que falharam</p>
          {failed.slice(0, 10).map((test) => (
            <div key={test.id} className="flex items-start gap-2 text-sm">
              <StatusIcon status="failed" />
              <span className="flex-1 break-words">
                <span className="font-mono text-xs text-muted-foreground">
                  {test.spec}
                </span>{" "}
                {[...test.describe_path, test.title].join(" › ")}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDuration(test.duration_ms)}
              </span>
            </div>
          ))}
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
