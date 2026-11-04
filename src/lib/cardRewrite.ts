// Monta o card reescrito pela IA (ponte local, scripts/ponte-ia.mjs) no template que o
// QA cola no Jira. O formato fica no código, não na IA, para sair sempre igual.

export type ExplanationBlock = { tipo: "paragrafo" | "lista"; texto: string; itens: string[] };

export type RewrittenCard = {
  titulo: string;
  breve_explicacao: ExplanationBlock[];
  acoes: string[];
  resultado_esperado: string;
  observacoes: string[];
  complementar: string[];
};

export type OriginalCard = { titulo: string; texto: string; anexos: string };

const explanationLines = (blocks: ExplanationBlock[]) =>
  blocks.flatMap((b) => (b.tipo === "lista" ? b.itens.map((i) => `* ${i}`) : [b.texto])).filter(Boolean);

/** Texto puro do campo "Descrição do Problema" (sem o título). */
export function formatCardText(card: RewrittenCard): string {
  const lines = [
    "Breve explicação:",
    ...explanationLines(card.breve_explicacao),
    "Ações tomadas para gerar o erro:",
    card.acoes.join(" >> "),
    "Resultado esperado:",
    card.resultado_esperado,
  ];
  if (card.observacoes.length > 0) {
    lines.push("OBSERVAÇÕES:", "", ...card.observacoes.map((o) => `* ${o}`));
  }
  return lines.join("\n");
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const linkify = (s: string) =>
  escapeHtml(s).replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url}</a>`);

/** Mesmo conteúdo em HTML, para o editor do Jira colar com negrito, listas e links. */
export function formatCardHtml(card: RewrittenCard): string {
  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${linkify(i)}</li>`).join("")}</ul>`;
  const heading = (s: string) => `<p><strong>${s}</strong></p>`;
  const parts = [
    heading("Breve explicação:"),
    ...card.breve_explicacao.map((b) => (b.tipo === "lista" ? list(b.itens) : `<p>${linkify(b.texto)}</p>`)),
    heading("Ações tomadas para gerar o erro:"),
    `<p>${linkify(card.acoes.join(" >> "))}</p>`,
    heading("Resultado esperado:"),
    `<p>${linkify(card.resultado_esperado)}</p>`,
  ];
  if (card.observacoes.length > 0) parts.push(heading("OBSERVAÇÕES:"), list(card.observacoes));
  return parts.join("");
}

/** Copia como HTML + texto; navegadores sem ClipboardItem levam só o texto. */
export async function copyRich(text: string, html?: string) {
  if (html && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(text);
}
