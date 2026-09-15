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
    <div className="flex min-h-screen overflow-x-hidden">
      <AppSidebar />
      <main className={`ml-56 min-w-0 flex-1 ${automationView ? "p-5 lg:p-6" : "p-8"}`}>
        <div className={`flex items-center justify-between ${automationView ? "mb-4" : "mb-8"}`}>
          <div />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
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
