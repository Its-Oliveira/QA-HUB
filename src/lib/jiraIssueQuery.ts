import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { JiraIssueDetails } from "@/lib/jiraDetails";

/** Detalhes do card direto do Jira. O modal e a reescrita com IA usam a mesma query (e o mesmo cache). */
export const jiraIssueDetailsQuery = (card: Tables<"jira_cards"> | null) => ({
  queryKey: ["jira-issue-details", card?.key],
  enabled: !!card,
  staleTime: 60_000,
  retry: false,
  queryFn: async (): Promise<JiraIssueDetails> => {
    if (!card) throw new Error("Nenhum card selecionado");
    if (!card.jira_synced) return { key: card.key, summary: card.title, modules: [], priority: card.priority, description: card.description };
    const { data, error } = await supabase.functions.invoke("jira-issue-details", { body: { issueKey: card.key } });
    if (error) {
      const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      console.error("Falha ao carregar detalhes do Jira:", details);
      let reason = "";
      try { reason = JSON.parse(details).error || ""; } catch { /* resposta sem JSON */ }
      throw new Error(`Não foi possível carregar os detalhes deste bug${reason ? `: ${reason}` : "."}`);
    }
    return data;
  },
});
