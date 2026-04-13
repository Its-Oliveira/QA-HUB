import { useState } from "react";
import { jiraCards, CardStatus, Priority, JiraCard } from "@/data/mockData";
import PriorityBadge from "@/components/PriorityBadge";
import StatusDot from "@/components/StatusDot";
import { LayoutGrid, List, RefreshCw } from "lucide-react";

const statuses: CardStatus[] = ["Backlog", "Em Revisão QA", "Em Produção"];

const statusColors: Record<CardStatus, "warning" | "info" | "success"> = {
  Backlog: "warning",
  "Em Revisão QA": "info",
  "Em Produção": "success",
};

const CardsJira = () => {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterStatus, setFilterStatus] = useState<CardStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");

  const filtered = jiraCards.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterPriority !== "all" && c.priority !== filterPriority) return false;
    return true;
  });

  const CardItem = ({ card }: { card: JiraCard }) => (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-primary font-mono">{card.key}</span>
        <PriorityBadge priority={card.priority} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{card.title}</h3>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{card.description}</p>
      <div className="flex items-center justify-between">
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-foreground font-medium">
          {card.assigneeAvatar}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(card.updatedAt).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Cards Jira</h1>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-secondary text-muted-foreground border border-border opacity-50 cursor-not-allowed"
          >
            <RefreshCw className="w-3 h-3" /> Sync with Jira
          </button>
          <button onClick={() => setView("kanban")} className={`p-1.5 rounded ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CardStatus | "all")}
          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-foreground"
        >
          <option value="all">Todos Status</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-foreground"
        >
          <option value="all">Todas Prioridades</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-3 gap-6">
          {statuses.map((status) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <StatusDot color={statusColors[status]} />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{status}</h2>
                <span className="text-xs text-muted-foreground">
                  ({filtered.filter((c) => c.status === status).length})
                </span>
              </div>
              <div className="space-y-3">
                {filtered.filter((c) => c.status === status).map((card) => (
                  <CardItem key={card.id} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((card) => (
            <div key={card.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              <StatusDot color={statusColors[card.status]} />
              <span className="text-xs text-primary font-mono w-16">{card.key}</span>
              <span className="text-sm text-foreground flex-1">{card.title}</span>
              <PriorityBadge priority={card.priority} />
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-foreground font-medium">
                {card.assigneeAvatar}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardsJira;
