import { useState } from "react";
import { initialTests, TestEntry, TestStatus, Environment } from "@/data/mockData";

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

  const save = (updated: TestEntry[]) => {
    setTests(updated);
    localStorage.setItem("qa-hub-tests", JSON.stringify(updated));
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
      <h1 className="text-2xl font-semibold text-foreground mb-6">Testes Manuais</h1>

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
            <p className="text-muted-foreground text-sm">Nenhum teste cadastrado. Adicione um novo teste para começar.</p>
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
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-secondary rounded p-3">{test.documentation || "Sem documentação."}</pre>
                </div>
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
