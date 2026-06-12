import { ListChecks, RefreshCw, AlertCircle, Inbox } from "lucide-react";
import { useWeeklyReport } from "@/hooks/useWeeklyReport";
import ReportCard from "@/components/Reports/ReportCard";
import WeeklyOpenCardsReport from "@/components/Reports/WeeklyOpenCardsReport";
import ReportExportBar from "@/components/Reports/ReportExportBar";

const ReportsPage = () => {
  const weekly = useWeeklyReport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Relatórios QA</h1>
        <p className="text-xs text-muted-foreground">
          Selecione um relatório para gerar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportCard
          Icon={ListChecks}
          title="Cards em Aberto — Semana Atual"
          description="Visão geral de todos os cards abertos no Jira, separados por semana de criação e status."
          onGenerate={weekly.generate}
          isLoading={weekly.isLoading}
        />
      </div>

      {weekly.isLoading && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {!weekly.isLoading && weekly.error && (
        <div className="bg-card border border-destructive/40 rounded-xl p-6 text-center">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive mb-3">{weekly.error}</p>
          <button
            onClick={weekly.generate}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
          >
            <RefreshCw className="w-3 h-3" /> Tentar novamente
          </button>
        </div>
      )}

      {!weekly.isLoading && !weekly.error && weekly.data && weekly.data.totalOpen === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum card em aberto encontrado para este período.</p>
        </div>
      )}

      {!weekly.isLoading && !weekly.error && weekly.data && weekly.data.totalOpen > 0 && (
        <div className="space-y-3">
          <ReportExportBar data={weekly.data} />
          <WeeklyOpenCardsReport data={weekly.data} />
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
