import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { descriptionText } from "@/lib/jiraDetails";
import { jiraIssueDetailsQuery } from "@/lib/jiraIssueQuery";
import { copyRich, formatCardHtml, formatCardText, type OriginalCard, type RewrittenCard } from "@/lib/cardRewrite";

// A reescrita roda na ponte local (`npm run ponte-ia`, scripts/ponte-ia.mjs), com o
// Claude Code desta máquina, a partir da descrição do card no Jira (campo "Descrição do Problema").
const PONTE_URL = "http://127.0.0.1:8787";
const TOKEN_KEY = "qahub-ponte-token";

// Site público falando com 127.0.0.1: o Chrome pede "acesso à rede local" e segura a requisição até a
// pessoa responder, sem erro. Por isso todo acesso à ponte tem prazo; targetAddressSpace avisa o Chrome
// que o destino é local (outros navegadores ignoram).
const ponteFetch = async (path: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${PONTE_URL}${path}`, { ...init, signal: controller.signal, targetAddressSpace: "loopback" } as RequestInit);
  } finally {
    clearTimeout(timer);
  }
};

// Só abortamos por prazo, então AbortError aqui sempre quer dizer "não respondeu a tempo".
const isTimeout = (err: unknown) => err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError");

const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};

export type PonteIssue = "offline" | "blocked" | "token" | "empty";

export function useCardRewrite(card: Tables<"jira_cards"> | null) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState<OriginalCard | null>(null);
  const [result, setResult] = useState<RewrittenCard | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState<"title" | "body" | null>(null);
  const [ponteToken, setPonteToken] = useState(readToken);
  const [ponteIssue, setPonteIssue] = useState<PonteIssue | null>(null);

  useEffect(() => {
    setOriginal(null);
    setResult(null);
    setTitle("");
    setBody("");
    setCopied(null);
    setPonteIssue(null);
  }, [card?.key]);

  const saveToken = (value: string) => {
    const token = value.trim();
    if (!token) return;
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* fica só nesta sessão */ }
    setPonteToken(token);
    setPonteIssue(null);
  };

  const rewrite = async () => {
    if (!card) return;
    setLoading(true);
    try {
      // Ao gerar de novo, usa o original guardado (o QA pode ter colado o texto). Na primeira vez,
      // busca a descrição do Jira (vem do cache se o modal já carregou): o sync-jira não guarda esse campo.
      const details = original ? null : await queryClient.fetchQuery(jiraIssueDetailsQuery(card));
      const source = original ?? { titulo: card.title, texto: descriptionText(details?.description ?? null) || card.description || "", anexos: "" };
      setOriginal(source);
      if (!source.texto.trim()) {
        setPonteIssue("empty");
        return;
      }
      if (!ponteToken) {
        setPonteIssue("token");
        return;
      }

      const headers = { "Content-Type": "application/json", "x-ponte-token": ponteToken };
      // Checagem rápida antes da reescrita: separa "ponte desligada/bloqueada" de "Claude ainda pensando".
      try {
        await ponteFetch("/status", { headers }, 15_000);
      } catch (err) {
        setPonteIssue(isTimeout(err) ? "blocked" : "offline");
        return;
      }
      setPonteIssue(null);

      let res: Response;
      try {
        // A ponte desiste do Claude em 180s; aqui espera um pouco mais para receber o erro dela.
        res = await ponteFetch("/reescrever", { method: "POST", headers, body: JSON.stringify({ key: card.key, ...source }) }, 200_000);
      } catch (err) {
        if (!isTimeout(err)) setPonteIssue("offline");
        else toast.error("A ponte não respondeu a tempo. Veja o terminal do npm run ponte-ia.");
        return;
      }
      if (res.status === 401) {
        setPonteIssue("token");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `ponte respondeu ${res.status}`);

      setResult(data.rewritten);
      setTitle(data.rewritten.titulo);
      setBody(formatCardText(data.rewritten));
    } catch (err) {
      toast.error("Erro ao reescrever: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Texto editado à mão perde a formatação gerada; enquanto não editado, mostra e copia a versão formatada.
  const edited = !!result && body !== formatCardText(result);

  const copy = async (what: "title" | "body") => {
    try {
      await (what === "title" ? copyRich(title) : copyRich(body, result && !edited ? formatCardHtml(result) : undefined));
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return { loading, original, setOriginal, result, title, setTitle, body, setBody, edited, copied, copy, ponteIssue, saveToken, rewrite };
}

export type CardRewrite = ReturnType<typeof useCardRewrite>;
