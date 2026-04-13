import { Priority } from "@/data/mockData";

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  HIGH: { label: "HIGH PRIORITY", className: "bg-destructive/20 text-destructive" },
  MEDIUM: { label: "MEDIUM", className: "bg-warning/20 text-warning" },
  LOW: { label: "LOW PRIORITY", className: "bg-muted text-muted-foreground" },
};

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const config = priorityConfig[priority];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  );
};

export default PriorityBadge;
