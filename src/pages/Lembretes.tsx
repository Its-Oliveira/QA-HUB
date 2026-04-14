import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PriorityBadge from "@/components/PriorityBadge";
import { Plus, Trash2, CheckCircle, Pencil, X, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Category = "Criar Card" | "Tarefa de Teste" | "Revisão" | "Outro";
const categories: Category[] = ["Criar Card", "Tarefa de Teste", "Revisão", "Outro"];

const priorityBorderColor: Record<Priority, string> = {
  HIGH: "border-l-destructive",
  MEDIUM: "border-l-warning",
  LOW: "border-l-primary",
};

const emptyForm = { title: "", description: "", category: "Outro" as Category, priority: "MEDIUM" as Priority, jiraCardRef: "" };

const Lembretes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const { data: rawReminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data } = await supabase.from("reminders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const activeReminders = rawReminders.filter((r) => !r.completed);
  const completedReminders = rawReminders.filter((r) => r.completed);
  const reminders = showCompleted ? completedReminders : activeReminders;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const saveForm = async () => {
    if (!form.title) {
      toast.error("Preencha o título");
      return;
    }
    const payload = {
      title: form.title, description: form.description, due_date: new Date().toISOString(),
      category: form.category, priority: form.priority, jira_card_ref: form.jiraCardRef || null,
      created_by: user?.email || null,
    };
    if (editingId) {
      await supabase.from("reminders").update(payload).eq("id", editingId);
    } else {
      await supabase.from("reminders").insert(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    closeModal();
    toast.success(editingId ? "Lembrete atualizado" : "Lembrete criado");
  };

  const toggleComplete = async (id: string, current: boolean) => {
    const updates: any = { completed: !current };
    updates.completed_at = !current ? new Date().toISOString() : null;
    await supabase.from("reminders").update(updates).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
  };

  const startEdit = (r: any) => {
    setForm({ title: r.title, description: r.description || "", category: r.category, priority: r.priority, jiraCardRef: r.jira_card_ref || "" });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    setConfirmDeleteId(null);
    toast.success("Lembrete excluído");
  };

  const isOverdue = (_r: any) => false; // No longer relevant without due dates

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Lembretes</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground font-medium">
          <Plus className="w-3 h-3" /> Novo Lembrete
        </button>
      </div>

      {/* Empty state */}
      {reminders.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Nenhum lembrete ainda</p>
            <p className="text-muted-foreground text-sm">Crie o primeiro!</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium">
            <Plus className="w-4 h-4" /> Novo Lembrete
          </button>
        </div>
      )}

      {/* Reminder list */}
      <div className="space-y-3">
        {reminders.map((r) => (
          <div
            key={r.id}
            className={`bg-card border border-border rounded-xl p-4 border-l-4 transition-all ${
              r.completed ? `border-l-success opacity-60` : priorityBorderColor[r.priority as Priority] || "border-l-primary"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <p className={`text-sm font-semibold text-foreground ${r.completed ? "line-through" : ""}`}>
                    {r.title}
                  </p>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <PriorityBadge priority={r.priority} />
                  </div>
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
                )}
                {/* Metadata pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">{r.category}</span>
                  {r.jira_card_ref && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-mono">{r.jira_card_ref}</span>
                  )}
                  {(r as any).created_by && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      {(r as any).created_by.split("@")[0]}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Criado em: {new Date(r.created_at).toLocaleDateString("pt-BR")} às {new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleComplete(r.id, r.completed)}
                  className={`p-1.5 rounded-md transition-colors ${r.completed ? "text-success hover:text-success/80" : "text-muted-foreground hover:text-success"}`}
                  title={r.completed ? "Desmarcar" : "Concluir"}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={() => startEdit(r)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDeleteId === r.id ? (
                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-[11px] text-muted-foreground">Tem certeza?</span>
                    <button onClick={() => handleDelete(r.id)} className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground font-medium">Sim</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground">Não</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(r.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="bg-[#1a1d25] border-[#2a2d38] rounded-xl max-w-md p-0 gap-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d38]">
            <h2 className="text-base font-semibold text-foreground">{editingId ? "Editar Lembrete" : "Novo Lembrete"}</h2>
            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título"
              className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição"
              className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>
            <input
              value={form.jiraCardRef}
              onChange={(e) => setForm({ ...form, jiraCardRef: e.target.value })}
              placeholder="Ref Jira (opcional)"
              className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={saveForm}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {editingId ? "Salvar Alterações" : "Criar Lembrete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lembretes;
