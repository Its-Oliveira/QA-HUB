import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, Copy, ExternalLink, Loader2, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { copyRich, formatCardHtml, formatCardText, type OriginalCard, type RewrittenCard } from "@/lib/cardRewrite";

type Props = { card: Tables<"jira_cards"> | null; onClose: () => void };

const textareaClass =
  "w-full min-h-[14rem] resize-y bg-secondary border border-border rounded-lg px-3 py-2.5 text-base lg:text-sm text-foreground font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary";

/** Extrai a mensagem de erro do corpo da edge function (supabase-js só dá o status). */
async function errorMessage(error: Error & { context?: Response }) {
  try {
    const body = await error.context?.json();
    if (body?.error) return body.error as string;
  } catch { /* corpo não é JSON */ }
  return error.message || "erro desconhecido";
}

const CardRewriteSheet = ({ card, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState<OriginalCard | null>(null);
  const [result, setResult] = useState<RewrittenCard | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState<"title" | "body" | null>(null);

  useEffect(() => {
    setOriginal(null);
    setResult(null);
    setTitle("");
    setBody("");
    setCopied(null);
  }, [card?.key]);

  const rewrite = async () => {
    if (!card) return;
    setLoading(true);
    try {
      // Ao gerar de novo, manda o original que está na tela (o QA pode ter ajustado).
      const payload = original ? { key: card.key, ...original } : { key: card.key };
      const { data, error } = await supabase.functions.invoke("rewrite-card", { body: payload });
      if (error) throw new Error(await errorMessage(error));
      setOriginal(data.original);
      setResult(data.rewritten);
      setTitle(data.rewritten.titulo);
      setBody(formatCardText(data.rewritten));
    } catch (err) {
      toast.error("Erro ao reescrever: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (what: "title" | "body") => {
    try {
      // O HTML só vale enquanto o texto não foi editado à mão; depois disso, copia o que está na tela.
      const html = result && body === formatCardText(result) ? formatCardHtml(result) : undefined;
      await (what === "title" ? copyRich(title) : copyRich(body, html));
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const CopyButton = ({ what }: { what: "title" | "body" }) => (
    <button
      onClick={() => copy(what)}
      className="flex min-h-11 items-center gap-1.5 px-2.5 py-1 rounded-md text-xs lg:min-h-0 bg-secondary text-foreground border border-border hover:bg-accent transition-colors"
    >
      {copied === what ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied === what ? "Copiado" : "Copiar"}
    </button>
  );

  return (
    <Sheet open={!!card} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-[#1a1d25] border-[#2a2d38] flex flex-col gap-5">
        {card && (
          <>
            <SheetHeader className="text-left pr-6">
              <a
                href={`https://orcafascio.atlassian.net/browse/${card.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs text-primary font-mono hover:underline"
              >
                {card.key} <ExternalLink className="w-3 h-3" />
              </a>
              <SheetTitle className="text-base break-words">{card.title}</SheetTitle>
              <SheetDescription className="text-xs">
                {card.status}{card.assignee ? ` · ${card.assignee}` : ""}
              </SheetDescription>
            </SheetHeader>

            <button
              onClick={rewrite}
              disabled={loading}
              className="flex min-h-11 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : result ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Reescrevendo..." : result ? "Gerar de novo" : "Reescrever card com IA"}
            </button>

            {result && (
              <>
                {result.complementar.length > 0 && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-warning mb-1.5">
                      <TriangleAlert className="w-3.5 h-3.5" /> Complementar antes de passar pro dev
                    </p>
                    <ul className="list-disc pl-5 text-xs text-foreground space-y-0.5">
                      {result.complementar.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                <section className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Título</h3>
                    <CopyButton what="title" />
                  </div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-base lg:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </section>

                <section className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição do Problema</h3>
                    <CopyButton what="body" />
                  </div>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} className={`${textareaClass} min-h-[22rem]`} />
                </section>
              </>
            )}

            {original && (
              <details className="group rounded-lg border border-border">
                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Texto original do suporte
                </summary>
                <div className="flex flex-col gap-2 px-3 pb-3">
                  <p className="text-[11px] text-muted-foreground">
                    Ajuste aqui se precisar e clique em "Gerar de novo". Anexos da issue: {original.anexos}.
                  </p>
                  <input
                    value={original.titulo}
                    onChange={(e) => setOriginal({ ...original, titulo: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-base lg:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <textarea
                    value={original.texto}
                    onChange={(e) => setOriginal({ ...original, texto: e.target.value })}
                    className={textareaClass}
                  />
                </div>
              </details>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CardRewriteSheet;
