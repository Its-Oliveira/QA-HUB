import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type AutoStatus = "Automatizado" | "Em Progresso" | "Pendente";
const statusColors: Record<AutoStatus, string> = {
  Automatizado: "bg-success/20 text-success",
  "Em Progresso": "bg-warning/20 text-warning",
  Pendente: "bg-muted text-muted-foreground",
};

const Automacao = () => {
  const queryClient = useQueryClient();
  const { data: entries = [] } = useQuery({
    queryKey: ["automation_tracker"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_tracker").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const addEntry = async () => {
    await supabase.from("automation_tracker").insert({ feature: "", test_file: "", status: "Pendente", last_run_date: "", notes: "" });
    queryClient.invalidateQueries({ queryKey: ["automation_tracker"] });
  };

  const updateField = async (id: string, field: "feature" | "test_file" | "status" | "last_run_date" | "notes", value: string) => {
    await supabase.from("automation_tracker").update({ [field]: value } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["automation_tracker"] });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from("automation_tracker").delete().eq("id", deleteId);
    queryClient.invalidateQueries({ queryKey: ["automation_tracker"] });
    setDeleteId(null);
    toast.success("Entrada excluída");
  };

  const automated = entries.filter((e) => e.status === "Automatizado").length;
  const total = entries.length;
  const coverage = total > 0 ? Math.round((automated / total) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 lg:flex-nowrap lg:gap-0">
        <h1 className="text-2xl font-semibold text-foreground">Automação Cypress</h1>
        <button onClick={addEntry} className="flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-md text-xs lg:min-h-0 bg-primary text-primary-foreground">
          <Plus className="w-3 h-3" /> Nova Entrada
        </button>
      </div>

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total de Casos</p>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Automatizados</p>
          <p className="text-2xl font-bold text-success">{automated}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cobertura</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-primary">{coverage}%</p>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${coverage}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 lg:flex-nowrap lg:gap-0">
          <h2 className="text-sm font-semibold text-foreground">Commits do GitHub</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">Configure PAT em Configurações</span>
        </div>
        <p className="text-xs text-muted-foreground">Conecte seu repositório GitHub nas configurações para ver commits recentes.</p>
      </div>

      <h2 className="text-sm font-semibold text-foreground mb-3">Tracker de Automação</h2>
      <div className="max-w-full bg-card border border-border rounded-lg overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm lg:min-w-0">
          <thead>
            <tr className="border-b border-border">
               <th className="sticky left-0 z-10 bg-card text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider lg:static lg:bg-transparent">Funcionalidade</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Arquivo de Teste</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Última Execução</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Notas</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Nenhuma entrada. Clique em "Nova Entrada" para adicionar.</td></tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                 <td className="sticky left-0 z-10 bg-card px-4 py-3 lg:static lg:bg-transparent">
                  <input value={entry.feature || ""} onChange={(e) => updateField(entry.id, "feature", e.target.value)} className="bg-transparent text-foreground text-base lg:text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary rounded px-1" />
                </td>
                <td className="px-4 py-3">
                  <input value={entry.test_file || ""} onChange={(e) => updateField(entry.id, "test_file", e.target.value)} className="bg-transparent text-muted-foreground text-base lg:text-xs font-mono w-full focus:outline-none focus:ring-1 focus:ring-primary rounded px-1" />
                </td>
                <td className="px-4 py-3">
                  <select value={entry.status} onChange={(e) => updateField(entry.id, "status", e.target.value)} className={`text-base lg:text-[10px] font-semibold px-2 py-1 rounded border-0 ${statusColors[entry.status as AutoStatus] || ""}`}>
                    <option value="Automatizado">Automatizado</option>
                    <option value="Em Progresso">Em Progresso</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input type="date" value={entry.last_run_date || ""} onChange={(e) => updateField(entry.id, "last_run_date", e.target.value)} className="bg-transparent text-muted-foreground text-base lg:text-xs focus:outline-none focus:ring-1 focus:ring-primary rounded px-1" />
                </td>
                <td className="px-4 py-3">
                  <input value={entry.notes || ""} onChange={(e) => updateField(entry.id, "notes", e.target.value)} className="bg-transparent text-muted-foreground text-base lg:text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary rounded px-1" placeholder="—" />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setDeleteId(entry.id)} className="max-lg:flex max-lg:h-11 max-lg:w-11 max-lg:items-center max-lg:justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
         <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] overflow-y-auto lg:max-h-none lg:w-full lg:overflow-visible">
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir esta entrada?</p>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm rounded-md bg-secondary text-foreground">Cancelar</button>
            <button onClick={confirmDelete} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground">Excluir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Automacao;
