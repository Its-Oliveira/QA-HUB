import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Loader2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type TestRun = Tables<"test_runs">;

const statusConfig: Record<string, { label: string; className: string; pulse?: boolean }> = {
  queued: { label: "Na fila", className: "bg-muted text-muted-foreground" },
  em_execucao: { label: "Em execução", className: "bg-primary/20 text-primary", pulse: true },
  passed: { label: "Sucesso", className: "bg-success/20 text-success" },
  failed: { label: "Falha", className: "bg-destructive/20 text-destructive" },
  error_ao_disparar: { label: "Erro ao disparar", className: "bg-destructive/20 text-destructive" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${cfg.className}`}>
      {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {cfg.label}
    </span>
  );
};

const fmtDuration = (ms?: number | null, start?: string | null, isRunning?: boolean, tick?: number) => {
  let total = ms ?? 0;
  if (isRunning && start) total = Date.now() - new Date(start).getTime();
  if (!total || total < 0) return "—";
  const s = Math.floor(total / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const AutomacaoTestes = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [environment, setEnvironment] = useState<"homolog" | "producao">("homolog");
  const [spec, setSpec] = useState("");
  const [branch, setBranch] = useState("main");
  const [triggering, setTriggering] = useState(false);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [tick, setTick] = useState(0);

  const { data: runs = [] } = useQuery({
    queryKey: ["test_runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_runs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []) as TestRun[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("test_runs_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "test_runs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["test_runs"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const currentRun = runs[0];
  const isRunning = currentRun && (currentRun.status === "queued" || currentRun.status === "em_execucao");

  // Ticker for elapsed time while running
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const triggeredBy = useMemo(() => {
    const email = user?.email || "";
    return email.split("@")[0] || "desconhecido";
  }, [user]);

  const handleTrigger = async () => {
    if (isRunning) {
      toast.error("Já existe um teste em execução");
      return;
    }
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-cypress-run", {
        body: { branch, environment, spec: spec.trim() || null, triggered_by: triggeredBy },
      });
      if (error) throw error;
      toast.success("Testes disparados!");
      setSpec("");
      queryClient.invalidateQueries({ queryKey: ["test_runs"] });
    } catch (e: any) {
      toast.error(`Erro ao disparar: ${e.message || e}`);
    } finally {
      setTriggering(false);
    }
  };

  const buttonDisabled = triggering || !!isRunning;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Automação de Testes</h1>

      {/* Trigger form */}
      <div className="bg-card border border-border rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Disparar nova execução</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Ambiente</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "homolog" | "producao")}
              className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="homolog">Homolog</option>
              <option value="producao">Produção</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Branch</label>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Spec (opcional)</label>
            <input
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="cypress/e2e/login.cy.ts"
              className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleTrigger}
            disabled={buttonDisabled}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {buttonDisabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Em execução..." : "Rodar testes"}
          </button>
        </div>
      </div>

      {/* Current status card */}
      <div className="bg-card border border-border rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Status atual</h2>
        {!currentRun ? (
          <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda.</p>
        ) : (
          <div className="flex items-center flex-wrap gap-6">
            <StatusBadge status={currentRun.status} />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Disparado por</p>
              <p className="text-sm text-foreground">{currentRun.triggered_by}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Branch</p>
              <p className="text-sm text-foreground font-mono">{currentRun.branch}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ambiente</p>
              <p className="text-sm text-foreground">{currentRun.environment}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {isRunning ? "Tempo decorrido" : "Duração"}
              </p>
              <p className="text-sm text-foreground font-mono">
                {fmtDuration(
                  currentRun.duration_ms,
                  currentRun.started_at || currentRun.created_at,
                  !!isRunning,
                  tick
                )}
              </p>
            </div>
            {currentRun.report_url && (
              <a
                href={currentRun.report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                Ver relatório <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <h2 className="text-sm font-semibold text-foreground mb-3">Histórico</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Data/Hora</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Por</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Branch</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Ambiente</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Duração</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">T / P / F / S</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nenhuma execução ainda.
                </td>
              </tr>
            )}
            {runs.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedRun(r)}
                className="border-b border-border last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{r.triggered_by}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{r.branch}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.environment}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{fmtDuration(r.duration_ms)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                  {r.total ?? "—"} / <span className="text-success">{r.passed ?? "—"}</span> /{" "}
                  <span className="text-destructive">{r.failed ?? "—"}</span> / {r.skipped ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {r.report_url && (
                    <a
                      href={r.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details panel */}
      {selectedRun && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedRun(null)}>
          <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Detalhes da execução</h3>
              <button onClick={() => setSelectedRun(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[10px] text-muted-foreground uppercase">Status</p><StatusBadge status={selectedRun.status} /></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Correlation ID</p><p className="text-xs font-mono text-foreground break-all">{selectedRun.correlation_id}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Disparado por</p><p className="text-foreground">{selectedRun.triggered_by}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">GitHub Run ID</p><p className="text-foreground font-mono text-xs">{selectedRun.github_run_id || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Branch</p><p className="text-foreground font-mono">{selectedRun.branch}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Ambiente</p><p className="text-foreground">{selectedRun.environment}</p></div>
              <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase">Spec</p><p className="text-foreground font-mono text-xs">{selectedRun.spec || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Criado</p><p className="text-foreground">{fmtDate(selectedRun.created_at)}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Iniciado</p><p className="text-foreground">{fmtDate(selectedRun.started_at)}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Finalizado</p><p className="text-foreground">{fmtDate(selectedRun.finished_at)}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Duração</p><p className="text-foreground font-mono">{fmtDuration(selectedRun.duration_ms)}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Total</p><p className="text-foreground font-mono">{selectedRun.total ?? "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Passou</p><p className="text-success font-mono">{selectedRun.passed ?? "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Falhou</p><p className="text-destructive font-mono">{selectedRun.failed ?? "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Pulou</p><p className="text-foreground font-mono">{selectedRun.skipped ?? "—"}</p></div>
            </div>
            {selectedRun.report_url && (
              <a href={selectedRun.report_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                Abrir relatório completo <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomacaoTestes;
