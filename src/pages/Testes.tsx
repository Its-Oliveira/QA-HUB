import { useState } from "react";
import { initialTests, TestEntry, TestStatus, Environment } from "@/data/mockData";
import { Plus } from "lucide-react";

const statusColors: Record<TestStatus, string> = {
  "Não iniciado": "bg-muted text-muted-foreground",
  "Em andamento": "bg-primary/20 text-primary",
  "Bloqueado": "bg-destructive/20 text-destructive",
  "Concluído": "bg-success/20 text-success",
};

const allStatuses: TestStatus[] = ["Não iniciado", "Em andamento", "Bloqueado", "Concluído"];
const allEnvs: Environment[] = ["dev", "staging", "prod"];

const Testes = () => {
  const [tests, setTests] = useState<TestEntry[]>(() => {
    const saved = localStorage.getItem("qa-hub-tests");
    return saved ? JSON.parse(saved) : initialTests;
  });
  const [filterStatus, setFilterStatus] = useState<TestStatus | "all">("all");
  const [filterEnv, setFilterEnv] = useState<Environment | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", featureDescription: "", status: "Não iniciado" as TestStatus, environment: "staging" as Environment, documentation: "", links: "" });

  const save = (updated: TestEntry[]) => {
    setTests(updated);
    localStorage.setItem("qa-hub-tests", JSON.stringify(updated));
  };

  const addTest = () => {
    if (!form.name) return;
    const newTest: TestEntry = { id: Date.now().toString(), name: form.name, featureDescription: form.featureDescription, status: form.status, environment: form.environment, updatedAt: new Date().toISOString(), documentation: form.documentation, links: form.links ? form.links.split(",").map(l => l.trim()) : [] };
    save([...tests, newTest]);
    setForm({ name: "", featureDescription: "", status: "Não iniciado", environment: "staging", documentation: "", links: "" });
    setShowForm(false);
  };

  const updateStatus = (id: string, status: TestStatus) => {
    save(tests.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)));
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
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground">
          <Plus className="w-3 h-3" /> Novo Teste
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do teste" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" />
          <input value={form.featureDescription} onChange={(e) => setForm({ ...form, featureDescription: e.target.value })} placeholder="Descrição da feature" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TestStatus })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as Environment })} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground">
            {allEnvs.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <textarea value={form.documentation} onChange={(e) => setForm({ ...form, documentation: e.target.value })} placeholder="Documentação (markdown)" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" rows={3} />
          <input value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} placeholder="Links (separados por vírgula)" className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground col-span-2" />
          <button onClick={addTest} className="col-span-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium">Adicionar</button>
        </div>
      )}

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

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhum teste cadastrado. Clique em "Novo Teste" para começar.</p>
          </div>
        )}
        {filtered.map((test) => (
          <div key={test.id} className="bg-card border border-border rounded-lg">
            <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === test.id ? null : test.id)}>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">{test.name}</h3>
                <p className="text-xs text-muted-foreground">{test.featureDescription}</p>
              </div>
              <select
                value={test.status}
                onChange={(e) => { e.stopPropagation(); updateStatus(test.id, e.target.value as TestStatus); }}
                onClick={(e) => e.stopPropagation()}
                className={`text-[10px] font-semibold px-2 py-1 rounded border-0 ${statusColors[test.status]}`}
              >
                {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase">{test.environment}</span>
              <span className="text-xs text-muted-foreground">{new Date(test.updatedAt).toLocaleDateString("pt-BR")}</span>
            </div>
            {expandedId === test.id && (
              <div className="border-t border-border p-4">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-secondary rounded p-3">{test.documentation || "Sem documentação."}</pre>
                {test.links.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {test.links.map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{link}</a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Testes;
