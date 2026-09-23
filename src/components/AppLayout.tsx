import React from "react";
import { useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const automationView = location.pathname.startsWith("/automacao-testes");
  const initials = user?.email?.split("@")[0]?.split(".").map(w => w[0]?.toUpperCase()).join("") || "?";

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden lg:min-h-screen">
      <AppSidebar />
      <main className={`min-w-0 max-w-full flex-1 lg:ml-56 ${automationView ? "p-3 sm:p-5 lg:p-6" : "p-4 sm:p-6 lg:p-8"}`}>
        <div className={`flex min-h-11 items-center justify-end pl-12 lg:min-h-0 lg:pl-0 ${automationView ? "mb-4" : "mb-5 lg:mb-8"}`}>
          <div />
          <div className="flex min-w-0 items-center gap-3">
            <span className="min-w-0 truncate text-xs text-muted-foreground">{user?.email}</span>
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
              {initials}
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
