import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CancelledReportData } from "@/hooks/useCancelledReport";
import { fmtDate, fmtDateTime } from "./reportFormatters";
import { formatUrlForExport } from "./jiraLinkUtils";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildSummaryRows(data: CancelledReportData) {
  return [
    { Indicador: "Cancelados pelo QA", Valor: data.totalCancelled },
    { Indicador: "Total criados no mês", Valor: data.totalMonth },
    {
      Indicador: "Taxa de cancelamento (%)",
      Valor: `${data.cancellationRate.toFixed(1)}%`,
    },
  ];
}

function buildRankingRows(data: CancelledReportData) {
  return data.ranking.map((r, idx) => ({
    "#": idx + 1,
    Relator: r.reporter,
    Cancelados: r.count,
  }));
}

function buildDetailRows(data: CancelledReportData) {
  return data.issues.map((i) => ({
    Card: i.key,
    URL: formatUrlForExport(i.url, i.issuelinks),
    Resumo: i.summary,
    Relator: i.reporter || "Sem relator",
    Criado: i.created ? fmtDate(new Date(i.created)) : "",
  }));
}

function fileStamp() {
  return fmtDate(new Date()).replace(/\//g, "-");
}

export function exportCancelledAsXlsx(data: CancelledReportData) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(buildSummaryRows(data)),
    "Resumo"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(buildRankingRows(data)),
    "Ranking"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(buildDetailRows(data)),
    "Detalhamento"
  );
  XLSX.writeFile(wb, `cancelados-qa-${fileStamp()}.xlsx`);
}

export function exportCancelledAsCsv(data: CancelledReportData) {
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
  const csv =
    `# RESUMO\n${toCsv(buildSummaryRows(data))}\n\n` +
    `# RANKING DE RELATORES\n${toCsv(buildRankingRows(data))}\n\n` +
    `# DETALHAMENTO\n${toCsv(buildDetailRows(data))}`;
  downloadBlob(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `cancelados-qa-${fileStamp()}.csv`
  );
}

export function exportCancelledAsPdf(data: CancelledReportData) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Relatório Mensal QA — Cards Cancelados pelo QA", 14, 16);
  doc.setFontSize(10);
  doc.text(
    `Período: ${fmtDate(data.monthStart)} a ${fmtDate(data.monthEnd)}`,
    14,
    23
  );
  doc.text(`Gerado em: ${fmtDateTime(new Date())}`, 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [["Indicador", "Valor"]],
    body: buildSummaryRows(data).map((r) => [r.Indicador, String(r.Valor)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text("Ranking de Relatores", 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["#", "Relator", "Cancelados"]],
    body: buildRankingRows(data).map((r) => [r["#"], r.Relator, r.Cancelados]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text("Detalhamento dos Cards", 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Card", "URL", "Resumo", "Relator", "Criado"]],
    body: buildDetailRows(data).map((r) => [
      r.Card,
      r.URL,
      r.Resumo,
      r.Relator,
      r.Criado,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 110, 245] },
    columnStyles: { 2: { cellWidth: 70 } },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text("QA Hub — OrçaFascio", 14, doc.internal.pageSize.getHeight() - 6);
  }
  doc.save(`cancelados-qa-${fileStamp()}.pdf`);
}

export async function copyCancelledReportAsText(data: CancelledReportData) {
  const lines: string[] = [];
  lines.push("RELATÓRIO MENSAL — CARDS CANCELADOS PELO QA");
  lines.push(
    `Período: ${fmtDate(data.monthStart)} a ${fmtDate(data.monthEnd)}`
  );
  lines.push(`Gerado em: ${fmtDateTime(new Date())}`);
  lines.push("");
  lines.push(`• Cancelados pelo QA: ${data.totalCancelled}`);
  lines.push(`• Total criados no mês: ${data.totalMonth}`);
  lines.push(`• Taxa de cancelamento: ${data.cancellationRate.toFixed(1)}%`);
  lines.push("");
  lines.push("RANKING DE RELATORES");
  if (data.ranking.length === 0) {
    lines.push("  (sem dados)");
  } else {
    data.ranking.forEach((r, idx) =>
      lines.push(`  #${idx + 1} ${r.reporter} — ${r.count}`)
    );
  }
  lines.push("");
  lines.push("DETALHAMENTO");
  if (data.issues.length === 0) {
    lines.push("  (nenhum card)");
  } else {
    for (const i of data.issues) {
      const url = formatUrlForExport(i.url, i.issuelinks);
      const created = i.created ? fmtDate(new Date(i.created)) : "—";
      lines.push(
        `  ${i.key} — ${url} — ${i.summary} — ${i.reporter || "Sem relator"} — ${created}`
      );
    }
  }
  await navigator.clipboard.writeText(lines.join("\n"));
}
