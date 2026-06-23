import { useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
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

const COLOR_PRIMARY = "#4C6EF5";
const COLOR_ORANGE = "#FF922B";
const COLOR_GREEN = "#40C057";
const COLOR_RED = "#FA5252";
const COLOR_MUTED = "#3a3f4b";

const parseISO = (s: string) => new Date(s + "T00:00:00");
const fmtDateSafe = (v: string | null | undefined) =>
  v ? fmtDate(new Date(v)) : "—";

function Collapsible({
  label,
  count,
  children,
  id,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3" data-export-collapsible={id}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label} ({count})
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

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

  const pieData = [
    { name: "Não cancelados", value: Math.max(0, (bc.totalCreated ?? 0) - (bc.totalCancelled ?? 0)) },
    { name: "Cancelados", value: bc.totalCancelled ?? 0 },
  ];
  const barData = (bc.breakdown || []).map((r) => ({
    reporter: r.reporter,
    Criados: r.created,
    Cancelados: r.cancelled,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      {/* Cabeçalho */}
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

      {/* Resumo executivo */}
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Resumo executivo</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Fluxo completo
          </p>
          {flow.error ? (
            <p className="text-xs text-destructive">Erro: {flow.error}</p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-primary">{flow.count ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">
                cards concluíram o fluxo
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
            <p className="text-2xl font-semibold text-foreground">{bq.totalCreated ?? 0}</p>
          )}
        </div>
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Taxa BUG CLIENTE
          </p>
          {bc.error ? (
            <p className="text-xs text-destructive">Erro: {bc.error}</p>
          ) : (
            <p className="text-2xl font-semibold text-orange-400">
              {(bc.cancellationRate ?? 0).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {sep}

      {/* Seção BUG CLIENTE */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          BUG CLIENTE
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

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div
                className="bg-secondary/20 border border-border rounded-lg p-3"
                data-export-chart="pie"
              >
                <p className="text-[11px] uppercase text-muted-foreground mb-1">
                  Proporção criados × cancelados
                </p>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        <Cell fill={COLOR_GREEN} />
                        <Cell fill={COLOR_RED} />
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#1a1d25", border: "1px solid #2a2f3a", fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div
                className="bg-secondary/20 border border-border rounded-lg p-3"
                data-export-chart="bar"
              >
                <p className="text-[11px] uppercase text-muted-foreground mb-1">
                  Por relator (criados × cancelados)
                </p>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                      <CartesianGrid stroke={COLOR_MUTED} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="reporter"
                        tick={{ fontSize: 9, fill: "#a0a4ac" }}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#a0a4ac" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#1a1d25", border: "1px solid #2a2f3a", fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Criados" fill={COLOR_PRIMARY} isAnimationActive={false} />
                      <Bar dataKey="Cancelados" fill={COLOR_ORANGE} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabela por relator */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              Detalhamento por relator
            </p>
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

            <Collapsible
              label="Ver detalhamento — cards cancelados"
              count={bc.cancelledIssues?.length ?? 0}
              id="bc-cancelled"
            >
              <DetailTable
                rows={(bc.cancelledIssues || []).map((i) => ({
                  Chave: <JiraLink keyId={i.key} url={i.url} />,
                  Título: i.summary,
                  Relator: i.reporter,
                  Criado: fmtDateSafe(i.created),
                  Cancelado: fmtDateSafe(i.resolutiondate),
                }))}
              />
            </Collapsible>
          </>
        )}
      </div>

      {sep}

      {/* Seção BUG QA */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          BUG QA
        </p>
        {bq.error ? (
          <p className="text-xs text-destructive">Erro: {bq.error}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {bq.totalCreated ?? 0} cards BUG QA criados no período.
            </p>
            <Collapsible
              label="Ver detalhamento — cards BUG QA"
              count={bq.issues?.length ?? 0}
              id="bq-created"
            >
              <DetailTable
                rows={(bq.issues || []).map((i) => ({
                  Chave: <JiraLink keyId={i.key} url={i.url} />,
                  Título: i.summary,
                  Relator: i.reporter,
                  Criado: fmtDateSafe(i.created),
                }))}
              />
            </Collapsible>
          </>
        )}
      </div>

      {sep}

      {/* Seção Fluxo completo */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          Fluxo completo
        </p>
        {flow.error ? (
          <p className="text-xs text-destructive">Erro: {flow.error}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {flow.count ?? 0} cards concluíram o fluxo no período
              {typeof flow.scanned === "number" ? ` (${flow.scanned} cards Done analisados)` : ""}.
            </p>
            <Collapsible
              label="Ver detalhamento — cards do fluxo"
              count={flow.issues?.length ?? 0}
              id="flow-completed"
            >
              <DetailTable
                rows={(flow.issues || []).map((i) => ({
                  Chave: <JiraLink keyId={i.key} url={i.url} />,
                  Título: i.summary,
                  Relator: i.reporter,
                  Criado: fmtDateSafe(i.created),
                  Concluído: fmtDateSafe(i.completedAt),
                }))}
              />
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
};

function DetailTable({ rows }: { rows: Record<string, string | number>[] }) {
  if (!rows.length)
    return <p className="text-xs text-muted-foreground italic">Sem registros.</p>;
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            {headers.map((h) => (
              <th key={h} className="py-1.5 pr-3 font-sans">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-b border-border/50">
              {headers.map((h) => (
                <td key={h} className="py-1.5 pr-3 text-foreground align-top">
                  {String(r[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MonthlyQAReport;
