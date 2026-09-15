import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  actions,
  duration,
  type ActionRun,
  type WorkflowInput,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCode2,
  Loader2,
  Play,
  Radio,
  XCircle,
} from "lucide-react";
import LatestRunCard from "@/components/automation/LatestRunCard";
import TestTree from "@/components/automation/TestTree";
import {
  useTestResults,
  useTestResultsRealtime,
  type TestResult,
} from "@/lib/testResults";
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
    className={`rounded px-2 py-1 text-xs ${["failure", "failed", "error_ao_disparar", "timed_out"].includes(status) ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"}`}
  >
    {labels[status] || status}
  </span>
);
const selectClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm";
type Catalog = {
  branches: string[];
  workflows: { id: string; name: string }[];
  environments: string[];
  repository: string;
};
const PAGE_SIZE = 20;
export default function AutomacaoTestes() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [branch, setBranch] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [inputs, setInputs] = useState<
    Record<string, string | boolean | number>
  >({});
  const [busy, setBusy] = useState(false);
  
  const [filters, setFilters] = useState({
    branch: "",
    workflow: "",
    status: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(0);
  const [connected, setConnected] = useState(false);
  const [, tick] = useState(0);
  const catalog = useQuery({
    queryKey: ["actions-catalog"],
    queryFn: () => actions<Catalog>({ action: "catalog" }),
    staleTime: 60000,
  });
  useEffect(() => {
    if (catalog.data) {
      setBranch((b) => b || catalog.data.branches[0] || "");
      setWorkflow((w) => w || catalog.data.workflows[0]?.id || "");
    }
  }, [catalog.data]);
  const definition = useQuery({
    queryKey: ["actions-definition", workflow, branch],
    enabled: !!workflow && !!branch,
    queryFn: () =>
      actions<{ inputs: Record<string, WorkflowInput> }>({
        action: "definition",
        workflow,
        branch,
      }),
    staleTime: 60000,
  });
  useEffect(() => {
    setInputs(
      Object.fromEntries(
        Object.entries(definition.data?.inputs || {}).map(([key, spec]) => [
          key,
          spec.default ?? (spec.type === "boolean" ? false : ""),
        ]),
      ),
    );
  }, [definition.data]);
  const bootstrap = useQuery({
    queryKey: ["actions-bootstrap"],
    queryFn: async () => {
      await actions({ action: "bootstrap" });
      await client.invalidateQueries({ queryKey: ["test_runs"] });
      return true;
    },
    staleTime: 300000,
    retry: false,
  });
  const history = useQuery({
    queryKey: ["test_runs", filters, page],
    queryFn: async () => {
      let query = supabase
        .from("test_runs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (filters.branch) query = query.eq("branch", filters.branch);
      if (filters.workflow)
        query = query.eq(
          "workflow_id" as never,
          filters.workflow,
        );
      if (filters.status)
        query = query.in(
          "status",
          filters.status === "success"
            ? ["success", "passed"]
            : filters.status === "failure"
              ? ["failure", "failed"]
              : filters.status === "in_progress"
                ? ["in_progress", "em_execucao"]
                : [filters.status],
        );
      if (filters.from)
        query = query.gte(
          "created_at",
          new Date(`${filters.from}T00:00:00`).toISOString(),
        );
      if (filters.to)
        query = query.lte(
          "created_at",
          new Date(`${filters.to}T23:59:59.999`).toISOString(),
        );
      const { data, error, count } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE - 1,
      );
      if (error) throw error;
      return { runs: data as unknown as ActionRun[], count: count || 0 };
    },
  });
  const active = useQuery({
    queryKey: ["test_runs", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_runs")
        .select("*")
        .in("status", ["queued", "in_progress", "em_execucao"]);
      if (error) throw error;
      return data as unknown as ActionRun[];
    },
  });
  const latest = useQuery({
    queryKey: ["test_runs", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ActionRun) || null;
    },
  });
  useEffect(() => {
    const channel = supabase
      .channel("actions-control")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_runs" },
        () => {
          client.invalidateQueries({ queryKey: ["test_runs"] });
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED")
          client.invalidateQueries({ queryKey: ["test_runs"] });
      });
    const timer = setInterval(() => tick((t) => t + 1), 1000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [client]);
  useTestResultsRealtime();
  const duplicate = active.data?.some(
    (r) => r.workflow_id === workflow && r.branch === branch,
  );
  async function dispatch() {
    setBusy(true);
    try {
      await actions({ action: "dispatch", workflow, branch, inputs });
      toast.success("Workflow disparado!");
      await client.invalidateQueries({ queryKey: ["test_runs"] });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function filter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  }
  const openRun = (id: string) =>
    navigate(`/automacao-testes/execucao/${id}`);
  const latestResultsQuery = useTestResults(latest.data?.id);
  const latestResults = (latestResultsQuery.data || []) as TestResult[];
  const totalSpecs = new Set(latestResults.map((result) => result.spec)).size;
  const passedTests = latestResults.filter((result) => result.status === "passed").length;
  const failedTests = latestResults.filter((result) => result.status === "failed").length;
  const runningTests = latestResults.filter((result) => result.status === "running").length;
  const completedTests = passedTests + failedTests;
  const successRate = completedTests ? Math.round((passedTests / completedTests) * 100) : 0;
  const recentRuns = (history.data?.runs || []).slice(0, 7).reverse();
  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Radio className={`h-3.5 w-3.5 ${connected ? "text-success" : "text-warning"}`} />
            {connected ? "Monitoramento ao vivo" : "Conectando ao monitoramento"}
          </div>
          <h1 className="font-display text-3xl font-bold">Painel de Testes Automatizados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Execuções Cypress, resultados por teste e histórico em um único painel.
          </p>
        </div>
        <Button onClick={() => document.getElementById("nova-execucao")?.scrollIntoView({ behavior: "smooth" })}>
          <Play className="h-4 w-4" />
          Nova execução
        </Button>
      </header>

      {[catalog.error, bootstrap.error, history.error, active.error]
        .filter(Boolean)
        .map((error, i) => (
          <p key={i} role="alert" className="text-sm text-destructive">
            {(error as Error).message}{" "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => client.invalidateQueries()}
            >
              Tentar novamente
            </Button>
          </p>
        ))}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Specs", value: totalSpecs, icon: FileCode2, tone: "text-primary" },
          { label: "Testes", value: latestResults.length, icon: Activity, tone: "text-foreground" },
          { label: "Passaram", value: passedTests, icon: CheckCircle2, tone: "text-success" },
          { label: "Falharam", value: failedTests, icon: XCircle, tone: "text-destructive" },
          { label: "Taxa de sucesso", value: `${successRate}%`, icon: BarChart3, tone: "text-success" },
          { label: "Duração", value: latest.data ? duration(latest.data) : "—", icon: Clock3, tone: "text-primary" },
        ].map((metric) => (
          <article key={metric.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
              <metric.icon className={`h-4 w-4 ${metric.tone}`} />
            </div>
            <p className={`mt-2 font-display text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="font-display font-semibold">Árvore da última execução</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pastas, specs, describes e testes individuais
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-success">{passedTests} passaram</span>
              <span className="text-destructive">{failedTests} falharam</span>
              {!!runningTests && <span className="text-primary">{runningTests} rodando</span>}
            </div>
          </div>
          <div className="max-h-[720px] overflow-y-auto p-4">
            <TestTree
              results={latestResults}
              repository={catalog.data?.repository}
              commitSha={latest.data?.commit_sha}
              emptyMessage={latestResultsQuery.isLoading ? "Carregando resultados…" : "A última execução ainda não enviou resultados por teste."}
            />
          </div>
        </section>

        <aside className="space-y-5">
          <section id="nova-execucao" className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Nova execução</h2>
              <Play className="h-4 w-4 text-primary" />
            </div>
            {catalog.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando opções…</p>
            ) : catalog.data && !catalog.data.workflows.length ? (
              <p className="text-sm text-muted-foreground">Nenhum workflow ativo encontrado.</p>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  Branch
                  <select className={`${selectClass} mt-1`} value={branch} onChange={(e) => setBranch(e.target.value)}>
                    {catalog.data?.branches.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </label>
                <label className="block text-xs text-muted-foreground">
                  Workflow
                  <select className={`${selectClass} mt-1`} value={workflow} onChange={(e) => setWorkflow(e.target.value)}>
                    {catalog.data?.workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </label>
                {definition.isLoading && <p className="text-xs text-muted-foreground">Carregando parâmetros…</p>}
                {definition.error && <p role="alert" className="text-xs text-destructive">{definition.error.message}</p>}
                {Object.entries(definition.data?.inputs || {}).map(([key, spec]) => (
                  <label key={key} className="block space-y-1 text-xs text-muted-foreground">
                    <span>{spec.description || key}{spec.required ? " *" : ""}</span>
                    {spec.type === "boolean" ? (
                      <input type="checkbox" checked={inputs[key] === true} onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.checked }))} />
                    ) : ["choice", "environment"].includes(spec.type || "") ? (
                      <select className={selectClass} value={String(inputs[key] ?? "")} onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.value }))}>
                        <option value="">Selecione</option>
                        {(spec.type === "environment" ? catalog.data?.environments || [] : spec.options || []).map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <Input type={spec.type === "number" ? "number" : "text"} value={String(inputs[key] ?? "")} onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.value }))} />
                    )}
                  </label>
                ))}
              </div>
            )}
            {duplicate && <p className="mt-3 text-xs text-warning">Já existe uma execução ativa para esta combinação.</p>}
            <Button className="mt-4 w-full" disabled={busy || duplicate || !definition.data || definition.isFetching || definition.isError || Object.entries(definition.data?.inputs || {}).some(([key, spec]) => spec.required && (inputs[key] === "" || inputs[key] == null))} onClick={dispatch}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Rodar testes
            </Button>
          </section>

          <LatestRunCard run={latest.data} repository={catalog.data?.repository} onOpen={openRun} />

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-display text-sm font-semibold">Execuções em andamento</h2>
            {!active.data?.length && <p className="text-xs text-muted-foreground">Nenhuma execução ativa.</p>}
            <div className="space-y-2">
              {active.data?.map((r) => (
                <Button key={r.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal border border-border px-3 py-3 text-left" onClick={() => openRun(r.id)}>
                  <span className="flex-1">
                    <span className="block text-sm">{r.workflow_name} · {r.branch}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{r.triggered_by} · {duration(r)}</span>
                  </span>
                  <Badge status={r.status} />
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Execuções recentes</h2>
              <span className="text-xs text-muted-foreground">{recentRuns.length} registros</span>
            </div>
            <div className="flex h-24 items-end gap-2" aria-label="Resumo visual das execuções recentes">
              {recentRuns.map((run) => {
                const failed = ["failure", "failed", "error_ao_disparar", "timed_out"].includes(run.status);
                const activeRun = ["queued", "in_progress", "em_execucao"].includes(run.status);
                return (
                  <div key={run.id} className="flex h-full flex-1 items-end" title={`${run.workflow_name || "Cypress"}: ${labels[run.status] || run.status}`}>
                    <div className={`w-full rounded-sm ${failed ? "h-1/2 bg-destructive" : activeRun ? "h-3/4 bg-primary" : "h-full bg-success"}`} />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-success" /> Passaram</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-destructive" /> Falharam</span>
            </div>
          </section>
        </aside>
      </div>

      <section className="space-y-3 border-t border-border pt-5">
        <div>
          <h2 className="font-display font-semibold">Histórico de execuções</h2>
          <p className="mt-1 text-xs text-muted-foreground">Filtre e abra qualquer execução anterior.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs">
            Branch
            <select
              className={selectClass}
              value={filters.branch}
              onChange={(e) => filter("branch", e.target.value)}
            >
              <option value="">Todas</option>
              {catalog.data?.branches.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Workflow
            <select
              className={selectClass}
              value={filters.workflow}
              onChange={(e) => filter("workflow", e.target.value)}
            >
              <option value="">Todos</option>
              {catalog.data?.workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Status
            <select
              className={selectClass}
              value={filters.status}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">Todos</option>
              {[
                "queued",
                "in_progress",
                "success",
                "failure",
                "cancelled",
                "error_ao_disparar",
              ].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            De
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => filter("from", e.target.value)}
            />
          </label>
          <label className="text-xs">
            Até
            <Input
              type="date"
              min={filters.from}
              value={filters.to}
              onChange={(e) => filter("to", e.target.value)}
            />
          </label>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  "Data/hora",
                  "Workflow",
                  "Branch / commit",
                  "Disparado por",
                  "Status",
                  "Duração",
                  "Detalhes",
                ].map((h) => (
                  <th key={h} className="p-3 text-left text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.isLoading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center">
                    Carregando histórico…
                  </td>
                </tr>
              )}
              {!history.isLoading && !history.data?.runs.length && (
                <tr>
                  <td colSpan={7} className="p-6 text-center">
                    Nenhuma execução encontrada.
                  </td>
                </tr>
              )}
              {history.data?.runs.map((r) => (
                <tr key={r.id} className="border-t transition-colors hover:bg-secondary/40">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-3">{r.workflow_name || "Cypress"}</td>
                  <td className="p-3 font-mono">
                    {r.branch}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {r.commit_sha?.slice(0, 7)}
                    </span>
                  </td>
                  <td className="p-3">{r.triggered_by}</td>
                  <td className="p-3">
                    <Badge status={r.status} />
                  </td>
                  <td className="p-3 whitespace-nowrap">{duration(r)}</td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRun(r.id)}
                    >
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={!page}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm">
            Página {page + 1} · {history.data?.count || 0} execuções
          </span>
          <Button
            variant="outline"
            disabled={(page + 1) * PAGE_SIZE >= (history.data?.count || 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </section>
    </div>
  );
}
