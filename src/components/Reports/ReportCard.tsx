import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ReportCardProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  onGenerate: () => void;
  isLoading?: boolean;
}

const ReportCard = ({ Icon, title, description, onGenerate, isLoading }: ReportCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1">{description}</p>
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {isLoading ? "Gerando..." : "Gerar Relatório"}
      </button>
    </div>
  );
};

export default ReportCard;
