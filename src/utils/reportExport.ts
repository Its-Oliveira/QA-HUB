import type { ReportField, ReportRow } from "@/types/reports.types";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportRowsAsCsv(rows: ReportRow[], fields: ReportField[], filename = "relatorio.csv") {
  const headers = fields.map((f) => f.label).join(";");
  const body = rows
    .map((r) => fields.map((f) => escapeCsv(r[f.id])).join(";"))
    .join("\n");
  const csv = `${headers}\n${body}`;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRowsAsJson(rows: ReportRow[], filename = "relatorio.json") {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
