import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthlyReportData } from "@/hooks/useMonthlyReport";
import { fmtDate, fmtDateTime } from "./reportFormatters";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseISO(s: string) {
  return new Date(s + "T00:00:00");
}

function summaryRows(d: MonthlyReportData) {
  const bc = d.bugCliente;
  return [
    { Indicador: "Período", Valor: `${fmtDate(parseISO(d.startDate))} a ${fmtDate(parseISO(d.endDate))}` },
    { Indicador: "Fluxo completo (7 etapas)", Valor: d.flowCompleted.count ?? "—" },
    { Indicador: "BUG QA criados", Valor: d.bugQA.totalCreated ?? "—" },
    { Indicador: "BUG CLIENTE criados", Valor: bc.totalCreated ?? "—" },
    { Indicador: "BUG CLIENTE cancelados", Valor: bc.totalCancelled ?? "—" },
    {
      Indicador: "BUG CLIENTE — taxa cancelamento",
      Valor: bc.cancellationRate != null ? `${bc.cancellationRate.toFixed(1)}%` : "—",
    },
  ];
}

function breakdownRows(d: MonthlyReportData) {
  return (d.bugCliente.breakdown || []).map((r) => ({
    Relator: r.reporter,
    Criados: r.created,
    Cancelados: r.cancelled,
    "% cancelamento": `${r.rate.toFixed(1)}%`,
  }));
}

function fileStamp() {
  return fmtDate(new Date()).replace(/\//g, "-");
}

export function exportMonthlyAsXlsx(d: MonthlyReportData) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows(d)), "Resumo");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(breakdownRows(d)),
    "BUG CLIENTE por Relator"
  );
  XLSX.writeFile(wb, `relatorio-mensal-qa-${fileStamp()}.xlsx`);
}

export function exportMonthlyAsCsv(d: MonthlyReportData) {
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
    `# RESUMO\n${toCsv(summaryRows(d))}\n\n` +
    `# BUG CLIENTE POR RELATOR\n${toCsv(breakdownRows(d))}`;
  downloadBlob(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `relatorio-mensal-qa-${fileStamp()}.csv`
  );
}

export function exportMonthlyAsPdf(d: MonthlyReportData) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Relatório Mensal de QA", 14, 16);
  doc.setFontSize(10);
  doc.text(
    `Período: ${fmtDate(parseISO(d.startDate))} a ${fmtDate(parseISO(d.endDate))}`,
    14,
    23
  );
  doc.text(`Gerado em: ${fmtDateTime(new Date())}`, 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [["Indicador", "Valor"]],
    body: summaryRows(d).map((r) => [r.Indicador, String(r.Valor)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text("BUG CLIENTE — Detalhamento por Relator", 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Relator", "Criados", "Cancelados", "% cancelamento"]],
    body: breakdownRows(d).map((r) => [
      r.Relator,
      r.Criados,
      r.Cancelados,
      r["% cancelamento"],
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text("QA Hub — OrçaFascio", 14, doc.internal.pageSize.getHeight() - 6);
  }
  doc.save(`relatorio-mensal-qa-${fileStamp()}.pdf`);
}

export async function copyMonthlyReportAsText(d: MonthlyReportData) {
  const bc = d.bugCliente;
  const lines: string[] = [];
  lines.push("RELATÓRIO MENSAL DE QA");
  lines.push(
    `Período: ${fmtDate(parseISO(d.startDate))} a ${fmtDate(parseISO(d.endDate))}`
  );
  lines.push(`Gerado em: ${fmtDateTime(new Date())}`);
  lines.push("");
  lines.push(`• Fluxo completo (7 etapas): ${d.flowCompleted.count ?? "—"}`);
  lines.push(`• BUG QA criados: ${d.bugQA.totalCreated ?? "—"}`);
  lines.push(`• BUG CLIENTE criados: ${bc.totalCreated ?? "—"}`);
  lines.push(`• BUG CLIENTE cancelados: ${bc.totalCancelled ?? "—"}`);
  lines.push(
    `• Taxa de cancelamento: ${bc.cancellationRate != null ? bc.cancellationRate.toFixed(1) + "%" : "—"}`
  );
  lines.push("");
  lines.push("BUG CLIENTE — POR RELATOR");
  if (!bc.breakdown || bc.breakdown.length === 0) {
    lines.push("  (sem dados)");
  } else {
    bc.breakdown.forEach((r) =>
      lines.push(
        `  ${r.reporter} — criados: ${r.created} | cancelados: ${r.cancelled} | ${r.rate.toFixed(1)}%`
      )
    );
  }
  await navigator.clipboard.writeText(lines.join("\n"));
}
