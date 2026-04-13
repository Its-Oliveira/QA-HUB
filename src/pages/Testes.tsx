import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, FlaskConical } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

type TestStatus = "Não iniciado" | "Em andamento" | "Bloqueado" | "Concluído";
type Environment = "staging" | "dev" | "prod";

const statusColors: Record<TestStatus, string> = {
  "Não iniciado": "bg-muted text-muted-foreground",
  "Em andamento": "bg-primary/20 text-primary",
  "Bloqueado": "bg-destructive/20 text-destructive",
  "Concluído": "bg-success/20 text-success",
};
const allStatuses: TestStatus[] = ["Não iniciado", "Em andamento", "Bloqueado", "Concluído"];
const allEnvs: Environment[] = ["dev", "staging", "prod"];

const emptyForm = { name: "", featureDescription: "", status: "Não iniciado" as TestStatus, environment: "staging" as Environment, documentation: "", links: "" };

const Testes = () => {
  const queryClient = useQueryClient();
  const { data: tests = [] } = useQuery({
    queryKey: ["test_entries"],
    queryFn: async () => {
      const { data } = await supabase.from("test_entries").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [filterStatus, setFilterStatus] = useState<TestStatus | "all">("all");
  const [filterEnv, setFilterEnv] = useState<Environment | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const saveForm = async () => {
    if (!form.name) {
      toast.error("Preencha o nome do teste");
      return;
    }
    const linksArr = form.links ? form.links.split(",").map(l => l.trim()).filter(Boolean) : [];
    if (editingId) {
      await supabase.from("test_entries").update({ name: form.name, feature_description: form.featureDescription, status: form.status, environment: form.environment, documentation: form.documentation, links: linksArr }).eq("id", editingId);
    } else {
      await supabase.from("test_entries").insert({ name: form.name, feature_description: form.featureDescription, status: form.status, environment: form.environment, documentation: form.documentation, links: linksArr });
    }
    queryClient.invalidateQueries({ queryKey: ["test_entries"] });
    closeModal();
    toast.success(editingId ? "Teste atualizado" : "Teste criado");
  };

  const updateStatus = async (id: string, status: TestStatus) => {
    await supabase.from("test_entries").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["test_entries"] });
  };

  const startEdit = (t: any) => {
    setForm({ name: t.name, featureDescription: t.feature_description || "", status: t.status, environment: t.environment, documentation: t.documentation || "", links: (t.links || []).join(", ") });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("test_entries").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["test_entries"] });
    setConfirmDeleteId(null);
    toast.success("Teste excluído");
  };

  const filtered = tests.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterEnv !== "all" && t.environment !== filterEnv) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Testes Manuais</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground font-medium">
          <Plus className="w-3 h-3" /> Novo Teste
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TestStatus | "all")} className="bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-foreground">
          <option value="all">Todos Status</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterEnv} onChange={(e) => setFilterEnv(e.target.value as Environment | "all")} className="bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-foreground">
          <option value="all">Todos Ambientes</option>
          {allEnvs.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Nenhum teste cadastrado</p>
            <p className="text-muted-foreground text-sm">Crie o primeiro!</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium">
            <Plus className="w-4 h-4" /> Novo Teste
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((test) => (
          <div key={test.id} className="bg-card border border-border rounded-xl">
            <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === test.id ? null : test.id)}>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">{test.name}</h3>
                <p className="text-xs text-muted-foreground">{test.feature_description}</p>
              </div>
              <select
                value={test.status}
                onChange={(e) => { e.stopPropagation(); updateStatus(test.id, e.target.value as TestStatus); }}
                onClick={(e) => e.stopPropagation()}
                className={`text-[10px] font-semibold px-2 py-1 rounded border-0 ${statusColors[test.status as TestStatus] || ""}`}
              >
                {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase">{test.environment}</span>
              <p className="text-[11px] text-muted-foreground">
                {new Date(test.created_at).toLocaleDateString("pt-BR")}
              </p>
              <button onClick={(e) => { e.stopPropagation(); startEdit(test); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
              {confirmDeleteId === test.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] text-muted-foreground">Tem certeza?</span>
                  <button onClick={() => handleDelete(test.id)} className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground font-medium">Sim</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground">Não</button>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(test.id); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
            {expandedId === test.id && (
              <div className="border-t border-border p-4">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-secondary rounded-lg p-3">{test.documentation || "Sem documentação."}</pre>
                {(test.links as string[] || []).length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {(test.links as string[]).map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{link}</a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="bg-[#1a1d25] border-[#2a2d38] rounded-xl max-w-md p-0 gap-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d38]">
            <h2 className="text-base font-semibold text-foreground">{editingId ? "Editar Teste" : "Novo Teste"}</h2>
            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do teste"
              className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.featureDescription}
              onChange={(e) => setForm({ ...form, featureDescription: e.target.value })}
              placeholder="Descrição da feature"
              className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TestStatus })}
                className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value as Environment })}
                className="bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {allEnvs.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <textarea
              value={form.documentation}
              onChange={(e) => setForm({ ...form, documentation: e.target.value })}
              placeholder="Documentação (markdown)"
              rows={3}
              className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <input
              value={form.links}
              onChange={(e) => setForm({ ...form, links: e.target.value })}
              placeholder="Links (separados por vírgula)"
              className="w-full bg-secondary border border-[#2a2d38] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={saveForm}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {editingId ? "Salvar Alterações" : "Criar Teste"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Testes;
