const priorityConfig: Record<string, { label: string; className: string }> = {
  HIGH: { label: "ALTA PRIORIDADE", className: "bg-destructive/20 text-destructive" },
  MEDIUM: { label: "MÉDIA", className: "bg-warning/20 text-warning" },
  LOW: { label: "BAIXA PRIORIDADE", className: "bg-muted text-muted-foreground" },
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const config = priorityConfig[priority] || priorityConfig.MEDIUM;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  );
};

export default PriorityBadge;
