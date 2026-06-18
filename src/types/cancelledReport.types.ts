export interface CancelledCard {
  key: string;
  summary: string;
  assigneeDisplayName: string | null;
  resolutionDate: string | null;
  jiraUrl: string;
}

export interface TopResponsible {
  displayName: string;
  count: number;
  percentage: number;
  isTied: boolean;
}

export interface CancelledReportData {
  cancelledCards: CancelledCard[];
  totalCards: number;
  cancelledCount: number;
  cancellationRate: number | null;
  topResponsible: TopResponsible | null;
  reportPeriod: { start: Date; end: Date };
}
