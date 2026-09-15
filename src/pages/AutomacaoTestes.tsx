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
import { Play, Loader2 } from "lucide-react";
import LatestRunCard from "@/components/automation/LatestRunCard";
import { useTestResultsRealtime } from "@/lib/testResults";
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
  const [branch, setBranch] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [inputs, setInputs] = useState<
    Record<string, string | boolean | number>
  >({});
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
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
  const run = detail.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Automação de Testes</h1>
        <p className="text-sm text-muted-foreground">
          {connected
            ? "Atualizações em tempo real conectadas"
            : "Conectando às atualizações em tempo real…"}
        </p>
      </div>
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
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Disparar nova execução</h2>
        {catalog.isLoading ? (
          <p>Carregando branches e workflows…</p>
        ) : catalog.data && !catalog.data.workflows.length ? (
          <p>Nenhum workflow ativo encontrado.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Branch
              <select
                className={selectClass}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                {catalog.data?.branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Workflow
              <select
                className={selectClass}
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value)}
              >
                {catalog.data?.workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            {definition.isLoading && <p>Carregando inputs…</p>}
            {definition.error && (
              <p role="alert" className="text-destructive">
                {definition.error.message}
              </p>
            )}
            {Object.entries(definition.data?.inputs || {}).map(
              ([key, spec]) => (
                <label key={key} className="text-sm space-y-1">
                  <span>
                    {spec.description || key}
                    {spec.required ? " *" : ""}
                  </span>
                  {spec.type === "boolean" ? (
                    <input
                      className="ml-2"
                      type="checkbox"
                      checked={inputs[key] === true}
                      onChange={(e) =>
                        setInputs((v) => ({ ...v, [key]: e.target.checked }))
                      }
                    />
                  ) : ["choice", "environment"].includes(spec.type || "") ? (
                    <select
                      className={selectClass}
                      value={String(inputs[key] ?? "")}
                      onChange={(e) =>
                        setInputs((v) => ({ ...v, [key]: e.target.value }))
                      }
                    >
                      <option value="">Selecione</option>
                      {(spec.type === "environment"
                        ? catalog.data?.environments || []
                        : spec.options || []
                      ).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={spec.type === "number" ? "number" : "text"}
                      value={String(inputs[key] ?? "")}
                      onChange={(e) =>
                        setInputs((v) => ({ ...v, [key]: e.target.value }))
                      }
                    />
                  )}
                </label>
              ),
            )}
          </div>
        )}
        {duplicate && (
          <p className="text-sm text-muted-foreground">
            Já existe uma execução ativa para este workflow e branch.
          </p>
        )}
        <Button
          disabled={
            busy ||
            duplicate ||
            !definition.data ||
            definition.isFetching ||
            definition.isError ||
            Object.entries(definition.data?.inputs || {}).some(
              ([key, spec]) =>
                spec.required && (inputs[key] === "" || inputs[key] == null),
            )
          }
          onClick={dispatch}
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Rodar
        </Button>
      </section>
      <LatestRunCard
        run={latest.data}
        repository={catalog.data?.repository}
        onOpen={setSelected}
      />
      <section className="space-y-3">
        <h2 className="font-semibold">Execuções em andamento</h2>
        {!active.data?.length && (
          <p className="text-sm text-muted-foreground">
            Nenhuma execução ativa.
          </p>
        )}
        {active.data?.map((r) => (
          <button
            key={r.id}
            className="w-full rounded-lg border bg-card p-4 text-left flex flex-wrap gap-4"
            onClick={() => setSelected(r.id)}
          >
            <Badge status={r.status} />
            <span>
              {r.workflow_name} · {r.branch}
            </span>
            <span className="text-sm text-muted-foreground">
              {r.triggered_by} · {duration(r)}
            </span>
          </button>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Histórico</h2>
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
                <tr key={r.id} className="border-t">
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
                      onClick={() => setSelected(r.id)}
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
