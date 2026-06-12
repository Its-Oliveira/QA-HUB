export type WeeklyStatus =
  | "Backlog"
  | "Não Iniciado"
  | "Em Desenvolvimento"
  | "Merge Request"
  | "Revisão QA"
  | "Aprovado QA"
  | "Reprovado QA"
  | "Revert";

export const WEEKLY_STATUS_ORDER: WeeklyStatus[] = [
  "Backlog",
  "Não Iniciado",
  "Em Desenvolvimento",
  "Merge Request",
  "Revisão QA",
  "Aprovado QA",
  "Reprovado QA",
  "Revert",
];

export interface JiraIssue {
  key: string;
  url: string;
  summary: string;
  status: WeeklyStatus | string;
  labels: string[];
  components: string[];
  created: string | null;
  isBim: boolean;
}

export interface WeeklyReportData {
  weekStart: Date;
  weekEnd: Date;
  totalOpen: number;
  oldCards: {
    total: number;
    byStatus: Record<string, JiraIssue[]>;
  };
  thisWeekCards: {
    total: number;
    byStatus: Record<string, JiraIssue[]>;
  };
  bimCards: {
    total: number;
    issues: JiraIssue[];
  };
}
