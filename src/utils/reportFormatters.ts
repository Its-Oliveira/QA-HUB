import type { WeeklyReportData } from "@/types/reports.types";
import { WEEKLY_STATUS_ORDER } from "@/types/reports.types";
import { formatUrlForExport } from "./jiraLinkUtils";

export const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const fmtShort = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export const fmtDateTime = (d: Date) =>
  d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function buildReportText(data: WeeklyReportData): string {
  const lines: string[] = [];
  const sep = "────────────────────────────────────────────────────";
  lines.push("RELATÓRIO SEMANAL QA — BUG WEB");
  lines.push(`Período: ${fmtDate(data.weekStart)} a ${fmtDate(data.weekEnd)}`);
  lines.push(`Gerado em: ${fmtDateTime(new Date())}`);
  lines.push(sep);
  lines.push("");
  lines.push(`TOTAL DE CARDS EM ABERTO: ${data.totalOpen}`);
  lines.push("");
  lines.push("BUG WEB");
  lines.push(`  *** Número de Cards Antigos em Aberto: ${data.oldCards.total}`);
  lines.push(
    `  *** Cards dessa semana (${fmtShort(data.weekStart)} - ${fmtShort(data.weekEnd)}): ${data.thisWeekCards.total}`
  );
  for (const st of WEEKLY_STATUS_ORDER) {
    const n = data.thisWeekCards.byStatus[st]?.length || 0;
    lines.push(`      • ${st}: ${n}`);
  }
  lines.push("");
  lines.push("PRODUTOS BIM");
  lines.push(`  *** Número de Cards relacionados a produto BIM em aberto: ${data.bimCards.total}`);
  lines.push("");
  lines.push(sep);
  lines.push("DETALHAMENTO — CARDS ANTIGOS EM ABERTO");
  lines.push("");
  for (const st of WEEKLY_STATUS_ORDER) {
    const items = data.oldCards.byStatus[st];
    if (!items || items.length === 0) continue;
    lines.push(`[${st}]`);
    for (const i of items) lines.push(`  ${formatUrlForExport(i.url, i.issuelinks)}${i.isBim ? "  (OrçaBim)" : ""}`);
    lines.push("");
  }
  lines.push(sep);
  lines.push(
    `DETALHAMENTO — ESSA SEMANA (${fmtDate(data.weekStart)} - ${fmtDate(data.weekEnd)})`
  );
  lines.push("");
  for (const st of WEEKLY_STATUS_ORDER) {
    const items = data.thisWeekCards.byStatus[st];
    if (!items || items.length === 0) continue;
    lines.push(`[${st}]`);
    for (const i of items) lines.push(`  ${formatUrlForExport(i.url, i.issuelinks)}${i.isBim ? "  (OrçaBim)" : ""}`);
    lines.push("");
  }
  return lines.join("\n");
}
