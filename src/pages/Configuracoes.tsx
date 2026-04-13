import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Configuracoes = () => {
  const [pat, setPat] = useState(() => localStorage.getItem("qa-hub-github-pat") || "");
  const [repo, setRepo] = useState(() => localStorage.getItem("qa-hub-github-repo") || "");
  const [saved, setSaved] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleSaveGithub = () => {
    localStorage.setItem("qa-hub-github-pat", pat);
    localStorage.setItem("qa-hub-github-repo", repo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Configurações</h1>

      <div className="space-y-6 max-w-lg">
        {/* GitHub */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Integração GitHub</h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Token de Acesso Pessoal (PAT)</label>
            <input type="password" value={pat} onChange={(e) => setPat(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" placeholder="ghp_xxxxxxxxxxxx" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Repositório (dono/repo)</label>
            <input value={repo} onChange={(e) => setRepo(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" placeholder="org/cypress-tests" />
          </div>
          <button onClick={handleSaveGithub} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">Salvar</button>
          {saved && <p className="text-xs text-success">Configurações salvas!</p>}
        </div>

        {/* Password */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Alterar Senha</h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Senha Atual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nova Senha</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Confirmar Nova Senha</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground" />
          </div>
          <button onClick={handleChangePassword} disabled={pwLoading} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
            {pwLoading ? "Salvando..." : "Alterar Senha"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
