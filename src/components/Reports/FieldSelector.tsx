import { useMemo, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import type { ReportField } from "@/types/reports.types";
import { getDefaultFieldIds } from "@/hooks/useReportConfig";

interface FieldSelectorProps {
  availableFields: ReportField[];
  selectedFieldIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const CATEGORY_LABELS: Record<ReportField["category"], string> = {
  basic: "Básicos",
  time: "Tempo",
  quality: "Qualidade",
  custom: "Campos customizados (Jira)",
};

const FieldSelector = ({ availableFields, selectedFieldIds, onSelectionChange }: FieldSelectorProps) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => availableFields.filter((f) => f.label.toLowerCase().includes(search.toLowerCase())),
    [availableFields, search]
  );

  const grouped = useMemo(() => {
    const map: Record<string, ReportField[]> = {};
    for (const f of filtered) (map[f.category] ||= []).push(f);
    return map;
  }, [filtered]);

  const toggle = (id: string) => {
    const set = new Set(selectedFieldIds);
    set.has(id) ? set.delete(id) : set.add(id);
    onSelectionChange(Array.from(set));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Campos do relatório</h3>
        <span className="text-[11px] text-muted-foreground">
          {selectedFieldIds.length} de {availableFields.length}
        </span>
      </div>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar campo..."
          className="w-full bg-secondary border border-border rounded-md pl-8 pr-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {Object.entries(grouped).map(([cat, fields]) => (
          <div key={cat}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              {CATEGORY_LABELS[cat as ReportField["category"]]}
            </p>
            <div className="space-y-1">
              {fields.map((f) => {
                const checked = selectedFieldIds.includes(f.id);
                return (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(f.id)}
                      className="accent-primary"
                    />
                    <span className="flex-1 text-foreground">{f.label}</span>
                    {f.kpiTag && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                        {f.kpiTag}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onSelectionChange(getDefaultFieldIds())}
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-1.5 border-t border-border pt-3"
      >
        <RotateCcw className="w-3 h-3" /> Restaurar padrões
      </button>
    </div>
  );
};

export default FieldSelector;
