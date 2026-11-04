import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bug, ExternalLink, Loader2, RefreshCw, Sparkles, AlertCircle, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { jiraPriority } from "@/lib/jiraDetails";
import { jiraIssueDetailsQuery } from "@/lib/jiraIssueQuery";
import { useCardRewrite } from "@/hooks/useCardRewrite";
import JiraDescription from "./JiraDescription";
import CardRewritePanel from "./CardRewritePanel";
import { JiraField, JiraSection } from "./JiraIssueLayout";

const tones: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-jira-medium/15 text-jira-medium border-jira-medium/30",
  low: "bg-success/15 text-success border-success/30",
  lowest: "bg-muted text-muted-foreground border-border",
  unknown: "bg-muted text-muted-foreground border-border",
};

// Com "Reescrever card com IA" o modal se divide: original do suporte à esquerda, card reescrito à direita.
export default function JiraCardDetailsDialog({ card, onClose }: {
  card: Tables<"jira_cards"> | null;
  onClose: () => void;
}) {
  const { data, isPending, isError, isFetching, refetch } = useQuery(jiraIssueDetailsQuery(card));
  const rewrite = useCardRewrite(card);
  const [compare, setCompare] = useState(false);
  useEffect(() => setCompare(false), [card?.key]);
  const priority = jiraPriority(data?.priority);

  const startRewrite = () => {
    setCompare(true);
    if (!rewrite.result && !rewrite.loading) rewrite.rewrite();
  };

  return <Dialog open={!!card} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent
      className={`flex max-h-[92dvh] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-lg bg-card p-0 [&>button]:hidden ${compare ? "max-w-7xl lg:h-[92dvh]" : "max-w-3xl"}`}
      aria-describedby="jira-details-description"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-2 pl-4 pr-2 sm:pl-6">
        <nav aria-label="Localização no Jira" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Bugs Orçafascio</span><span className="hidden sm:inline" aria-hidden>/</span>
          <Bug className="h-4 w-4 shrink-0 text-destructive" />
          <a href={`https://orcafascio.atlassian.net/browse/${card?.key}`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-primary hover:underline">{card?.key}</a>
        </nav>
        <DialogClose asChild><Button variant="ghost" size="icon" aria-label="Fechar detalhes" className="h-11 w-11 shrink-0"><X /></Button></DialogClose>
      </header>

      <div className={compare ? "grid min-h-0 flex-1 grid-cols-1 overflow-y-auto scrollbar-subtle lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden" : "min-h-0 overflow-y-auto scrollbar-subtle"}>
        <section aria-label="Card original" className={`space-y-6 px-4 py-5 sm:px-6 ${compare ? "border-t border-border lg:min-h-0 lg:overflow-y-auto lg:border-t-0 lg:border-r scrollbar-subtle" : ""}`}>
          {compare && <span className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Original do suporte</span>}
          <DialogTitle className="break-words text-xl font-semibold leading-8 tracking-normal sm:text-2xl sm:leading-9">{data?.summary || card?.title}</DialogTitle>
          <DialogDescription id="jira-details-description" className="sr-only">Detalhes do bug</DialogDescription>

          {isPending ? <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando detalhes...</div> : isError ?
            <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">Não foi possível carregar os detalhes deste bug. Tente novamente.</p>
              <Button variant="outline" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /> Tentar novamente</Button>
            </div> : data && <>
              <JiraSection title="Informações principais">
                <JiraField label="Descrição do Problema"><JiraDescription description={data.description} /></JiraField>
              </JiraSection>
              <JiraSection title="Detalhes">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <JiraField label="Módulo"><p className="break-words text-sm">{data.modules.length ? data.modules.join(", ") : "Não informado"}</p></JiraField>
                  <JiraField label="Prioridade"><span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${tones[priority.tone]}`}>{priority.label}</span></JiraField>
                </div>
              </JiraSection>
            </>}
        </section>

        {compare && <section aria-label="Card reescrito" className="order-first px-4 py-5 sm:px-6 lg:order-none lg:min-h-0 lg:overflow-y-auto scrollbar-subtle">
          <CardRewritePanel rewrite={rewrite} />
        </section>}
      </div>

      <footer className="flex shrink-0 flex-wrap gap-2 border-t border-border p-4 sm:justify-between sm:px-6">
        {compare
          ? <Button variant="ghost" className="min-h-11" onClick={() => setCompare(false)}><ArrowLeft /> Voltar ao card</Button>
          : <Button variant="outline" className="min-h-11" disabled={isPending} onClick={startRewrite}><Sparkles /> Reescrever card com IA</Button>}
        <Button asChild className="min-h-11"><a href={`https://orcafascio.atlassian.net/browse/${card?.key}`} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir no Jira</a></Button>
      </footer>
    </DialogContent>
  </Dialog>;
}
