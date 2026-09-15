import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  actions,
  activeStatus,
  duration,
  safeUrl,
  type ActionRun,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import TestTree from "@/components/automation/TestTree";
import { useTestResults, useTestResultsRealtime } from "@/lib/testResults";

const labels: Record<string, string> = {
  queued: "Na fila",
  in_progress: "Em execução",
  em_execucao: "Em execução",
  success: "Sucesso",
  passed: "Sucesso",
  failure: "Falha",
  failed: "Falha",
  cancelled: "Cancelado",
  error_ao_disparar: "Erro ao disparar",
  skipped: "Ignorado",
  timed_out: "Tempo esgotado",
};

const Badge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex rounded px-2 py-1 text-xs ${
      ["failure", "failed", "error_ao_disparar", "timed_out"].includes(status)
        ? "bg-destructive/20 text-destructive"
        : "bg-secondary text-foreground"
    }`}
  >
    {labels[status] || status}
  </span>
);

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export default function ExecucaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useQueryClient();

  const catalog = useQuery({
    queryKey: ["actions-catalog"],
    queryFn: () => actions<{ repository: string }>({ action: "catalog" }),
    staleTime: 60000,
  });

  const detail = useQuery({
    queryKey: ["test_runs", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_runs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as ActionRun;
    },
  });

  const run = detail.data;

  const artifacts = useQuery({
    queryKey: ["actions-artifacts", run?.github_run_id, run?.status],
    enabled: !!run?.github_run_id,
    queryFn: () =>
      actions<
        { id: number; name: string; expired: boolean; size_in_bytes: number }[]
      >({ action: "artifacts", run: run!.github_run_id }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`run-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_runs" },
        () => {
          client.invalidateQueries({ queryKey: ["test_runs"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [client, id]);

  useTestResultsRealtime();
  const detailResults = useTestResults(id ?? null);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <nav className="text-sm text-muted-foreground">
          <Link to="/automacao-testes" className="hover:text-foreground">
            Automação de Testes
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Detalhes da execução</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/automacao-testes")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-semibold">Detalhes da execução</h1>
        </div>
      </div>

      {detail.isLoading && <p>Carregando…</p>}
      {detail.error && (
        <p role="alert" className="text-destructive">
          {(detail.error as Error).message}
        </p>
      )}

      {run && (
        <>
          <section className="rounded-lg border bg-card p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <Info label="Status" value={<Badge status={run.status} />} />
              <Info
                label="Workflow"
                value={run.workflow_name || "Cypress"}
              />
              <Info
                label="Branch"
                value={<span className="font-mono">{run.branch}</span>}
              />
              <Info label="Disparado por" value={run.triggered_by} />
              <Info label="Duração" value={duration(run)} />
            </div>
            <div className="mt-5 border-t pt-4">
              <Info
                label="Commit"
                value={
                  <span className="font-mono text-xs break-all">
                    {run.commit_sha || "—"}
                  </span>
                }
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Resultados dos testes</h2>
              <span className="text-xs text-muted-foreground">
                pasta › spec › describe › it
              </span>
            </div>
            {detailResults.isLoading && (
              <p className="text-sm text-muted-foreground">
                Carregando testes…
              </p>
            )}
            <TestTree
              results={detailResults.data || []}
              repository={catalog.data?.repository}
              commitSha={run.commit_sha}
              emptyMessage={
                activeStatus(run.status)
                  ? "Aguardando os primeiros testes…"
                  : "Esta execução não enviou detalhamento por teste. Consulte o relatório ou baixe os artefatos."
              }
            />
          </section>

          {!detailResults.data?.length && !!run.failures?.length && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Testes que falharam</h2>
              {run.failures.map((f, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <p className="font-medium">{f.name}</p>
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {f.message}
                    {f.stack && `\n${f.stack}`}
                  </pre>
                  {safeUrl(f.screenshot) && (
                    <a
                      className="text-primary underline"
                      href={safeUrl(f.screenshot)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Screenshot
                    </a>
                  )}
                  {safeUrl(f.video) && (
                    <a
                      className="ml-3 text-primary underline"
                      href={safeUrl(f.video)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Vídeo
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Artefatos</h2>
            {artifacts.isLoading && <p>Carregando artefatos…</p>}
            {artifacts.error && (
              <p role="alert" className="text-destructive">
                {(artifacts.error as Error).message}
              </p>
            )}
            {!artifacts.isLoading && !artifacts.data?.length && (
              <p className="text-sm text-muted-foreground">
                Nenhum artefato disponível.
              </p>
            )}
            {artifacts.data?.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <span className="text-sm">
                  {a.name} · {(a.size_in_bytes / 1024).toFixed(0)} KB
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={a.expired}
                  onClick={async () => {
                    try {
                      const result = await actions<{ url: string }>({
                        action: "download",
                        artifact: a.id,
                        run: run.github_run_id,
                      });
                      const url = safeUrl(result.url);
                      if (!url) throw new Error("Download indisponível.");
                      window.location.assign(url);
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                >
                  {a.expired ? "Expirado" : "Baixar ZIP"}
                </Button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
