import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  CancelledCard,
  CancelledReportData,
  TopResponsible,
} from "@/types/cancelledReport.types";

// REGRA DE NEGÓCIO:
// Apenas cards do projeto "Bugs OrçaFascio", tipo "BUG cliente".
// Tipos EXCLUÍDOS de qualquer contagem: BUG Backoffice, BUG QA, BUG DEV.
// Filtro de resolução case-sensitive: "Card Cancelado pelo QA".

function startOfCurrentMonth(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1, 0, 0, 0, 0);
}

function computeTopResponsible(cards: CancelledCard[]): TopResponsible | null {
  if (cards.length === 0) return null;
  const counts = new Map<string, number>();
  for (const c of cards) {
    const name = c.assigneeDisplayName || "Não atribuído";
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const max = Math.max(...counts.values());
  const top = [...counts.entries()]
    .filter(([, v]) => v === max)
    .map(([k]) => k)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const isTied = top.length > 1;
  const displayName = top[0];
  return {
    displayName,
    count: max,
    percentage: (max / cards.length) * 100,
    isTied,
  };
}

export interface UseCancelledByQAReportReturn extends CancelledReportData {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCancelledByQAReport(): UseCancelledByQAReportReturn {
  const [cancelledCards, setCancelledCards] = useState<CancelledCard[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reportPeriod, setReportPeriod] = useState<{ start: Date; end: Date }>({
    start: startOfCurrentMonth(),
    end: new Date(),
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const start = startOfCurrentMonth();
      const end = new Date();
      const { data: res, error: fnError } = await supabase.functions.invoke(
        "jira-cancelled-by-qa"
      );
      if (fnError) throw fnError;
      if (res?.error) throw new Error(res.error);

      const cancelled: CancelledCard[] = (res?.cancelled || []).map((i: any) => ({
        key: i.key,
        summary: i.summary || "",
        assigneeDisplayName: i.assigneeDisplayName ?? null,
        resolutionDate: i.resolutionDate ?? null,
        jiraUrl: i.jiraUrl,
      }));

      setCancelledCards(cancelled);
      setCancelledCount(res?.cancelledCount ?? cancelled.length);
      setTotalCards(res?.totalCount ?? 0);
      setReportPeriod({ start, end });
    } catch (err: any) {
      console.error("[useCancelledByQAReport]", err);
      setError(err instanceof Error ? err : new Error(String(err?.message || err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cancellationRate =
    totalCards === 0 ? null : (cancelledCount / totalCards) * 100;
  const topResponsible = computeTopResponsible(cancelledCards);

  return {
    cancelledCards,
    totalCards,
    cancelledCount,
    cancellationRate,
    topResponsible,
    reportPeriod,
    isLoading,
    isError: !!error,
    error,
    refetch: fetchData,
  };
}
