import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReportDataState, ReportField, ReportRow, TimeFilter } from "@/types/reports.types";
import { AVAILABLE_FIELDS } from "./useReportConfig";
import { diffDays } from "@/utils/reportDateUtils";

/**
 * Reutiliza a integração Jira existente (tabela jira_cards alimentada pela
 * edge function sync-jira). Filtra os cards no período selecionado.
 */
export function useReportData() {
  const [state, setState] = useState<ReportDataState>({
    rows: [],
    totalIssues: 0,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
  });

  const fetchReport = useCallback(async (filter: TimeFilter, selectedFieldIds: string[]) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      // Sincroniza com Jira antes (best-effort)
      try {
        await supabase.functions.invoke("sync-jira");
      } catch {
        /* segue mesmo se sync falhar */
      }

      const { data, error } = await supabase
        .from("jira_cards")
        .select("*")
        .gte("created_at", filter.resolvedFrom.toISOString())
        .lte("created_at", filter.resolvedTo.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const selectedFields = selectedFieldIds
        .map((id) => AVAILABLE_FIELDS.find((f) => f.id === id))
        .filter((f): f is ReportField => Boolean(f));

      const rows: ReportRow[] = (data || []).map((issue: any) => {
        const row: ReportRow = {};
        for (const f of selectedFields) {
          if (f.id === "time_in_qa") {
            const created = issue.created_at ? new Date(issue.created_at) : null;
            const updated = issue.updated_at ? new Date(issue.updated_at) : null;
            row[f.id] = created && updated ? Math.max(0, diffDays(created, updated)) : 0;
          } else if (f.jiraFieldPath === "created_at" || f.jiraFieldPath === "updated_at") {
            row[f.id] = issue[f.jiraFieldPath] ? new Date(issue[f.jiraFieldPath]).toLocaleString("pt-BR") : "";
          } else {
            row[f.id] = issue[f.jiraFieldPath] ?? "";
          }
        }
        return row;
      });

      setState({
        rows,
        totalIssues: rows.length,
        isLoading: false,
        error: null,
        lastFetchedAt: new Date(),
      });
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      let friendly = msg;
      if (msg.includes("401")) friendly = "Não autenticado (401). Faça login novamente.";
      else if (msg.includes("403")) friendly = "Sem permissão para acessar os dados (403).";
      else if (msg.includes("429")) friendly = "Muitas requisições (429). Aguarde alguns instantes.";
      else if (msg.includes("timeout") || msg.includes("network")) friendly = "Falha de rede ou timeout.";
      setState((s) => ({ ...s, isLoading: false, error: friendly }));
    }
  }, []);

  return { ...state, fetchReport };
}
