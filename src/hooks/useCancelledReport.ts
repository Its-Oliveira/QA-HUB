import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JiraIssueLink } from "@/types/jira";

// Campo 'reporter' (Relator) utilizado no lugar de 'assignee' (Responsável) — requisito de negócio
export interface CancelledIssue {
  key: string;
  url: string;
  summary: string;
  status: string;
  resolution: string;
  reporter: string;
  reporterAvatar: string;
  created: string | null;
  resolutiondate: string | null;
  issuelinks?: JiraIssueLink[];
}

export interface ReporterRank {
  reporter: string;
  count: number;
}

export interface CancelledReportData {
  monthStart: Date;
  monthEnd: Date;
  totalCancelled: number;
  totalMonth: number;
  cancellationRate: number; // percentual
  issues: CancelledIssue[];
  ranking: ReporterRank[];
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export function useCancelledReport() {
  const [data, setData] = useState<CancelledReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: res, error: fnError } = await supabase.functions.invoke(
        "jira-cancelled-report"
      );
      if (fnError) throw fnError;
      if (res?.error) throw new Error(res.error);

      const issues: CancelledIssue[] = res?.issues || [];
      const totalCancelled = res?.totalCancelled ?? issues.length;
      const totalMonth = res?.totalMonth ?? 0;

      // Agrupamento por reporter (Relator) — requisito de negócio
      const counts = new Map<string, number>();
      for (const i of issues) {
        const key = i.reporter || "Sem relator";
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const ranking: ReporterRank[] = Array.from(counts.entries())
        .map(([reporter, count]) => ({ reporter, count }))
        .sort((a, b) => b.count - a.count);

      const cancellationRate =
        totalMonth > 0 ? (totalCancelled / totalMonth) * 100 : 0;

      setData({
        monthStart: getStartOfMonth(),
        monthEnd: new Date(),
        totalCancelled,
        totalMonth,
        cancellationRate,
        issues,
        ranking,
      });
    } catch (err: any) {
      setError(err?.message || "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generate, data, isLoading, error };
}
