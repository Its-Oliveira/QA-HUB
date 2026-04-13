import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PriorityBadge from "@/components/PriorityBadge";
import StatusDot from "@/components/StatusDot";

const Dashboard = () => {
  const { user } = useAuth();
  const firstName = user?.email?.split("@")[0]?.split(".")[0] || "";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const { data: cards = [] } = useQuery({
    queryKey: ["jira_cards"],
    queryFn: async () => {
      const { data } = await supabase.from("jira_cards").select("*");
      return data || [];
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data } = await supabase.from("reminders").select("*");
      return data || [];
    },
  });

  const { data: automation = [] } = useQuery({
    queryKey: ["automation_tracker"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_tracker").select("*");
      return data || [];
    },
  });

  const cardsInReview = cards.filter((c) => c.status === "Em Revisão QA");
  const backlogCards = cards.filter((c) => c.status === "Backlog");
  const pendingReminders = reminders.filter((r) => !r.completed).length;
  const automatedCount = automation.filter((e) => e.status === "Automatizado").length;
  const coverage = automation.length > 0 ? Math.round((automatedCount / automation.length) * 100) : 0;

  const stats = [
    { label: "Em Revisão", value: cardsInReview.length, color: "text-primary" },
    { label: "Backlog", value: backlogCards.length, color: "text-warning" },
    { label: "Lembretes", value: pendingReminders, color: "text-destructive" },
    { label: "Cobertura", value: `${coverage}%`, color: "text-success" },
  ];

  const getPriorityDotColor = (priority: string) => {
    if (priority === "HIGH") return "destructive" as const;
    if (priority === "MEDIUM") return "warning" as const;
    return "success" as const;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Olá, {displayName}</h1>

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
          {cardsInReview.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum card em revisão.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cardsInReview.map((card) => (
                <div key={card.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">{card.key}: {card.title}</h3>
                    <StatusDot color={getPriorityDotColor(card.priority)} label={card.time_indicator || undefined} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{card.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Backlog</h2>
          {backlogCards.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum card no backlog.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backlogCards.map((card) => (
                <div key={card.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                    <PriorityBadge priority={card.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3 line-clamp-2">{card.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
