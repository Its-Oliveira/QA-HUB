export type PresetPeriod =
  | "last_week"
  | "last_month"
  | "last_quarter"
  | "last_6_months"
  | "last_year"
  | "last_300_days"
  | "custom";

export interface TimeFilter {
  preset: PresetPeriod;
  customRange?: { from: Date; to: Date };
  readonly resolvedFrom: Date;
  readonly resolvedTo: Date;
}

export interface ReportField {
  id: string;
  label: string;
  category: "basic" | "time" | "quality" | "custom";
  jiraFieldPath: string;
  isDefault: boolean;
  isCalculated?: boolean;
  kpiTag?: string;
}

export interface ReportConfig {
  id: string;
  name: string;
  selectedFieldIds: string[];
  timeFilter: Omit<TimeFilter, "resolvedFrom" | "resolvedTo">;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportRow = Record<string, string | number | Date | null>;

export interface ReportDataState {
  rows: ReportRow[];
  totalIssues: number;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
}
