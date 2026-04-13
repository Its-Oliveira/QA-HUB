import React from "react";
import AppSidebar from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 ml-56 p-8">
        <div className="flex items-center justify-between mb-8">
          <div />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
              {user?.avatar}
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
