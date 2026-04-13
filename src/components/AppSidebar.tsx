import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, CreditCard, Bell, FlaskConical, Cog, LogOut, TestTube2 } from "lucide-react";

const navItems = [
  { label: "Painel", path: "/", icon: LayoutDashboard },
  { label: "Cards Jira", path: "/cards", icon: CreditCard },
  { label: "Lembretes", path: "/lembretes", icon: Bell },
  { label: "Testes", path: "/testes", icon: FlaskConical },
  { label: "Automação", path: "/automacao", icon: TestTube2 },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-sidebar flex flex-col border-r border-sidebar-border z-50">
      <div className="p-6 flex items-center gap-2">
        <div className="text-primary font-bold text-xl tracking-tight">
          <span className="text-foreground">&lt;</span>QA<span className="text-foreground">/&gt;</span>
        </div>
        <span className="text-foreground font-semibold text-lg">Hub</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative ${
                active
                  ? "text-primary bg-sidebar-accent"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              }`}
            >
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r" />}
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 flex flex-col gap-1">
        <button
          onClick={() => navigate("/configuracoes")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Cog className="w-4 h-4" />
          Configurações
        </button>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:text-destructive hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
