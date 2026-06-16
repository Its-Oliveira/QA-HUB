import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { WeeklyReportData } from "@/types/reports.types";
import { WEEKLY_STATUS_ORDER } from "@/types/reports.types";
import { buildReportText, fmtDate, fmtDateTime } from "./reportFormatters";
import { formatUrlForExport } from "./jiraLinkUtils";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildSummaryRows(data: WeeklyReportData) {
  return WEEKLY_STATUS_ORDER.map((s) => ({
    Status: s,
    "Cards Antigos": data.oldCards.byStatus[s]?.length || 0,
    "Cards dessa Semana": data.thisWeekCards.byStatus[s]?.length || 0,
    Total:
      (data.oldCards.byStatus[s]?.length || 0) +
      (data.thisWeekCards.byStatus[s]?.length || 0),
  }));
}

function buildDetailRows(data: WeeklyReportData) {
  const rows: Array<Record<string, string>> = [];
  const push = (grupo: "Antigo" | "Semana", byStatus: Record<string, any[]>) => {
    for (const st of WEEKLY_STATUS_ORDER) {
      const items = byStatus[st];
      if (!items) continue;
      for (const i of items) {
        rows.push({
          Grupo: grupo,
          Status: st,
          "Issue Key": i.key,
          URL: formatUrlForExport(i.url, i.issuelinks),
          "Produto BIM": i.isBim ? "Sim" : "Não",
          "Título do Card": i.summary,
        });
      }
    }
  };
  push("Antigo", data.oldCards.byStatus);
  push("Semana", data.thisWeekCards.byStatus);
  return rows;
}

export function exportWeeklyAsXlsx(data: WeeklyReportData) {
  const wb = XLSX.utils.book_new();
  const wsResumo = XLSX.utils.json_to_sheet(buildSummaryRows(data));
  const wsDet = XLSX.utils.json_to_sheet(buildDetailRows(data));
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
  XLSX.utils.book_append_sheet(wb, wsDet, "Detalhamento");
  XLSX.writeFile(wb, `relatorio-semanal-qa-${fmtDate(new Date()).replace(/\//g, "-")}.xlsx`);
}

export function exportWeeklyAsCsv(data: WeeklyReportData) {
  const summary = buildSummaryRows(data);
  const det = buildDetailRows(data);
  const toCsv = (rows: any[]) => {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      headers.join(";"),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(";")),
    ].join("\n");
  };
  const csv = `# RESUMO\n${toCsv(summary)}\n\n# DETALHAMENTO\n${toCsv(det)}`;
  downloadBlob(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `relatorio-semanal-qa-${fmtDate(new Date()).replace(/\//g, "-")}.csv`
  );
}

export function exportWeeklyAsPdf(data: WeeklyReportData) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Relatório Semanal QA — BUG WEB", 14, 16);
  doc.setFontSize(10);
  doc.text(`Período: ${fmtDate(data.weekStart)} a ${fmtDate(data.weekEnd)}`, 14, 23);
  doc.text(`Gerado em: ${fmtDateTime(new Date())}`, 14, 28);
  doc.text(`Total de cards em aberto: ${data.totalOpen}`, 14, 33);

  autoTable(doc, {
    startY: 38,
    head: [["Status", "Cards Antigos", "Cards dessa Semana", "Total"]],
    body: buildSummaryRows(data).map((r) => [
      r.Status,
      r["Cards Antigos"],
      r["Cards dessa Semana"],
      r.Total,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text("Detalhamento — Cards Antigos em Aberto", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y + 2,
    head: [["Status", "Issue", "URL", "BIM"]],
    body: WEEKLY_STATUS_ORDER.flatMap((st) =>
      (data.oldCards.byStatus[st] || []).map((i) => [st, i.key, i.url, i.isBim ? "Sim" : ""])
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text(`Detalhamento — Essa Semana (${fmtDate(data.weekStart)} - ${fmtDate(data.weekEnd)})`, 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Status", "Issue", "URL", "BIM"]],
    body: WEEKLY_STATUS_ORDER.flatMap((st) =>
      (data.thisWeekCards.byStatus[st] || []).map((i) => [st, i.key, i.url, i.isBim ? "Sim" : ""])
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      "QA Hub — OrçaFascio",
      14,
      doc.internal.pageSize.getHeight() - 6
    );
  }
  doc.save(`relatorio-semanal-qa-${fmtDate(new Date()).replace(/\//g, "-")}.pdf`);
}

export async function copyReportAsText(data: WeeklyReportData) {
  const text = buildReportText(data);
  await navigator.clipboard.writeText(text);
}
