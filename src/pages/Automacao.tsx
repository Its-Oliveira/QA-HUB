import { useState } from "react";
import { initialAutomation, AutomationEntry } from "@/data/mockData";
import { Plus } from "lucide-react";

const statusColors: Record<AutomationEntry["status"], string> = {
  Automated: "bg-success/20 text-success",
  "In Progress": "bg-warning/20 text-warning",
  Pending: "bg-muted text-muted-foreground",
};

const Automacao = () => {
  const [entries, setEntries] = useState<AutomationEntry[]>(() => {
    const saved = localStorage.getItem("qa-hub-automation");
    return saved ? JSON.parse(saved) : initialAutomation;
  });

  const save = (updated: AutomationEntry[]) => {
    setEntries(updated);
    localStorage.setItem("qa-hub-automation", JSON.stringify(updated));
  };

  const updateField = (id: string, field: keyof AutomationEntry, value: string) => {
    save(entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const automated = entries.filter((e) => e.status === "Automated").length;
  const total = entries.length;
  const coverage = total > 0 ? Math.round((automated / total) * 100) : 0;

  const addEntry = () => {
    const newEntry: AutomationEntry = { id: Date.now().toString(), feature: "", testFile: "", status: "Pending", lastRunDate: "", notes: "" };
    save([...entries, newEntry]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Automação Cypress</h1>
        <button onClick={addEntry} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground">
          <Plus className="w-3 h-3" /> Nova Entrada
        </button>
      </div>

      {/* Coverage stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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

      {/* GitHub section placeholder */}
      <div className="bg-card border border-border rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">GitHub Commits</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">Configure PAT em Configurações</span>
        </div>
        <p className="text-xs text-muted-foreground">Conecte seu repositório GitHub nas configurações para ver commits recentes do repositório Cypress.</p>
      </div>

      {/* Tracker table */}
      <h2 className="text-sm font-semibold text-foreground mb-3">Tracker de Automação</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Feature</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Arquivo de Teste</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Última Execução</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Notas</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Nenhuma entrada. Clique em "Nova Entrada" para adicionar.</td></tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <input
                    value={entry.feature}
                    onChange={(e) => updateField(entry.id, "feature", e.target.value)}
                    className="bg-transparent text-foreground text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={entry.testFile}
                    onChange={(e) => updateField(entry.id, "testFile", e.target.value)}
                    className="bg-transparent text-muted-foreground text-xs font-mono w-full focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={entry.status}
                    onChange={(e) => updateField(entry.id, "status", e.target.value)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded border-0 ${statusColors[entry.status as AutomationEntry["status"]]}`}
                  >
                    <option value="Automated">Automated</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    value={entry.lastRunDate}
                    onChange={(e) => updateField(entry.id, "lastRunDate", e.target.value)}
                    className="bg-transparent text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={entry.notes}
                    onChange={(e) => updateField(entry.id, "notes", e.target.value)}
                    className="bg-transparent text-muted-foreground text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                    placeholder="—"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Automacao;
