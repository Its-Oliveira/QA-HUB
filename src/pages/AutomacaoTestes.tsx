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
import { Loader2, Play } from "lucide-react";
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
  "min-h-10 w-full rounded-lg border border-border/70 bg-secondary/60 px-3 py-2 text-base text-foreground transition-colors duration-150 hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 lg:text-sm";
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
  const canDispatch =
    !busy &&
    !duplicate &&
    !!definition.data &&
    !definition.isFetching &&
    !definition.isError &&
    !Object.entries(definition.data?.inputs || {}).some(
      ([key, spec]) => spec.required && (inputs[key] === "" || inputs[key] == null),
    );
  const total = latestResults.length;
  const share = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div className="space-y-8 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Testes automatizados</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
            <span className={`inline-flex items-center gap-1.5 ${connected ? "text-primary" : "text-warning"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary" : "bg-warning"}`} />
              {connected ? "ao vivo" : "conectando"}
            </span>
            {latest.data && (
              <>
                <span aria-hidden="true">·</span>
                <span>{new Date(latest.data.created_at).toLocaleString("pt-BR")}</span>
                <span aria-hidden="true">·</span>
                <span>
                  branch <span className="font-mono text-foreground/80">{latest.data.branch}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{latest.data.workflow_name || "Cypress"}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{duration(latest.data)}</span>
                <span aria-hidden="true">·</span>
                <button
                  className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openRun(latest.data!.id)}
                >
                  Ver detalhes
                </button>
              </>
            )}
          </div>
        </div>

        <section id="nova-execucao" aria-label="Nova execução" className="flex flex-wrap items-end gap-2">
          {catalog.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando opções…</p>
          ) : catalog.data && !catalog.data.workflows.length ? (
            <p className="text-sm text-muted-foreground">Nenhum workflow ativo encontrado.</p>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Branch
                <select className={`${selectClass} min-w-32`} value={branch} onChange={(e) => setBranch(e.target.value)}>
                  {catalog.data?.branches.map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Workflow
                <select className={`${selectClass} min-w-32`} value={workflow} onChange={(e) => setWorkflow(e.target.value)}>
                  {catalog.data?.workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
              {Object.entries(definition.data?.inputs || {}).map(([key, spec]) => (
                <label key={key} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>{spec.description || key}{spec.required ? " *" : ""}</span>
                  {spec.type === "boolean" ? (
                    <input className="h-10 w-5" type="checkbox" checked={inputs[key] === true} onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.checked }))} />
                  ) : ["choice", "environment"].includes(spec.type || "") ? (
                    <select className={`${selectClass} min-w-32`} value={String(inputs[key] ?? "")} onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.value }))}>
                      <option value="">Selecione</option>
                      {(spec.type === "environment" ? catalog.data?.environments || [] : spec.options || []).map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input className="h-10 w-40" type={spec.type === "number" ? "number" : "text"} value={String(inputs[key] ?? "")} onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.value }))} />
                  )}
                </label>
              ))}
            </>
          )}
          <Button
            className="h-10 font-semibold"
            variant={duplicate ? "secondary" : "default"}
            title={duplicate ? "Já existe uma execução ativa para esta combinação." : undefined}
            disabled={!canDispatch}
            onClick={dispatch}
          >
            {busy || duplicate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {duplicate ? "Em execução" : "Rodar testes"}
          </Button>
          {definition.isLoading && <p className="basis-full text-right text-xs text-muted-foreground">Carregando parâmetros…</p>}
          {definition.error && <p role="alert" className="basis-full text-right text-xs text-destructive">{definition.error.message}</p>}
        </section>
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

      <section aria-label="Resumo da última execução" className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <span className="font-display text-xl font-semibold tabular-nums text-success">
            {passedTests} <span className="font-sans text-sm font-normal text-muted-foreground">passaram</span>
          </span>
          <span className="font-display text-xl font-semibold tabular-nums text-destructive">
            {failedTests} <span className="font-sans text-sm font-normal text-muted-foreground">falharam</span>
          </span>
          {!!runningTests && (
            <span className="font-display text-xl font-semibold tabular-nums text-primary">
              {runningTests} <span className="font-sans text-sm font-normal text-muted-foreground">rodando</span>
            </span>
          )}
          <span className="ml-auto text-[13px] tabular-nums text-muted-foreground">
            {total} testes · {totalSpecs} specs · {successRate}% de sucesso
          </span>
        </div>
        <div
          role="img"
          aria-label={`${passedTests} passaram, ${failedTests} falharam, ${runningTests} rodando`}
          className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-secondary"
        >
          <div className="bg-success" style={{ width: share(passedTests) }} />
          <div className="bg-destructive" style={{ width: share(failedTests) }} />
          <div className="bg-primary" style={{ width: share(runningTests) }} />
        </div>
      </section>

      <TestTree
        results={latestResults}
        repository={catalog.data?.repository}
        commitSha={latest.data?.commit_sha}
        emptyMessage={latestResultsQuery.isLoading ? "Carregando resultados…" : "A última execução ainda não enviou resultados por teste."}
      />

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
         <div className="scrollbar-subtle max-w-full overflow-x-auto rounded-xl border border-border/60 bg-card">
           <table className="min-w-[790px] w-full text-sm lg:min-w-0">
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
                   <th key={h} className={`p-3 text-left text-muted-foreground ${h === "Data/hora" ? "sticky left-0 z-10 bg-card lg:static lg:bg-transparent" : ""}`}>
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
                   <td className="sticky left-0 z-10 bg-card p-3 whitespace-nowrap lg:static lg:bg-transparent">
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
         <div className="flex flex-wrap items-center justify-between gap-2">
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
