import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, Copy, ExternalLink, KeyRound, Loader2, PlugZap, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { descriptionText } from "@/lib/jiraDetails";
import { jiraIssueDetailsQuery } from "@/lib/jiraIssueQuery";
import { copyRich, formatCardHtml, formatCardText, type OriginalCard, type RewrittenCard } from "@/lib/cardRewrite";

// A reescrita roda na ponte local (`npm run ponte-ia`, scripts/ponte-ia.mjs), com o
// Claude Code desta máquina, a partir da descrição do card no Jira (campo "Descrição do Problema").
const PONTE_URL = "http://127.0.0.1:8787";
const TOKEN_KEY = "qahub-ponte-token";

const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};

type Props = { card: Tables<"jira_cards"> | null; onClose: () => void };

const textareaClass =
  "w-full min-h-[14rem] resize-y bg-secondary border border-border rounded-lg px-3 py-2.5 text-base lg:text-sm text-foreground font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary";

const CardRewriteSheet = ({ card, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState<OriginalCard | null>(null);
  const [result, setResult] = useState<RewrittenCard | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState<"title" | "body" | null>(null);
  const [ponteToken, setPonteToken] = useState(readToken);
  const [tokenDraft, setTokenDraft] = useState("");
  const [ponteIssue, setPonteIssue] = useState<"offline" | "token" | null>(null);

  useEffect(() => {
    setOriginal(null);
    setResult(null);
    setTitle("");
    setBody("");
    setCopied(null);
    setPonteIssue(null);
  }, [card?.key]);

  const saveToken = () => {
    const token = tokenDraft.trim();
    if (!token) return;
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* fica só nesta sessão */ }
    setPonteToken(token);
    setTokenDraft("");
    setPonteIssue(null);
  };

  const rewrite = async () => {
    if (!card) return;
    setLoading(true);
    try {
      // Ao gerar de novo, usa o original que está na tela (o QA pode ter ajustado). Na primeira vez,
      // busca a descrição do Jira (vem do cache se o modal já carregou): o sync-jira não guarda esse campo.
      const details = original ? null : await queryClient.fetchQuery(jiraIssueDetailsQuery(card));
      const source = original ?? { titulo: card.title, texto: descriptionText(details?.description ?? null) || card.description || "", anexos: "" };
      setOriginal(source);
      if (!source.texto.trim()) {
        toast.error("O Jira não retornou descrição para este card. Cole o texto do suporte em \"Texto original\" e tente de novo.");
        return;
      }
      if (!ponteToken) {
        setPonteIssue("token");
        return;
      }

      let res: Response;
      try {
        res = await fetch(`${PONTE_URL}/reescrever`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-ponte-token": ponteToken },
          body: JSON.stringify({ key: card.key, ...source }),
        });
      } catch {
        setPonteIssue("offline");
        return;
      }
      if (res.status === 401) {
        setPonteIssue("token");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `ponte respondeu ${res.status}`);

      setPonteIssue(null);
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

            {ponteIssue === "offline" && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-foreground space-y-1.5">
                <p className="flex items-center gap-1.5 font-semibold"><PlugZap className="w-3.5 h-3.5" /> A ponte local está desligada</p>
                <p className="text-muted-foreground">
                  No terminal, dentro da pasta do QA Hub, rode <code className="font-mono text-foreground">npm run ponte-ia</code> e clique no botão de novo.
                  Se o navegador perguntar sobre acesso à rede local, permita.
                </p>
              </div>
            )}

            {ponteIssue === "token" && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-foreground space-y-2">
                <p className="flex items-center gap-1.5 font-semibold"><KeyRound className="w-3.5 h-3.5" /> Conectar à ponte local</p>
                <p className="text-muted-foreground">Cole o token que aparece no terminal ao rodar <code className="font-mono text-foreground">npm run ponte-ia</code>.</p>
                <div className="flex gap-2">
                  <input
                    value={tokenDraft}
                    onChange={(e) => setTokenDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveToken(); }}
                    placeholder="Token da ponte"
                    className="min-w-0 flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-base lg:text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={saveToken} className="min-h-11 lg:min-h-0 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground font-medium">Salvar</button>
                </div>
              </div>
            )}

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
              <details open={!result} className="group rounded-lg border border-border">
                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Texto original do suporte
                </summary>
                <div className="flex flex-col gap-2 px-3 pb-3">
                  <p className="text-[11px] text-muted-foreground">
                    Texto sincronizado do Jira. Ajuste aqui se precisar (ex.: quebras de linha ou "imagem em anexo") e clique no botão de novo.
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
