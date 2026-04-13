import { useState } from "react";
import { initialReminders, Reminder, Priority } from "@/data/mockData";
import PriorityBadge from "@/components/PriorityBadge";
import { Plus, Trash2, Check } from "lucide-react";

const categories = ["Criar Card", "Tarefa de Teste", "Revisão", "Outro"] as const;

const Lembretes = () => {
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem("qa-hub-reminders");
    return saved ? JSON.parse(saved) : initialReminders;
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", category: "Outro" as Reminder["category"], priority: "MEDIUM" as Priority, jiraCardRef: "" });

  const save = (updated: Reminder[]) => {
    setReminders(updated);
    localStorage.setItem("qa-hub-reminders", JSON.stringify(updated));
  };

  const addReminder = () => {
    if (!form.title || !form.dueDate) return;
    const newR: Reminder = { ...form, id: Date.now().toString(), completed: false, dueDate: new Date(form.dueDate).toISOString() };
    save([...reminders, newR]);
    setForm({ title: "", description: "", dueDate: "", category: "Other", priority: "MEDIUM", jiraCardRef: "" });
    setShowForm(false);
  };

  const toggleComplete = (id: string) => save(reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  const deleteReminder = (id: string) => save(reminders.filter((r) => r.id !== id));

  const isOverdue = (r: Reminder) => !r.completed && new Date(r.dueDate) < new Date();
  const sorted = [...reminders].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Lembretes</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground">
          <Plus className="w-3 h-3" /> Novo Lembrete
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" />
          <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Reminder["category"] })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
          </select>
          <input value={form.jiraCardRef} onChange={(e) => setForm({ ...form, jiraCardRef: e.target.value })} placeholder="Ref Jira (opcional)" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" />
          <button onClick={addReminder} className="col-span-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium">Adicionar</button>
        </div>
      )}

      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhum lembrete ainda. Clique em "Novo Lembrete" para começar.</p>
          </div>
        )}
        {sorted.map((r) => (
          <div
            key={r.id}
            className={`bg-card border rounded-lg p-4 flex items-center gap-4 transition-opacity ${r.completed ? "opacity-40" : ""} ${isOverdue(r) ? "border-destructive" : "border-border"}`}
          >
            <button onClick={() => toggleComplete(r.id)} className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${r.completed ? "bg-success border-success" : "border-border"}`}>
              {r.completed && <Check className="w-3 h-3 text-success-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium text-foreground ${r.completed ? "line-through" : ""}`}>{r.title}</p>
              <p className="text-xs text-muted-foreground truncate">{r.description}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">{r.category}</span>
            <PriorityBadge priority={r.priority} />
            <span className={`text-xs ${isOverdue(r) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {new Date(r.dueDate).toLocaleDateString("pt-BR")} {new Date(r.dueDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {r.jiraCardRef && <span className="text-[10px] text-primary font-mono">{r.jiraCardRef}</span>}
            <button onClick={() => deleteReminder(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lembretes;
