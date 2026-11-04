import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, RefreshCw, Sparkles, AlertCircle, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { jiraPriority } from "@/lib/jiraDetails";
import { jiraIssueDetailsQuery } from "@/lib/jiraIssueQuery";
import JiraDescription from "./JiraDescription";

const tones: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-jira-medium/15 text-jira-medium border-jira-medium/30",
  low: "bg-success/15 text-success border-success/30",
  lowest: "bg-muted text-muted-foreground border-border",
  unknown: "bg-muted text-muted-foreground border-border",
};

export default function JiraCardDetailsDialog({ card, onClose, onRewrite }: {
  card: Tables<"jira_cards"> | null;
  onClose: () => void;
  onRewrite: (card: Tables<"jira_cards">) => void;
}) {
  const { data, isPending, isError, isFetching, refetch } = useQuery(jiraIssueDetailsQuery(card));
  const priority = jiraPriority(data?.priority);

  return <Dialog open={!!card} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg bg-card p-0 [&>button]:hidden" aria-describedby="jira-details-description">
      <header className="shrink-0 border-b border-border px-4 py-5 pr-16 sm:px-6 sm:pr-16">
        <DialogClose asChild><Button variant="ghost" size="icon" aria-label="Fechar detalhes" className="absolute right-2 top-2 h-11 w-11"><X /></Button></DialogClose>
        <p className="mb-2 text-xs font-mono font-semibold text-primary">{card?.key}</p>
        <DialogTitle className="break-words text-base leading-6 tracking-normal sm:text-lg">{data?.summary || card?.title}</DialogTitle>
        <DialogDescription id="jira-details-description" className="sr-only">Detalhes do bug</DialogDescription>
      </header>
      <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6 scrollbar-subtle">
        {isPending ? <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando detalhes...</div> : isError ?
          <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">Não foi possível carregar os detalhes deste bug. Tente novamente.</p>
            <Button variant="outline" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /> Tentar novamente</Button>
          </div> : data && <>
            <dl className="mb-6 grid grid-cols-1 gap-4 border-b border-border pb-5 sm:grid-cols-2">
              <div><dt className="mb-2 text-xs font-semibold text-muted-foreground">Módulo</dt><dd className="break-words text-sm">{data.modules.length ? data.modules.join(", ") : "Não informado"}</dd></div>
              <div><dt className="mb-2 text-xs font-semibold text-muted-foreground">Prioridade</dt><dd><span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${tones[priority.tone]}`}>{priority.label}</span></dd></div>
            </dl>
            <section><h3 className="mb-3 text-sm font-semibold">Descrição do problema</h3><JiraDescription description={data.description} /></section>
          </>}
      </div>
      <footer className="flex shrink-0 flex-wrap gap-2 border-t border-border p-4 sm:justify-between sm:px-6">
        <Button variant="outline" className="min-h-11" onClick={() => { if (card) onRewrite(card); }}><Sparkles /> Reescrever card com IA</Button>
        <Button asChild className="min-h-11"><a href={`https://orcafascio.atlassian.net/browse/${card?.key}`} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir no Jira</a></Button>
      </footer>
    </DialogContent>
  </Dialog>;
}