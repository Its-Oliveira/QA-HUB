import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// Blocos no visual da tela de issue do Jira: título grande, seções recolhíveis e campos com rótulo em negrito.

export function JiraIssueTitle({ children }: { children: ReactNode }) {
  return <h2 className="break-words text-xl font-semibold leading-8 tracking-normal text-foreground sm:text-2xl sm:leading-9">{children}</h2>;
}

export function JiraSection({ title, children }: { title: string; children: ReactNode }) {
  return <details open className="group">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded py-1 text-[15px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-[:not([open])]:-rotate-90" />
      {title}
    </summary>
    <div className="mt-2 space-y-5 pl-0 sm:pl-[1.375rem]">{children}</div>
  </details>;
}

export function JiraField({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return <div>
    <div className="mb-1.5 flex min-h-8 items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      {action}
    </div>
    {children}
  </div>;
}
