import { useCallback, useEffect, useState } from "react";
import type { ReportConfig, ReportField } from "@/types/reports.types";

const STORAGE_KEY = "qa_hub_report_configs";
const MAX_CONFIGS = 10;

export const AVAILABLE_FIELDS: ReportField[] = [
  { id: "key", label: "ID do Card", category: "basic", jiraFieldPath: "key", isDefault: true },
  { id: "title", label: "Título", category: "basic", jiraFieldPath: "title", isDefault: true },
  { id: "status", label: "Status", category: "basic", jiraFieldPath: "status", isDefault: true },
  { id: "priority", label: "Prioridade", category: "basic", jiraFieldPath: "priority", isDefault: true },
  { id: "assignee", label: "Responsável", category: "basic", jiraFieldPath: "assignee", isDefault: false },
  { id: "created_at", label: "Criado em", category: "time", jiraFieldPath: "created_at", isDefault: true },
  { id: "updated_at", label: "Atualizado em", category: "time", jiraFieldPath: "updated_at", isDefault: false },
  { id: "time_in_qa", label: "Tempo em QA (dias)", category: "time", jiraFieldPath: "_calc", isDefault: true, isCalculated: true, kpiTag: "Calc." },
  { id: "bug_type", label: "Tipo de Bug", category: "quality", jiraFieldPath: "bug_type", isDefault: false, kpiTag: "KPI" },
  { id: "description", label: "Descrição", category: "custom", jiraFieldPath: "description", isDefault: false },
];

export function getDefaultFieldIds(): string[] {
  return AVAILABLE_FIELDS.filter((f) => f.isDefault).map((f) => f.id);
}

function load(): ReportConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReportConfig[];
    return parsed.map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
  } catch {
    return [];
  }
}

function persist(configs: ReportConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function useReportConfig() {
  const [configs, setConfigs] = useState<ReportConfig[]>([]);

  useEffect(() => {
    setConfigs(load());
  }, []);

  const saveConfig = useCallback((config: Omit<ReportConfig, "id" | "createdAt" | "updatedAt">) => {
    setConfigs((prev) => {
      if (prev.length >= MAX_CONFIGS) return prev;
      const next: ReportConfig = {
        ...config,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = [...prev, next];
      persist(updated);
      return updated;
    });
  }, []);

  const renameConfig = useCallback((id: string, name: string) => {
    setConfigs((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, name, updatedAt: new Date() } : c));
      persist(updated);
      return updated;
    });
  }, []);

  const deleteConfig = useCallback((id: string) => {
    setConfigs((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  return { configs, saveConfig, renameConfig, deleteConfig, maxReached: configs.length >= MAX_CONFIGS };
}
