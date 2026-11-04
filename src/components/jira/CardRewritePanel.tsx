import { Fragment, useState, type ReactNode } from "react";
import { Check, Copy, KeyRound, Loader2, Pencil, PlugZap, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RewrittenCard } from "@/lib/cardRewrite";
import type { CardRewrite } from "@/hooks/useCardRewrite";
import { JiraField, JiraIssueTitle, JiraSection } from "./JiraIssueLayout";

const inputClass = "w-full rounded-md border border-border bg-secondary px-3 py-2 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary lg:text-sm";

function linkify(text: string): ReactNode {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 [overflow-wrap:anywhere]">{part}</a>
      : <Fragment key={i}>{part}</Fragment>);
}

/** O card reescrito como ficará no Jira (mesma estrutura que formatCardHtml copia). */
function RewrittenDescription({ card }: { card: RewrittenCard }) {
  const heading = (text: string) => <p className="font-semibold">{text}</p>;
  const list = (items: string[]) => <ul className="list-disc space-y-1 pl-6">{items.map((item, i) => <li key={i}>{linkify(item)}</li>)}</ul>;
  return <div className="space-y-3 break-words text-sm leading-6 text-foreground">
    {heading("Breve explicação:")}
    {card.breve_explicacao.map((block, i) => block.tipo === "lista" ? <Fragment key={i}>{list(block.itens)}</Fragment> : <p key={i}>{linkify(block.texto)}</p>)}
    {heading("Ações tomadas para gerar o erro:")}
    <p>{linkify(card.acoes.join(" >> "))}</p>
    {heading("Resultado esperado:")}
    <p>{linkify(card.resultado_esperado)}</p>
    {card.observacoes.length > 0 && <>{heading("OBSERVAÇÕES:")}{list(card.observacoes)}</>}
  </div>;
}

function Notice({ tone = "muted", icon, title, children }: { tone?: "muted" | "warning"; icon: ReactNode; title: string; children: ReactNode }) {
  const box = tone === "warning" ? "border-warning/40 bg-warning/10" : "border-border bg-secondary/50";
  return <div role="status" className={`space-y-2 rounded-lg border p-3 text-xs text-foreground ${box}`}>
    <p className={`flex items-center gap-1.5 font-semibold ${tone === "warning" ? "text-warning" : ""}`}>{icon} {title}</p>
    <div className="space-y-2 text-muted-foreground">{children}</div>
  </div>;
}

export default function CardRewritePanel({ rewrite }: { rewrite: CardRewrite }) {
  const { loading, original, setOriginal, result, title, setTitle, body, setBody, edited, copied, copy, ponteIssue, saveToken } = rewrite;
  const [editing, setEditing] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");

  const CopyButton = ({ what, label }: { what: "title" | "body"; label: string }) =>
    <Button variant="outline" size="sm" className="min-h-11 lg:min-h-8" aria-label={label} onClick={() => copy(what)}>
      {copied === what ? <Check /> : <Copy />} {copied === what ? "Copiado" : "Copiar"}
    </Button>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Reescrito com IA
      </span>
      <div className="flex gap-2">
        {result && <Button variant="ghost" size="sm" className="min-h-11 lg:min-h-8" disabled={loading} onClick={() => setEditing(e => !e)}>
          {editing ? <Check /> : <Pencil />} {editing ? "Concluir" : "Editar"}
        </Button>}
        <Button variant="outline" size="sm" className="min-h-11 lg:min-h-8" disabled={loading} onClick={() => { setEditing(false); rewrite.rewrite(); }}>
          {loading ? <Loader2 className="animate-spin" /> : result ? <RefreshCw /> : <Sparkles />} {loading ? "Reescrevendo..." : result ? "Gerar de novo" : "Reescrever"}
        </Button>
      </div>
    </div>

    {ponteIssue === "offline" && <Notice icon={<PlugZap className="h-3.5 w-3.5" />} title="A ponte local está desligada">
      <p>No terminal, dentro da pasta do QA Hub, rode <code className="font-mono text-foreground">npm run ponte-ia</code> e clique em Reescrever de novo.
        Se ela já está rodando, o navegador bloqueou o acesso: clique no ícone à esquerda do endereço do site, em "Acesso à rede local" escolha Permitir e recarregue a página.</p>
    </Notice>}

    {ponteIssue === "blocked" && <Notice tone="warning" icon={<PlugZap className="h-3.5 w-3.5" />} title="O navegador está esperando sua permissão">
      <p>O Chrome pede autorização para o QA Hub falar com a ponte no seu computador. Procure o aviso de "acesso à rede local" perto da barra de endereço
        (ou no ícone à esquerda do endereço), escolha Permitir e clique em Reescrever de novo.</p>
    </Notice>}

    {ponteIssue === "token" && <Notice icon={<KeyRound className="h-3.5 w-3.5" />} title="Conectar à ponte local">
      <p>Cole o token que aparece no terminal ao rodar <code className="font-mono text-foreground">npm run ponte-ia</code>.</p>
      <div className="flex gap-2">
        <input value={tokenDraft} onChange={e => setTokenDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { saveToken(tokenDraft); setTokenDraft(""); } }}
          placeholder="Token da ponte" aria-label="Token da ponte" className={`${inputClass} min-w-0 flex-1 font-mono`} />
        <Button size="sm" className="min-h-11 lg:min-h-9" onClick={() => { saveToken(tokenDraft); setTokenDraft(""); }}>Salvar</Button>
      </div>
    </Notice>}

    {ponteIssue === "empty" && original && <Notice tone="warning" icon={<TriangleAlert className="h-3.5 w-3.5" />} title="O Jira não retornou descrição para este card">
      <p>Cole abaixo o texto do suporte e clique em Reescrever.</p>
      <textarea value={original.texto} onChange={e => setOriginal({ ...original, texto: e.target.value })} aria-label="Texto do suporte"
        className={`${inputClass} min-h-40 resize-y font-mono leading-relaxed`} />
    </Notice>}

    {loading && !result && <div role="status" className="space-y-4" aria-label="Reescrevendo">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> O Claude está reescrevendo o card...</p>
      {[75, 100, 90, 60, 95, 40].map((w, i) => <div key={i} className="h-3.5 animate-pulse rounded bg-secondary" style={{ width: `${w}%` }} />)}
    </div>}

    {result && <div className={`space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
      {editing
        ? <input value={title} onChange={e => setTitle(e.target.value)} aria-label="Título reescrito" className={`${inputClass} text-lg font-semibold lg:text-lg`} />
        : <div className="flex items-start justify-between gap-3"><JiraIssueTitle>{title}</JiraIssueTitle><CopyButton what="title" label="Copiar título" /></div>}

      {result.complementar.length > 0 && <Notice tone="warning" icon={<TriangleAlert className="h-3.5 w-3.5" />} title="Complementar antes de passar pro dev">
        <ul className="list-disc space-y-0.5 pl-5 text-foreground">{result.complementar.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </Notice>}

      <JiraSection title="Informações principais">
        <JiraField label="Descrição do Problema" action={!editing && <CopyButton what="body" label="Copiar descrição" />}>
          {editing
            ? <textarea value={body} onChange={e => setBody(e.target.value)} aria-label="Descrição reescrita" className={`${inputClass} min-h-[24rem] resize-y font-mono leading-relaxed`} />
            : edited ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{linkify(body)}</p> : <RewrittenDescription card={result} />}
        </JiraField>
      </JiraSection>
    </div>}
  </div>;
}
