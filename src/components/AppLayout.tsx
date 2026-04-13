import React from "react";
import AppSidebar from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const initials = user?.email?.split("@")[0]?.split(".").map(w => w[0]?.toUpperCase()).join("") || "?";

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 ml-56 p-8">
        <div className="flex items-center justify-between mb-8">
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
