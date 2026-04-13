const StatusDot = ({ color = "success", label }: { color?: "success" | "warning" | "destructive" | "info" | "muted" | "purple"; label?: string }) => {
  const colorMap = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-primary",
    muted: "bg-muted-foreground",
    purple: "bg-violet-500",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colorMap[color]}`} />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
};

export default StatusDot;
