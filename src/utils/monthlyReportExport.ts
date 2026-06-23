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

const fmtDateSafe = (v: string | null | undefined) =>
  v ? fmtDate(new Date(v)) : "—";

function summaryRows(d: MonthlyReportData) {
  const bc = d.bugCliente;
  return [
    { Indicador: "Período", Valor: `${fmtDate(parseISO(d.startDate))} a ${fmtDate(parseISO(d.endDate))}` },
    { Indicador: "Fluxo completo", Valor: d.flowCompleted.count ?? "—" },
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

function bugQARows(d: MonthlyReportData) {
  return (d.bugQA.issues || []).map((i) => ({
    Chave: i.key,
    Título: i.summary,
    Relator: i.reporter,
    Criado: fmtDateSafe(i.created),
  }));
}

function bugClienteCancelledRows(d: MonthlyReportData) {
  return (d.bugCliente.cancelledIssues || []).map((i) => ({
    Chave: i.key,
    Título: i.summary,
    Relator: i.reporter,
    Criado: fmtDateSafe(i.created),
    Cancelado: fmtDateSafe(i.resolutiondate),
  }));
}

function flowRows(d: MonthlyReportData) {
  return (d.flowCompleted.issues || []).map((i) => ({
    Chave: i.key,
    Título: i.summary,
    Relator: i.reporter,
    Criado: fmtDateSafe(i.created),
    Concluído: fmtDateSafe(i.completedAt),
  }));
}

function fileStamp() {
  return fmtDate(new Date()).replace(/\//g, "-");
}

async function captureChart(selector: string): Promise<string | null> {
  try {
    const wrapper = document.querySelector<HTMLElement>(`[data-export-chart="${selector}"]`);
    if (!wrapper) return null;
    const svg = wrapper.querySelector("svg");
    if (!svg) return null;
    const clone = svg.cloneNode(true) as SVGElement;
    const w = (svg as SVGSVGElement).clientWidth || 400;
    const h = (svg as SVGSVGElement).clientHeight || 200;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load"));
      img.src = svg64;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function exportMonthlyAsXlsx(d: MonthlyReportData) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows(d)), "Resumo");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(breakdownRows(d)), "BUG CLIENTE por Relator");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bugClienteCancelledRows(d)), "BUG CLIENTE cancelados");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bugQARows(d)), "BUG QA criados");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flowRows(d)), "Fluxo completo");
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
    `# BUG CLIENTE POR RELATOR\n${toCsv(breakdownRows(d))}\n\n` +
    `# BUG CLIENTE CANCELADOS\n${toCsv(bugClienteCancelledRows(d))}\n\n` +
    `# BUG QA CRIADOS\n${toCsv(bugQARows(d))}\n\n` +
    `# FLUXO COMPLETO\n${toCsv(flowRows(d))}`;
  downloadBlob(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `relatorio-mensal-qa-${fileStamp()}.csv`
  );
}

export async function exportMonthlyAsPdf(d: MonthlyReportData) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text("Relatório Mensal de QA", 14, 16);
  doc.setFontSize(10);
  doc.text(
    `Período: ${fmtDate(parseISO(d.startDate))} a ${fmtDate(parseISO(d.endDate))}`,
    14,
    23
  );
  doc.text(`Gerado em: ${fmtDateTime(new Date())}`, 14, 28);

  // Resumo executivo
  autoTable(doc, {
    startY: 34,
    head: [["Indicador", "Valor"]],
    body: summaryRows(d).map((r) => [r.Indicador, String(r.Valor)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  // ---------- BUG CLIENTE ----------
  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.text("BUG CLIENTE", 14, y);
  y += 4;

  // Capturar gráficos
  const [pieImg, barImg] = await Promise.all([captureChart("pie"), captureChart("bar")]);
  const chartH = 50;
  const chartW = (pageW - 14 * 2 - 6) / 2;
  if (pieImg || barImg) {
    if (pieImg) doc.addImage(pieImg, "PNG", 14, y + 2, chartW, chartH);
    if (barImg) doc.addImage(barImg, "PNG", 14 + chartW + 6, y + 2, chartW, chartH);
    y += chartH + 6;
  }

  doc.setFontSize(10);
  doc.text("Detalhamento por Relator", 14, y + 4);
  autoTable(doc, {
    startY: y + 6,
    head: [["Relator", "Criados", "Cancelados", "% cancelamento"]],
    body: breakdownRows(d).map((r) => [r.Relator, r.Criados, r.Cancelados, r["% cancelamento"]]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [76, 110, 245] },
  });

  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(10);
  doc.text("BUG CLIENTE — Cards cancelados", 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Chave", "Título", "Relator", "Criado", "Cancelado"]],
    body: bugClienteCancelledRows(d).map((r) => [r.Chave, r.Título, r.Relator, r.Criado, r.Cancelado]),
    styles: { fontSize: 8, cellWidth: "wrap" },
    columnStyles: { 1: { cellWidth: 70 } },
    headStyles: { fillColor: [250, 82, 82] },
  });

  // ---------- BUG QA ----------
  doc.addPage();
  doc.setFontSize(12);
  doc.text("BUG QA", 14, 16);
  doc.setFontSize(10);
  doc.text(`${d.bugQA.totalCreated ?? 0} cards criados no período.`, 14, 22);
  autoTable(doc, {
    startY: 26,
    head: [["Chave", "Título", "Relator", "Criado"]],
    body: bugQARows(d).map((r) => [r.Chave, r.Título, r.Relator, r.Criado]),
    styles: { fontSize: 8 },
    columnStyles: { 1: { cellWidth: 90 } },
    headStyles: { fillColor: [255, 146, 43] },
  });

  // ---------- Fluxo completo ----------
  doc.addPage();
  doc.setFontSize(12);
  doc.text("Fluxo completo", 14, 16);
  doc.setFontSize(10);
  doc.text(
    `${d.flowCompleted.count ?? 0} cards concluíram o fluxo${
      typeof d.flowCompleted.scanned === "number"
        ? ` (${d.flowCompleted.scanned} cards Done analisados)`
        : ""
    }.`,
    14,
    22
  );
  autoTable(doc, {
    startY: 26,
    head: [["Chave", "Título", "Relator", "Criado", "Concluído"]],
    body: flowRows(d).map((r) => [r.Chave, r.Título, r.Relator, r.Criado, r.Concluído]),
    styles: { fontSize: 8 },
    columnStyles: { 1: { cellWidth: 75 } },
    headStyles: { fillColor: [64, 192, 87] },
  });

  // Rodapé
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
  lines.push(`Período: ${fmtDate(parseISO(d.startDate))} a ${fmtDate(parseISO(d.endDate))}`);
  lines.push(`Gerado em: ${fmtDateTime(new Date())}`);
  lines.push("");
  lines.push(`• Fluxo completo: ${d.flowCompleted.count ?? "—"}`);
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
