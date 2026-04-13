import { useState } from "react";

const Configuracoes = () => {
  const [pat, setPat] = useState(() => localStorage.getItem("qa-hub-github-pat") || "");
  const [repo, setRepo] = useState(() => localStorage.getItem("qa-hub-github-repo") || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("qa-hub-github-pat", pat);
    localStorage.setItem("qa-hub-github-repo", repo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Configurações</h1>

      <div className="bg-card border border-border rounded-lg p-6 max-w-lg space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Integração GitHub</h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Token de Acesso Pessoal (PAT)</label>
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
            placeholder="ghp_xxxxxxxxxxxx"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Repositório (dono/repo)</label>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
            placeholder="org/cypress-tests"
          />
        </div>
        <button onClick={handleSave} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
          Salvar
        </button>
        {saved && <p className="text-xs text-success">Configurações salvas!</p>}
      </div>
    </div>
  );
};

export default Configuracoes;
