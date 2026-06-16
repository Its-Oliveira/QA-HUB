import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JiraIssue, WeeklyReportData, WeeklyStatus } from "@/types/reports.types";
import { WEEKLY_STATUS_ORDER } from "@/types/reports.types";

const OLD_STATUSES = new Set<WeeklyStatus>([
  "Backlog",
  "Não Iniciado",
  "Em Desenvolvimento",
  "Merge Request",
  "Revisão QA",
  "Reprovado QA",
  "Revert",
]);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function mapStatus(raw: string): WeeklyStatus | string {
  const n = norm(raw);
  if (n === "backlog") return "Backlog";
  if (["nao iniciado", "to do", "todo", "open", "aberto"].includes(n)) return "Não Iniciado";
  if (["em desenvolvimento", "in progress", "desenvolvimento"].includes(n)) return "Em Desenvolvimento";
  if (["merge request", "code review", "in review"].includes(n)) return "Merge Request";
  if (["revisao qa", "em revisao qa", "qa review", "in qa", "em revisao"].includes(n)) return "Revisão QA";
  if (["aprovado qa", "qa approved", "approved qa"].includes(n)) return "Aprovado QA" as any;
  if (["reprovado qa", "qa reprovado", "qa rejected", "qa failed"].includes(n)) return "Reprovado QA";
  if (n === "revert") return "Revert";
  return raw;
}

function isBimCard(summary: string, labels: string[], components: string[]): boolean {
  const haystack = [summary, ...labels, ...components].join(" ").toLowerCase();
  return /\b(bim|or[çc]a\s*bim|or[çc]abim)\b/.test(haystack);
}

function getStartOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export interface UseWeeklyReportReturn {
  generate: () => Promise<void>;
  data: WeeklyReportData | null;
  isLoading: boolean;
  error: string | null;
  generatedAt: Date | null;
}

export function useWeeklyReport(): UseWeeklyReportReturn {
  const [data, setData] = useState<WeeklyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: res, error: fnError } = await supabase.functions.invoke("jira-weekly-report");
      if (fnError) throw fnError;
      if (res?.error) throw new Error(res.error);

      const rawIssues: any[] = res?.issues || [];
      const weekStart = getStartOfCurrentWeek();
      const weekEnd = new Date();

      const issues: JiraIssue[] = rawIssues.map((i) => ({
        key: i.key,
        url: i.url,
        summary: i.summary,
        status: mapStatus(i.status),
        labels: i.labels || [],
        components: i.components || [],
        created: i.created,
        isBim: isBimCard(i.summary || "", i.labels || [], i.components || []),
        issuelinks: i.issuelinks || [],
      }));

      const oldByStatus: Record<string, JiraIssue[]> = {};
      const weekByStatus: Record<string, JiraIssue[]> = {};

      for (const issue of issues) {
        if (!issue.created) continue;
        const created = new Date(issue.created);
        const isThisWeek = created >= weekStart;
        if (isThisWeek) {
          (weekByStatus[issue.status] ||= []).push(issue);
        } else if (OLD_STATUSES.has(issue.status as WeeklyStatus)) {
          (oldByStatus[issue.status] ||= []).push(issue);
        }
      }

      const oldTotal = Object.values(oldByStatus).reduce((a, b) => a + b.length, 0);
      const weekTotal = Object.values(weekByStatus).reduce((a, b) => a + b.length, 0);
      const bimIssues = issues.filter((i) => i.isBim);

      setData({
        weekStart,
        weekEnd,
        totalOpen: issues.length,
        oldCards: { total: oldTotal, byStatus: oldByStatus },
        thisWeekCards: { total: weekTotal, byStatus: weekByStatus },
        bimCards: { total: bimIssues.length, issues: bimIssues },
      });
      setGeneratedAt(new Date());
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      let friendly = msg;
      if (msg.includes("401")) friendly = "Não autenticado (401).";
      else if (msg.includes("403")) friendly = "Sem permissão (403).";
      else if (msg.includes("429")) friendly = "Muitas requisições. Aguarde.";
      else if (msg.includes("Failed to fetch") || msg.includes("network"))
        friendly = "Falha de rede. Verifique a conexão.";
      setError(friendly);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generate, data, isLoading, error, generatedAt };
}

export { WEEKLY_STATUS_ORDER };
