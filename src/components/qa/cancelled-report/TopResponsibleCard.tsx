import { Trophy } from "lucide-react";
import type { TopResponsible } from "@/types/cancelledReport.types";

interface Props {
  topResponsible: TopResponsible | null;
  hasAnyCancelled: boolean;
}

const TopResponsibleCard = ({ topResponsible, hasAnyCancelled }: Props) => {
  if (!hasAnyCancelled || !topResponsible) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center text-muted-foreground text-sm">
        Sem dados no período.
      </div>
    );
  }

  return (
    <div className="bg-card border border-yellow-500/30 rounded-xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-yellow-500/15 text-yellow-400 flex items-center justify-center">
        <Trophy className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Top Responsável
        </p>
        <p className="text-lg font-semibold text-foreground">
          {topResponsible.displayName}
          {topResponsible.isTied && (
            <span className="ml-2 text-xs text-yellow-400 font-normal">(empate)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {topResponsible.count}{" "}
          {topResponsible.count === 1 ? "card cancelado" : "cards cancelados"} ·{" "}
          {topResponsible.percentage.toFixed(2)}% do total
        </p>
      </div>
    </div>
  );
};

export default TopResponsibleCard;
