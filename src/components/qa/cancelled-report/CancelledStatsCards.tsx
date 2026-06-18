import type { CancelledReportData } from "@/types/cancelledReport.types";
import { XCircle, ListChecks, Percent, Trophy } from "lucide-react";

interface Props {
  data: Pick<
    CancelledReportData,
    "cancelledCount" | "totalCards" | "cancellationRate" | "topResponsible"
  >;
}

const Card = ({
  Icon,
  label,
  value,
  accent,
}: {
  Icon: any;
  label: string;
  value: string;
  accent: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
    <p className="text-2xl font-semibold text-foreground">{value}</p>
  </div>
);

const CancelledStatsCards = ({ data }: Props) => {
  const rate =
    data.cancellationRate === null ? "N/A" : `${data.cancellationRate.toFixed(2)}%`;
  const top = data.topResponsible
    ? `${data.topResponsible.displayName} (${data.topResponsible.count})`
    : "—";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        Icon={XCircle}
        label="Cancelados no Mês"
        value={String(data.cancelledCount)}
        accent="bg-red-500/15 text-red-400"
      />
      <Card
        Icon={ListChecks}
        label="Cards Totais no Mês"
        value={String(data.totalCards)}
        accent="bg-blue-500/15 text-blue-400"
      />
      <Card
        Icon={Percent}
        label="Taxa de Cancelamento"
        value={rate}
        accent="bg-orange-500/15 text-orange-400"
      />
      <Card
        Icon={Trophy}
        label="Top Responsável"
        value={top}
        accent="bg-yellow-500/15 text-yellow-400"
      />
    </div>
  );
};

export default CancelledStatsCards;
