import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PriorityBadge from "@/components/PriorityBadge";
import { Plus, Trash2, Check, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Category = "Criar Card" | "Tarefa de Teste" | "Revisão" | "Outro";
const categories: Category[] = ["Criar Card", "Tarefa de Teste", "Revisão", "Outro"];

const emptyForm = { title: "", description: "", dueDate: "", category: "Outro" as Category, priority: "MEDIUM" as Priority, jiraCardRef: "" };

const Lembretes = () => {
  const queryClient = useQueryClient();
  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data } = await supabase.from("reminders").select("*").order("due_date", { ascending: true });
      return data || [];
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const saveForm = async () => {
    if (!form.title || !form.dueDate) return;
    if (editingId) {
      await supabase.from("reminders").update({
        title: form.title, description: form.description, due_date: new Date(form.dueDate).toISOString(),
        category: form.category, priority: form.priority, jira_card_ref: form.jiraCardRef || null,
      }).eq("id", editingId);
    } else {
      await supabase.from("reminders").insert({
        title: form.title, description: form.description, due_date: new Date(form.dueDate).toISOString(),
        category: form.category, priority: form.priority, jira_card_ref: form.jiraCardRef || null,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    toast.success(editingId ? "Lembrete atualizado" : "Lembrete criado");
  };

  const toggleComplete = async (id: string, current: boolean) => {
    await supabase.from("reminders").update({ completed: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
  };

  const startEdit = (r: any) => {
    const dt = new Date(r.due_date);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ title: r.title, description: r.description || "", dueDate: local, category: r.category, priority: r.priority, jiraCardRef: r.jira_card_ref || "" });
    setEditingId(r.id);
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from("reminders").delete().eq("id", deleteId);
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    setDeleteId(null);
    toast.success("Lembrete excluído");
  };

  const isOverdue = (r: any) => !r.completed && new Date(r.due_date) < new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Lembretes</h1>
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(!showForm); }} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground">
          <Plus className="w-3 h-3" /> Novo Lembrete
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" />
          <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            <option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option>
          </select>
          <input value={form.jiraCardRef} onChange={(e) => setForm({ ...form, jiraCardRef: e.target.value })} placeholder="Ref Jira (opcional)" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" />
          <button onClick={saveForm} className="col-span-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium">{editingId ? "Salvar Alterações" : "Adicionar"}</button>
        </div>
      )}

      <div className="space-y-2">
        {reminders.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhum lembrete ainda. Clique em "Novo Lembrete" para começar.</p>
          </div>
        )}
        {reminders.map((r) => (
          <div key={r.id} className={`bg-card border rounded-lg p-4 flex items-center gap-4 transition-opacity ${r.completed ? "opacity-40" : ""} ${isOverdue(r) ? "border-destructive" : "border-border"}`}>
            <button onClick={() => toggleComplete(r.id, r.completed)} className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${r.completed ? "bg-success border-success" : "border-border"}`}>
              {r.completed && <Check className="w-3 h-3 text-success-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium text-foreground ${r.completed ? "line-through" : ""}`}>{r.title}</p>
              <p className="text-xs text-muted-foreground truncate">{r.description}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">{r.category}</span>
            <PriorityBadge priority={r.priority} />
            <span className={`text-xs ${isOverdue(r) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {new Date(r.due_date).toLocaleDateString("pt-BR")} {new Date(r.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {r.jira_card_ref && <span className="text-[10px] text-primary font-mono">{r.jira_card_ref}</span>}
            <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => setDeleteId(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este lembrete?</p>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm rounded-md bg-secondary text-foreground">Cancelar</button>
            <button onClick={confirmDelete} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground">Excluir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lembretes;
