import { useMemo, useState } from "react";
import { Download, RefreshCw, Inbox } from "lucide-react";
import type { ReportDataState, ReportField } from "@/types/reports.types";
import { exportRowsAsCsv } from "@/utils/reportExport";

interface ReportPreviewProps {
  state: ReportDataState;
  fields: ReportField[];
  onRetry: () => void;
}

const PAGE_SIZE = 10;

const statusBadge = (value: string) => {
  const v = value.toLowerCase();
  if (v.includes("produção") || v.includes("aprovado"))
    return "bg-green-500/15 text-green-400 border-green-500/30";
  if (v.includes("revisão") || v.includes("qa"))
    return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-secondary text-muted-foreground border-border";
};

const ReportPreview = ({ state, fields, onRetry }: ReportPreviewProps) => {
  const [page, setPage] = useState(0);

  const metrics = useMemo(() => {
    const total = state.rows.length;
    const bugs = state.rows.filter((r) =>
      String(r["bug_type"] ?? "").toLowerCase().includes("bug")
    ).length;
    const timeVals = state.rows
      .map((r) => Number(r["time_in_qa"]))
      .filter((n) => !isNaN(n) && n > 0);
    const avgTime = timeVals.length ? (timeVals.reduce((a, b) => a + b, 0) / timeVals.length).toFixed(1) : "0";
    const approved = state.rows.filter((r) =>
      String(r["status"] ?? "").toLowerCase().includes("produção")
    ).length;
    const approvalRate = total ? Math.round((approved / total) * 100) : 0;
    return { total, bugs, avgTime, approvalRate };
  }, [state.rows]);

  const totalPages = Math.max(1, Math.ceil(state.rows.length / PAGE_SIZE));
  const pageRows = state.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (state.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-md bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-card border border-destructive/40 rounded-xl p-6 text-center">
        <p className="text-sm text-destructive mb-3">{state.error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
        >
          <RefreshCw className="w-3 h-3" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total de issues", value: metrics.total },
          { label: "Bugs encontrados", value: metrics.bugs },
          { label: "Tempo médio em QA", value: `${metrics.avgTime}d` },
          { label: "Taxa de aprovação", value: `${metrics.approvalRate}%` },
        ].map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="text-xl font-semibold text-foreground mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <p className="text-xs text-muted-foreground">
            {state.rows.length} resultado{state.rows.length !== 1 && "s"}
            {state.lastFetchedAt && ` • atualizado ${state.lastFetchedAt.toLocaleTimeString("pt-BR")}`}
          </p>
          <button
            disabled={!state.rows.length}
            onClick={() => exportRowsAsCsv(state.rows, fields)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-xs hover:bg-accent disabled:opacity-50"
          >
            <Download className="w-3 h-3" /> Exportar CSV
          </button>
        </div>

        {state.rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum dado encontrado no período selecionado.</p>
            <p className="text-xs mt-1">Ajuste o filtro de tempo ou os campos selecionados.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50">
                  <tr>
                    {fields.map((f) => (
                      <th key={f.id} className="text-left px-3 py-2 font-medium text-muted-foreground">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr key={i} className="border-t border-border hover:bg-accent/30">
                      {fields.map((f) => {
                        const v = row[f.id];
                        if (f.id === "status") {
                          return (
                            <td key={f.id} className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] ${statusBadge(String(v ?? ""))}`}>
                                {String(v ?? "")}
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={f.id} className="px-3 py-2 text-foreground">
                            {v instanceof Date ? v.toLocaleString("pt-BR") : String(v ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 rounded bg-secondary border border-border text-xs disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 rounded bg-secondary border border-border text-xs disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportPreview;
