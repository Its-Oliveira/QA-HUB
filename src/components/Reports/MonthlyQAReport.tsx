import { useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import type { MonthlyReportData } from "@/hooks/useMonthlyReport";
import { fmtDate, fmtDateTime } from "@/utils/reportFormatters";

interface Props {
  data: MonthlyReportData;
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  onRegenerate: (range?: { startDate: string; endDate: string }) => void;
  onResetMonth: () => { startDate: string; endDate: string };
  isCurrentMonth: boolean;
  isLoading: boolean;
}

const sep = <div className="border-t border-dashed border-border my-4" aria-hidden />;

const MonthlyQAReport = ({
  data,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onRegenerate,
  onResetMonth,
  isCurrentMonth,
  isLoading,
}: Props) => {
  const [localError, setLocalError] = useState<string | null>(null);

  const bc = data.bugCliente;
  const bq = data.bugQA;
  const flow = data.flowCompleted;

  const apply = () => {
    setLocalError(null);
    if (startDate > endDate) {
      setLocalError("Data final não pode ser anterior à inicial");
      return;
    }
    if (endDate > new Date().toISOString().slice(0, 10)) {
      setLocalError("Data final não pode estar no futuro");
      return;
    }
    onRegenerate({ startDate, endDate });
  };

  const reset = () => {
    const r = onResetMonth();
    onRegenerate(r);
  };

  const parseISO = (s: string) => new Date(s + "T00:00:00");

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          RELATÓRIO MENSAL DE QA
        </h2>
        <p className="text-xs text-muted-foreground">
          Período: {fmtDate(parseISO(data.startDate))} a {fmtDate(parseISO(data.endDate))}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Gerado em: {fmtDateTime(new Date())}
        </p>
      </div>

      {/* Seletor de período */}
      <div className="flex flex-wrap items-end gap-2 bg-secondary/30 border border-border rounded-lg p-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Início</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fim</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-xs"
          />
        </div>
        <button
          onClick={apply}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-60"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
        {!isCurrentMonth && (
          <button
            onClick={reset}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-xs"
          >
            <RotateCcw className="w-3 h-3" /> Voltar ao mês atual
          </button>
        )}
        {localError && (
          <span className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {localError}
          </span>
        )}
      </div>

      {sep}

      {/* Indicadores principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Fluxo completo
          </p>
          {flow.error ? (
            <p className="text-xs text-destructive">Erro: {flow.error}</p>
          ) : (
            <>
              <p className="text-xl font-semibold text-primary">{flow.count ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">
                cards passaram pelas 7 etapas
                {typeof flow.scanned === "number" ? ` (${flow.scanned} analisados)` : ""}
              </p>
            </>
          )}
        </div>
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            BUG QA criados
          </p>
          {bq.error ? (
            <p className="text-xs text-destructive">Erro: {bq.error}</p>
          ) : (
            <p className="text-xl font-semibold text-foreground">{bq.totalCreated ?? 0}</p>
          )}
        </div>
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Taxa BUG CLIENTE
          </p>
          {bc.error ? (
            <p className="text-xs text-destructive">Erro: {bc.error}</p>
          ) : (
            <p className="text-xl font-semibold text-orange-400">
              {(bc.cancellationRate ?? 0).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {sep}

      {/* Bloco BUG CLIENTE */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          BUG CLIENTE — Detalhamento por Relator
        </p>
        {bc.error ? (
          <p className="text-xs text-destructive">Erro: {bc.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-secondary/30 border border-border rounded p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Criados</p>
                <p className="text-sm font-semibold text-foreground">{bc.totalCreated ?? 0}</p>
              </div>
              <div className="bg-secondary/30 border border-border rounded p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Cancelados</p>
                <p className="text-sm font-semibold text-primary">{bc.totalCancelled ?? 0}</p>
              </div>
              <div className="bg-secondary/30 border border-border rounded p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Taxa</p>
                <p className="text-sm font-semibold text-orange-400">
                  {(bc.cancellationRate ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
            {!bc.breakdown || bc.breakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Nenhum card BUG CLIENTE criado neste período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-1.5 pr-3 font-sans">Relator</th>
                      <th className="py-1.5 pr-3 font-sans text-right">Criados</th>
                      <th className="py-1.5 pr-3 font-sans text-right">Cancelados</th>
                      <th className="py-1.5 pr-3 font-sans text-right">% cancelamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bc.breakdown.map((r) => (
                      <tr key={r.reporter} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 font-sans text-foreground">{r.reporter}</td>
                        <td className="py-1.5 pr-3 text-right">{r.created}</td>
                        <td className="py-1.5 pr-3 text-right text-primary">{r.cancelled}</td>
                        <td className="py-1.5 pr-3 text-right text-orange-400">
                          {r.rate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyQAReport;
