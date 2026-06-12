import type { WeeklyReportData } from "@/types/reports.types";
import { WEEKLY_STATUS_ORDER } from "@/types/reports.types";
import { fmtDate, fmtDateTime, fmtShort } from "@/utils/reportFormatters";

const statusBadgeClass: Record<string, string> = {
  Backlog: "bg-secondary text-muted-foreground border-border",
  "Não Iniciado": "bg-secondary text-muted-foreground border-border",
  "Em Desenvolvimento": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Merge Request": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Revisão QA": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Aprovado QA": "bg-green-500/15 text-green-400 border-green-500/30",
  "Reprovado QA": "bg-red-500/15 text-red-400 border-red-500/30",
  Revert: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const StatusBadge = ({ name }: { name: string }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${
      statusBadgeClass[name] || "bg-secondary text-muted-foreground border-border"
    }`}
  >
    {name}
  </span>
);

const WeeklyOpenCardsReport = ({ data }: { data: WeeklyReportData }) => {
  const sep = (
    <div className="border-t border-dashed border-border my-4" aria-hidden />
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          RELATÓRIO SEMANAL QA — BUG WEB
        </h2>
        <p className="text-xs text-muted-foreground">
          Período: {fmtDate(data.weekStart)} a {fmtDate(data.weekEnd)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Gerado em: {fmtDateTime(new Date())}
        </p>
      </div>

      {sep}

      <p className="text-sm text-foreground">
        <span className="font-semibold">TOTAL DE CARDS EM ABERTO:</span>{" "}
        <span className="text-primary font-semibold">{data.totalOpen}</span>
      </p>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Bug Web
        </p>
        <p className="text-xs text-muted-foreground">
          *** Número de Cards Antigos em Aberto:{" "}
          <span className="text-foreground font-medium">{data.oldCards.total}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          *** Cards dessa semana ({fmtShort(data.weekStart)} - {fmtShort(data.weekEnd)}):{" "}
          <span className="text-foreground font-medium">{data.thisWeekCards.total}</span>
        </p>
        <ul className="pl-5 space-y-0.5">
          {WEEKLY_STATUS_ORDER.map((st) => (
            <li key={st} className="text-xs text-muted-foreground">
              • {st}:{" "}
              <span className="text-foreground">
                {data.thisWeekCards.byStatus[st]?.length || 0}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Produtos BIM
        </p>
        <p className="text-xs text-muted-foreground">
          *** Número de Cards relacionados a produto BIM em aberto:{" "}
          <span className="text-foreground font-medium">{data.bimCards.total}</span>
        </p>
      </div>

      {sep}

      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          Detalhamento — Cards Antigos em Aberto
        </p>
        {data.oldCards.total === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum card antigo em aberto.</p>
        ) : (
          <div className="space-y-3 font-mono text-[11px]">
            {WEEKLY_STATUS_ORDER.map((st) => {
              const items = data.oldCards.byStatus[st];
              if (!items || items.length === 0) return null;
              return (
                <div key={st}>
                  <StatusBadge name={st} />
                  <ul className="mt-1 pl-4 space-y-0.5">
                    {items.map((i) => (
                      <li key={i.key}>
                        <a
                          href={i.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {i.url}
                        </a>
                        {i.isBim && (
                          <span className="ml-2 text-orange-400 font-sans">(OrçaBim)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sep}

      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          Detalhamento — Essa Semana ({fmtDate(data.weekStart)} - {fmtDate(data.weekEnd)})
        </p>
        {data.thisWeekCards.total === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum card criado essa semana.</p>
        ) : (
          <div className="space-y-3 font-mono text-[11px]">
            {WEEKLY_STATUS_ORDER.map((st) => {
              const items = data.thisWeekCards.byStatus[st];
              if (!items || items.length === 0) return null;
              return (
                <div key={st}>
                  <StatusBadge name={st} />
                  <ul className="mt-1 pl-4 space-y-0.5">
                    {items.map((i) => (
                      <li key={i.key}>
                        <a
                          href={i.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {i.url}
                        </a>
                        {i.isBim && (
                          <span className="ml-2 text-orange-400 font-sans">(OrçaBim)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyOpenCardsReport;
