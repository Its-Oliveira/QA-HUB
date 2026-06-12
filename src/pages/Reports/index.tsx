import { useEffect, useMemo, useState } from "react";
import { Play, Save } from "lucide-react";
import { toast } from "sonner";
import TimeFilterBar from "@/components/Reports/TimeFilterBar";
import ReportBuilder from "@/components/Reports/ReportBuilder";
import ReportPreview from "@/components/Reports/ReportPreview";
import SavedReportsList from "@/components/Reports/SavedReportsList";
import { useTimeFilter } from "@/hooks/useTimeFilter";
import { useReportData } from "@/hooks/useReportData";
import { AVAILABLE_FIELDS, getDefaultFieldIds, useReportConfig } from "@/hooks/useReportConfig";
import type { ReportConfig, TimeFilter } from "@/types/reports.types";
import { diffDays, resolvePresetDates } from "@/utils/reportDateUtils";

const ReportsPage = () => {
  const { filter, setFilter } = useTimeFilter("last_month");
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>(getDefaultFieldIds());
  const [name, setName] = useState("");
  const { configs, saveConfig, renameConfig, deleteConfig, maxReached } = useReportConfig();
  const data = useReportData();

  const selectedFields = useMemo(
    () =>
      selectedFieldIds
        .map((id) => AVAILABLE_FIELDS.find((f) => f.id === id))
        .filter((f): f is (typeof AVAILABLE_FIELDS)[number] => Boolean(f)),
    [selectedFieldIds]
  );

  const invalidRange =
    filter.resolvedFrom > filter.resolvedTo || diffDays(filter.resolvedFrom, filter.resolvedTo) > 730;
  const noFields = selectedFieldIds.length === 0;
  const canGenerate = !invalidRange && !noFields;

  const generate = () => {
    if (!canGenerate) return;
    data.fetchReport(filter, selectedFieldIds);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Dê um nome à configuração.");
      return;
    }
    if (maxReached) {
      toast.error("Limite de 10 configurações atingido.");
      return;
    }
    saveConfig({
      name: name.trim(),
      selectedFieldIds,
      timeFilter: { preset: filter.preset, customRange: filter.customRange },
    });
    setName("");
    toast.success("Configuração salva.");
  };

  const handleLoad = (c: ReportConfig) => {
    const validIds = c.selectedFieldIds.filter((id) => AVAILABLE_FIELDS.some((f) => f.id === id));
    if (validIds.length !== c.selectedFieldIds.length) {
      toast.message("Alguns campos salvos não existem mais e foram ignorados.");
    }
    setSelectedFieldIds(validIds.length ? validIds : getDefaultFieldIds());
    const tf = c.timeFilter;
    if (tf.preset === "custom" && tf.customRange) {
      const from = new Date(tf.customRange.from);
      const to = new Date(tf.customRange.to);
      setFilter({ preset: "custom", customRange: { from, to }, resolvedFrom: from, resolvedTo: to } as TimeFilter);
    } else {
      const r = resolvePresetDates(tf.preset);
      setFilter({ preset: tf.preset, resolvedFrom: r.from, resolvedTo: r.to } as TimeFilter);
    }
    toast.success(`Configuração "${c.name}" carregada.`);
  };

  useEffect(() => {
    // primeira execução
    data.fetchReport(filter, selectedFieldIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Relatórios</h1>
        <p className="text-xs text-muted-foreground">
          Construa relatórios customizados a partir dos cards Jira sincronizados.
        </p>
      </div>

      <TimeFilterBar value={filter} onChange={setFilter} />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-3">
          <ReportBuilder
            availableFields={AVAILABLE_FIELDS}
            selectedFieldIds={selectedFieldIds}
            onSelectionChange={setSelectedFieldIds}
          />
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da configuração"
              className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSave}
              disabled={maxReached}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-xs hover:bg-accent disabled:opacity-50"
            >
              <Save className="w-3 h-3" /> Salvar config
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={generate}
              disabled={!canGenerate || data.isLoading}
              title={noFields ? "Selecione pelo menos um campo" : invalidRange ? "Período inválido" : ""}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
            >
              <Play className="w-3 h-3" /> Gerar relatório
            </button>
          </div>
          <ReportPreview state={data} fields={selectedFields} onRetry={generate} />
        </div>
      </div>

      <SavedReportsList
        configs={configs}
        onLoad={handleLoad}
        onRename={renameConfig}
        onDelete={deleteConfig}
        maxReached={maxReached}
      />
    </div>
  );
};

export default ReportsPage;
