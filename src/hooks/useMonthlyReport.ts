import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReporterBreakdown {
  reporter: string;
  created: number;
  cancelled: number;
  rate: number;
}

export interface CancelledIssueLite {
  key: string;
  url: string;
  summary: string;
  reporter: string;
  created: string | null;
  resolutiondate: string | null;
  issuelinks?: any[];
}

export interface BugClienteBlock {
  totalCreated?: number;
  totalCancelled?: number;
  cancellationRate?: number;
  breakdown?: ReporterBreakdown[];
  cancelledIssues?: CancelledIssueLite[];
  error?: string | null;
}

export interface BugQABlock {
  totalCreated?: number;
  error?: string;
}

export interface FlowBlock {
  count?: number;
  scanned?: number;
  sample?: { key: string; completedAt: string }[];
  error?: string;
}

export interface MonthlyReportData {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  bugCliente: BugClienteBlock;
  bugQA: BugQABlock;
  flowCompleted: FlowBlock;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstDayOfCurrentMonth(): string {
  const n = new Date();
  return toISODate(new Date(n.getFullYear(), n.getMonth(), 1));
}

function todayISO(): string {
  return toISODate(new Date());
}

export function useMonthlyReport() {
  const [data, setData] = useState<MonthlyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(firstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState<string>(todayISO());

  const validate = (s: string, e: string): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e))
      return "Datas inválidas";
    if (s > e) return "Data final não pode ser anterior à inicial";
    if (e > todayISO()) return "Data final não pode estar no futuro";
    return null;
  };

  const generate = useCallback(
    async (rangeOverride?: { startDate: string; endDate: string }) => {
      const s = rangeOverride?.startDate ?? startDate;
      const e = rangeOverride?.endDate ?? endDate;
      const v = validate(s, e);
      if (v) {
        setError(v);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const { data: res, error: fnError } = await supabase.functions.invoke(
          "jira-monthly-report",
          { body: { startDate: s, endDate: e } }
        );
        if (fnError) throw fnError;
        if (res?.error) throw new Error(res.error);
        setData(res as MonthlyReportData);
      } catch (err: any) {
        setError(err?.message || "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    },
    [startDate, endDate]
  );

  const resetToCurrentMonth = useCallback(() => {
    const s = firstDayOfCurrentMonth();
    const e = todayISO();
    setStartDate(s);
    setEndDate(e);
    return { startDate: s, endDate: e };
  }, []);

  const isCurrentMonth = useMemo(
    () => startDate === firstDayOfCurrentMonth() && endDate === todayISO(),
    [startDate, endDate]
  );

  return {
    data,
    isLoading,
    error,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    generate,
    resetToCurrentMonth,
    isCurrentMonth,
  };
}
