import type { CancelledReportData } from "@/hooks/useCancelledReport";
import { fmtDate, fmtDateTime } from "@/utils/reportFormatters";
import { IssueLinkIcon } from "@/components/jira/IssueLinkIcon";

const CancelledCardsReport = ({ data }: { data: CancelledReportData }) => {
  const sep = <div className="border-t border-dashed border-border my-4" aria-hidden />;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          RELATÓRIO MENSAL — CARDS CANCELADOS PELO QA
        </h2>
        <p className="text-xs text-muted-foreground">
          Período: {fmtDate(data.monthStart)} a {fmtDate(data.monthEnd)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Gerado em: {fmtDateTime(new Date())}
        </p>
      </div>

      {sep}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Cancelados pelo QA
          </p>
          <p className="text-xl font-semibold text-primary">{data.totalCancelled}</p>
        </div>
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Total criados no mês
          </p>
          <p className="text-xl font-semibold text-foreground">{data.totalMonth}</p>
        </div>
        <div className="bg-secondary/50 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Taxa de cancelamento
          </p>
          <p className="text-xl font-semibold text-orange-400">
            {data.cancellationRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {sep}

      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          Ranking de Relatores
        </p>
        {data.ranking.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sem relator.</p>
        ) : (
          <ul className="space-y-1">
            {data.ranking.map((r, idx) => (
              <li
                key={r.reporter}
                className="flex items-center justify-between text-xs px-3 py-1.5 rounded-md bg-secondary/30 border border-border"
              >
                <span className="text-foreground">
                  <span className="text-muted-foreground mr-2">#{idx + 1}</span>
                  {r.reporter}
                </span>
                <span className="text-primary font-semibold">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sep}

      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          Detalhamento dos Cards
        </p>
        {data.issues.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhum card cancelado pelo QA neste mês.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-1.5 pr-3">Card</th>
                  <th className="py-1.5 pr-3 font-sans">Resumo</th>
                  <th className="py-1.5 pr-3 font-sans">Relator</th>
                  <th className="py-1.5 pr-3 font-sans">Criado</th>
                </tr>
              </thead>
              <tbody>
                {data.issues.map((i) => (
                  <tr key={i.key} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 align-top">
                      <a
                        href={i.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {i.key}
                      </a>
                      <IssueLinkIcon issuelinks={i.issuelinks} />
                    </td>
                    <td className="py-1.5 pr-3 align-top font-sans text-foreground max-w-md">
                      {i.summary}
                    </td>
                    <td className="py-1.5 pr-3 align-top font-sans text-foreground">
                      {i.reporter || "Sem relator"}
                    </td>
                    <td className="py-1.5 pr-3 align-top font-sans text-muted-foreground">
                      {i.created ? fmtDate(new Date(i.created)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CancelledCardsReport;
