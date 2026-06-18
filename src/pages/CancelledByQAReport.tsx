import { useState } from "react";
import { AlertCircle, Copy, FileDown, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { useCancelledByQAReport } from "@/hooks/useCancelledByQAReport";
import CancelledReportHeader from "@/components/qa/cancelled-report/CancelledReportHeader";
import CancelledStatsCards from "@/components/qa/cancelled-report/CancelledStatsCards";
import TopResponsibleCard from "@/components/qa/cancelled-report/TopResponsibleCard";
import CancelledCardsTable from "@/components/qa/cancelled-report/CancelledCardsTable";
import type { CancelledCard } from "@/types/cancelledReport.types";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtBR = (d: Date | null) =>
  d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "—";
const fmtDateTimeBR = (d: Date) =>
  `${fmtBR(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDateField = (iso: string | null) => (iso ? fmtBR(new Date(iso)) : "—");

function fileBase() {
  const now = new Date();
  return `cancelados-qa-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
}

function buildRows(cards: CancelledCard[]) {
  return cards.map((c) => ({
    Chave: c.key,
    Título: c.summary,
    Responsável: c.assigneeDisplayName || "Não atribuído",
    "Data de Resolução": fmtDateField(c.resolutionDate),
    URL: c.jiraUrl,
  }));
}

const CancelledByQAReportPage = () => {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const report = useCancelledByQAReport();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await report.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const rate =
    report.cancellationRate === null
      ? "N/A"
      : `${report.cancellationRate.toFixed(2)}%`;

  const exportCsv = () => {
    const rows = buildRows(report.cancelledCards);
    const headers = ["Chave", "Título", "Responsável", "Data de Resolução", "URL"];
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map((r) => headers.map((h) => esc((r as any)[h])).join(";")).join("\n");
    const footer = `\n\nCancelados;${report.cancelledCount}\nTotais;${report.totalCards}\nTaxa;${rate}`;
    const csv = `${headers.join(";")}\n${body}${footer}`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    const wsDados = XLSX.utils.json_to_sheet(buildRows(report.cancelledCards));
    const resumoRows = [
      { Indicador: "Cancelados no Mês", Valor: report.cancelledCount },
      { Indicador: "Cards Totais no Mês", Valor: report.totalCards },
      { Indicador: "Taxa de Cancelamento", Valor: rate },
      {
        Indicador: "Top Responsável",
        Valor: report.topResponsible
          ? `${report.topResponsible.displayName} (${report.topResponsible.count} · ${report.topResponsible.percentage.toFixed(2)}%)${report.topResponsible.isTied ? " (empate)" : ""}`
          : "—",
      },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumoRows);
    // Negrito no cabeçalho (SheetJS community style)
    const styleHeader = (ws: XLSX.WorkSheet) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[addr]) ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: "EEEEEE" } } };
      }
    };
    styleHeader(wsDados);
    styleHeader(wsResumo);
    XLSX.utils.book_append_sheet(wb, wsDados, "Dados");
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
    XLSX.writeFile(wb, `${fileBase()}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Relatório QA — Cancelados pelo QA", 14, 16);
    doc.setFontSize(10);
    doc.text(
      `Período: ${fmtBR(report.reportPeriod.start)} até ${fmtBR(report.reportPeriod.end)}`,
      14,
      23
    );
    doc.text(`Gerado em: ${fmtDateTimeBR(new Date())}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [["Indicador", "Valor"]],
      body: [
        ["Cancelados no Mês", String(report.cancelledCount)],
        ["Cards Totais no Mês", String(report.totalCards)],
        ["Taxa de Cancelamento", rate],
        [
          "Top Responsável",
          report.topResponsible
            ? `${report.topResponsible.displayName} (${report.topResponsible.count} · ${report.topResponsible.percentage.toFixed(2)}%)${report.topResponsible.isTied ? " (empate)" : ""}`
            : "—",
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [76, 110, 245] },
    });

    const y = (doc as any).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: y,
      head: [["Chave", "Título", "Responsável", "Data Resolução"]],
      body: report.cancelledCards.map((c) => [
        c.key,
        c.summary,
        c.assigneeDisplayName || "Não atribuído",
        fmtDateField(c.resolutionDate),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 110, 245] },
    });

    doc.save(`${fileBase()}.pdf`);
  };

  const copyTable = async () => {
    const headers = ["Chave", "Título", "Responsável", "Data de Resolução", "URL"];
    const lines = [headers.join("\t")];
    for (const c of report.cancelledCards) {
      lines.push(
        [
          c.key,
          c.summary,
          c.assigneeDisplayName || "Não atribuído",
          fmtDateField(c.resolutionDate),
          c.jiraUrl,
        ].join("\t")
      );
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copiado!", duration: 2000 });
  };

  return (
    <div className="space-y-6">
      <CancelledReportHeader
        start={report.reportPeriod.start}
        end={report.reportPeriod.end}
        onRefresh={handleRefresh}
        isLoading={report.isLoading || refreshing}
      />

      {report.isLoading && report.cancelledCards.length === 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
        </div>
      ) : report.isError ? (
        <div className="bg-card border border-destructive/40 rounded-xl p-6 text-center">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive mb-3">
            {report.error?.message || "Erro ao carregar relatório."}
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
          >
            <RefreshCw className="w-3 h-3" /> Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <CancelledStatsCards
            data={{
              cancelledCount: report.cancelledCount,
              totalCards: report.totalCards,
              cancellationRate: report.cancellationRate,
              topResponsible: report.topResponsible,
            }}
          />

          <TopResponsibleCard
            topResponsible={report.topResponsible}
            hasAnyCancelled={report.cancelledCount > 0}
          />

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80"
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
            <button
              onClick={exportXlsx}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80"
            >
              <FileSpreadsheet className="w-3 h-3" /> Excel
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80"
            >
              <FileDown className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={copyTable}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80"
            >
              <Copy className="w-3 h-3" /> Copiar
            </button>
          </div>

          <CancelledCardsTable cards={report.cancelledCards} />
        </>
      )}
    </div>
  );
};

export default CancelledByQAReportPage;
