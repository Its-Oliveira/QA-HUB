import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Configuracoes = () => {
  useEffect(() => {
    localStorage.removeItem("qa-hub-github-pat");
    localStorage.removeItem("qa-hub-github-repo");
  }, []);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

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
      <h1 className="text-2xl font-semibold text-foreground mb-6">
        Configurações
      </h1>

      <div className="space-y-6 max-w-lg">
        {/* GitHub */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Integração GitHub
          </h2>
          <p className="text-sm text-muted-foreground">
            A integração é configurada pelo administrador nos secrets do backend
            Supabase. Branches e workflows ficam disponíveis na central de
            Automação de Testes.
          </p>
        </div>

        {/* Password */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Alterar Senha
          </h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Senha Atual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Nova Senha
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={pwLoading}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pwLoading ? "Salvando..." : "Alterar Senha"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
