import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, CreditCard, Bell, FlaskConical, Cog, LogOut, TestTube2, BarChart3, Zap, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Painel", path: "/", icon: LayoutDashboard },
  { label: "Cards Jira", path: "/cards", icon: CreditCard },
  { label: "Lembretes", path: "/lembretes", icon: Bell },
  { label: "Testes", path: "/testes", icon: FlaskConical },
  { label: "Automação", path: "/automacao", icon: TestTube2 },
  { label: "Automação de Testes", path: "/automacao-testes", icon: Zap },
  { label: "Relatórios", path: "/reports", icon: BarChart3 },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const menu = (
    <>
      <div className="p-6 flex items-center gap-2">
        <div className="text-primary font-bold text-xl tracking-tight">
          <span className="text-foreground">&lt;</span>QA<span className="text-foreground">/&gt;</span>
        </div>
        <span className="text-foreground font-semibold text-lg">Hub</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 mt-2 overflow-y-auto lg:overflow-visible">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative max-lg:min-h-11 ${
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

      <div className="px-3 pb-4 flex flex-col gap-1 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => { navigate("/configuracoes"); setOpen(false); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors max-lg:min-h-11"
        >
          <Cog className="w-4 h-4" />
          Configurações
        </button>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:text-destructive hover:bg-sidebar-accent transition-colors max-lg:min-h-11"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {menu}
      </aside>
      <Button variant="ghost" size="icon" aria-label="Abrir menu" onClick={() => setOpen(true)} className="fixed left-4 top-4 z-40 h-11 w-11 bg-background lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex h-[100dvh] w-[min(18rem,85vw)] flex-col gap-0 border-sidebar-border bg-sidebar p-0 pt-[env(safe-area-inset-top)] text-sidebar-foreground lg:hidden [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          {menu}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppSidebar;
