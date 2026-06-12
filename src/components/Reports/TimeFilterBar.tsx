import { useMemo } from "react";
import type { PresetPeriod, TimeFilter } from "@/types/reports.types";
import { resolvePresetDates, toISODate, diffDays } from "@/utils/reportDateUtils";

interface TimeFilterBarProps {
  value: TimeFilter;
  onChange: (filter: TimeFilter) => void;
  maxRangeDays?: number;
}

const PRESETS: { id: PresetPeriod; label: string }[] = [
  { id: "last_week", label: "Última semana" },
  { id: "last_month", label: "Último mês" },
  { id: "last_quarter", label: "Último trimestre" },
  { id: "last_6_months", label: "Últimos 6 meses" },
  { id: "last_year", label: "Último ano" },
  { id: "last_300_days", label: "Últimos 300 dias" },
];

const TimeFilterBar = ({ value, onChange, maxRangeDays = 730 }: TimeFilterBarProps) => {
  const error = useMemo(() => {
    if (value.resolvedFrom > value.resolvedTo) return "Data inicial não pode ser posterior à final.";
    if (diffDays(value.resolvedFrom, value.resolvedTo) > maxRangeDays)
      return `O período não pode ultrapassar ${maxRangeDays} dias.`;
    return null;
  }, [value, maxRangeDays]);

  const handlePreset = (preset: PresetPeriod) => {
    const range = resolvePresetDates(preset);
    onChange({ preset, resolvedFrom: range.from, resolvedTo: range.to });
  };

  const handleDateChange = (which: "from" | "to", iso: string) => {
    if (!iso) return;
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d, which === "to" ? 23 : 0, which === "to" ? 59 : 0, 0);
    const from = which === "from" ? date : value.resolvedFrom;
    const to = which === "to" ? date : value.resolvedTo;
    onChange({ preset: "custom", customRange: { from, to }, resolvedFrom: from, resolvedTo: to });
  };

  const isPresetReadonly = value.preset !== "custom";

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                active
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-muted-foreground">
          De:
          <input
            type="date"
            value={toISODate(value.resolvedFrom)}
            readOnly={isPresetReadonly}
            onChange={(e) => handleDateChange("from", e.target.value)}
            className="mt-1 bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col text-xs text-muted-foreground">
          Até:
          <input
            type="date"
            value={toISODate(value.resolvedTo)}
            readOnly={isPresetReadonly}
            onChange={(e) => handleDateChange("to", e.target.value)}
            className="mt-1 bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        {isPresetReadonly && (
          <span className="text-[11px] text-muted-foreground pb-1">Período predefinido (somente leitura)</span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default TimeFilterBar;
