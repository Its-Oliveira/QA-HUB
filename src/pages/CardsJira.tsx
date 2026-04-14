import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StatusDot from "@/components/StatusDot";
import { LayoutGrid, List, RefreshCw, Plus, Pencil, Trash2, X, Loader2, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type CardStatus = "Backlog" | "Em Revisão QA" | "Em Produção";
type Priority = "HIGH" | "MEDIUM" | "LOW";

const statuses: CardStatus[] = ["Backlog", "Em Revisão QA", "Em Produção"];
const statusColors: Record<CardStatus, "warning" | "info" | "success"> = {
  Backlog: "warning",
  "Em Revisão QA": "info",
  "Em Produção": "success",
};

const bugTypes = ["Bug QA", "Bug Cliente", "Bug Backoffice", "Bug Dev"] as const;
type BugType = typeof bugTypes[number];

const POLL_INTERVAL = 60_000;
const emptyForm = { key: "", title: "", description: "", status: "Backlog" as CardStatus, priority: "MEDIUM" as Priority, assignee: "" };

const CardsJira = () => {
  const queryClient = useQueryClient();
  const { data: cards = [] } = useQuery({
    queryKey: ["jira_cards"],
    queryFn: async () => {
      const { data } = await supabase.from("jira_cards").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterStatus] = useState<CardStatus | "all">("all");
  const [filterPriority] = useState<Priority | "all">("all");
  const [filterBugType, setFilterBugType] = useState<BugType | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const syncJira = useCallback(async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    setSyncError(false);
    try {
      const { data, error } = await supabase.functions.invoke("sync-jira");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["jira_cards"] });
      setLastSync(new Date());
      if (!silent) toast.success(data.message || `${data.synced} cards sincronizados`);
    } catch (err: any) {
      setSyncError(true);
      if (!silent) toast.error("Erro ao sincronizar: " + (err.message || "erro desconhecido"));
    } finally {
      setSyncing(false);
    }
  }, [syncing, queryClient]);

  // Auto-polling every 60s
  useEffect(() => {
    // Initial sync on mount
    syncJira(true);

    intervalRef.current = setInterval(() => {
      syncJira(true);
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!form.key || !form.title) {
      toast.error("Preencha o ID e o título");
      return;
    }
    const avatar = form.assignee.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    if (editingId) {
      await supabase.from("jira_cards").update({ key: form.key, title: form.title, description: form.description, status: form.status, priority: form.priority, assignee: form.assignee, assignee_avatar: avatar }).eq("id", editingId);
    } else {
      await supabase.from("jira_cards").insert({ key: form.key, title: form.title, description: form.description, status: form.status, priority: form.priority, assignee: form.assignee, assignee_avatar: avatar });
    }
    queryClient.invalidateQueries({ queryKey: ["jira_cards"] });
    closeModal();
    toast.success(editingId ? "Card atualizado" : "Card criado");
  };

  const startEdit = (card: any) => {
    setForm({ key: card.key, title: card.title, description: card.description || "", status: card.status, priority: card.priority, assignee: card.assignee || "" });
    setEditingId(card.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("jira_cards").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["jira_cards"] });
    setConfirmDeleteId(null);
    toast.success("Card excluído");
  };

  const filtered = cards.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterPriority !== "all" && c.priority !== filterPriority) return false;
    if (filterBugType !== "all" && (c as any).bug_type !== filterBugType) return false;
    return true;
  });

  const jiraUrl = (key: string) => `https://orcafascio.atlassian.net/browse/${key}`;

  const CardItem = ({ card }: { card: any }) => (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <a href={jiraUrl(card.key)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-mono cursor-pointer hover:underline">{card.key}</a>
        <div className="flex items-center gap-1">
          <button onClick={() => startEdit(card)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3 h-3" /></button>
          {confirmDeleteId === card.id ? (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-[11px] text-muted-foreground">Tem certeza?</span>
              <button onClick={() => handleDelete(card.id)} className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground font-medium">Sim</button>
              <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground">Não</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDeleteId(card.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
          )}
        </div>
      </div>
      <a href={jiraUrl(card.key)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-foreground mb-1 block cursor-pointer hover:underline">{card.title}</a>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{card.description}</p>
      <div className="flex items-center justify-between">
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-foreground font-medium">{card.assignee_avatar}</div>
        <p className="text-[11px] text-muted-foreground">
          Criado em: {new Date(card.created_at).toLocaleDateString("pt-BR")} às {new Date(card.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground font-medium">
            <Plus className="w-3 h-3" /> Novo Card
          </button>
          <button onClick={() => syncJira(false)} disabled={syncing} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-secondary text-foreground border border-border hover:bg-accent transition-colors disabled:opacity-50">
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} {syncing ? "Sincronizando..." : "Sincronizar com Jira"}
          </button>
          <button onClick={() => setView("kanban")} className={`p-1.5 rounded ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
        </div>
      </div>


      {view === "kanban" ? (
        <div className="grid grid-cols-3 gap-6">
          {statuses.map((status) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <StatusDot color={statusColors[status]} />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{status}</h2>
                <span className="text-xs text-muted-foreground">({filtered.filter((c) => c.status === status).length})</span>
              </div>
              <div className="space-y-3">
                {filtered.filter((c) => c.status === status).map((card) => <CardItem key={card.id} card={card} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((card) => (
            <div key={card.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <StatusDot color={statusColors[card.status as CardStatus]} />
              <a href={jiraUrl(card.key)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-mono w-16 cursor-pointer hover:underline">{card.key}</a>
              <a href={jiraUrl(card.key)} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground flex-1 cursor-pointer hover:underline">{card.title}</a>
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-foreground font-medium">{card.assignee_avatar}</div>
              <button onClick={() => startEdit(card)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
              {confirmDeleteId === card.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">Tem certeza?</span>
                  <button onClick={() => handleDelete(card.id)} className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground font-medium">Sim</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground">Não</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(card.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="bg-[#1a1d25] border-[#2a2d38] rounded-xl max-w-md p-0 gap-0">
          <VisuallyHidden><DialogTitle>{editingId ? "Editar Card" : "Novo Card"}</DialogTitle></VisuallyHidden>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d38]">
            <h2 className="text-base font-semibold text-foreground">{editingId ? "Editar Card" : "Novo Card"}</h2>
            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="ID (ex: QA-101)" className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Responsável" className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CardStatus })} className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>
          </div>
          <div className="px-5 pb-5">
            <button onClick={save} className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
              {editingId ? "Salvar Alterações" : "Criar Card"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardsJira;
