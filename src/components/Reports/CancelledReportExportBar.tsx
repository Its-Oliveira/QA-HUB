import { useState } from "react";
import { FileText, FileSpreadsheet, FileDown, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { CancelledReportData } from "@/hooks/useCancelledReport";
import {
  copyCancelledReportAsText,
  exportCancelledAsCsv,
  exportCancelledAsPdf,
  exportCancelledAsXlsx,
} from "@/utils/cancelledReportExport";

const CancelledReportExportBar = ({ data }: { data: CancelledReportData }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyCancelledReportAsText(data);
      setCopied(true);
      toast.success("Relatório copiado como texto.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar.");
    }
  };

  const btn =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-xs hover:bg-accent transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => exportCancelledAsPdf(data)} className={btn}>
        <FileText className="w-3 h-3" /> Exportar PDF
      </button>
      <button onClick={() => exportCancelledAsXlsx(data)} className={btn}>
        <FileSpreadsheet className="w-3 h-3" /> Exportar Excel
      </button>
      <button onClick={() => exportCancelledAsCsv(data)} className={btn}>
        <FileDown className="w-3 h-3" /> Exportar CSV
      </button>
      <button onClick={handleCopy} className={btn}>
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copiado" : "Copiar como texto"}
      </button>
    </div>
  );
};

export default CancelledReportExportBar;
