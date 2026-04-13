import { useAuth } from "@/contexts/AuthContext";
import { jiraCards, initialReminders } from "@/data/mockData";
import PriorityBadge from "@/components/PriorityBadge";
import StatusDot from "@/components/StatusDot";

const Dashboard = () => {
  const { user } = useAuth();
  const cardsInReview = jiraCards.filter((c) => c.status === "Em Revisão QA");
  const backlogCards = jiraCards.filter((c) => c.status === "Backlog");
  const pendingReminders = initialReminders.filter((r) => !r.completed).length;

  const stats = [
    { label: "Em Revisão", value: cardsInReview.length, color: "text-primary" },
    { label: "Backlog", value: backlogCards.length, color: "text-warning" },
    { label: "Lembretes", value: pendingReminders, color: "text-destructive" },
    { label: "Cobertura", value: "50%", color: "text-success" },
  ];

  const getPriorityDotColor = (priority: string) => {
    if (priority === "HIGH") return "destructive" as const;
    if (priority === "MEDIUM") return "warning" as const;
    return "success" as const;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">
        Olá, {user?.name?.split(" ")[0]}
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cards em Revisão</h2>
          <div className="space-y-3">
            {cardsInReview.map((card) => (
              <div key={card.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {card.key}: {card.title}
                  </h3>
                  <StatusDot color={getPriorityDotColor(card.priority)} label={card.timeIndicator} />
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{card.description}</p>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < 2 ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Backlog</h2>
          <div className="space-y-3">
            {backlogCards.map((card) => (
              <div key={card.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                  <PriorityBadge priority={card.priority} />
                </div>
                <p className="text-xs text-muted-foreground italic mb-3 line-clamp-2">{card.description}</p>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
