import { RefreshCw } from "lucide-react";

interface Props {
  start: Date;
  end: Date;
  onRefresh: () => void;
  isLoading?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

const CancelledReportHeader = ({ start, end, onRefresh, isLoading }: Props) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Cancelados pelo QA</h1>
        <p className="text-xs text-muted-foreground">
          Período: {fmt(start)} até {fmt(end)}
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-60"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
        Atualizar
      </button>
    </div>
  );
};

export default CancelledReportHeader;
