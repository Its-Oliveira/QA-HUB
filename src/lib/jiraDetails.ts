export interface JiraDocumentNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JiraDocumentNode[];
}

export interface JiraIssueDetails {
  key: string;
  summary: string;
  modules: string[];
  priority: string | null;
  description: JiraDocumentNode | string | null;
}

export function safeJiraLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function jiraPriority(value: string | null | undefined) {
  switch (value?.trim().toLowerCase()) {
    case "highest": case "critical": case "crítica": case "critica": case "mais alta":
      return { label: "Crítica", tone: "critical" };
    case "high": case "alta": return { label: "Alta", tone: "high" };
    case "medium": case "média": case "media": return { label: "Média", tone: "medium" };
    case "low": case "baixa": return { label: "Baixa", tone: "low" };
    case "lowest": case "mais baixa": return { label: "Muito baixa", tone: "lowest" };
    default: return { label: value || "Não informado", tone: "unknown" };
  }
}

function wikiInline(text: string): JiraDocumentNode[] {
  const pattern = /(\[([^\]|]+)\|([^\]]+)\]|\*([^*\n]+)\*|\{\{([^}]+)\}\}|_([^_\n]+)_)/g;
  const content: JiraDocumentNode[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > end) content.push({ type: "text", text: text.slice(end, start) });
    const mark = match[2] ? { type: "link", attrs: { href: match[3] } } : { type: match[4] ? "strong" : match[5] ? "code" : "em" };
    content.push({ type: "text", text: match[2] || match[4] || match[5] || match[6], marks: [mark] });
    end = start + match[0].length;
  }
  if (end < text.length) content.push({ type: "text", text: text.slice(end) });
  return content;
}

function wikiDocument(text: string): JiraDocumentNode {
  const content: JiraDocumentNode[] = [];
  let code: string[] | null = null;
  let list: JiraDocumentNode | null = null;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\{(?:code|noformat)(?::[^}]*)?\}/.test(line)) {
      if (code) { content.push({ type: "codeBlock", content: [{ type: "text", text: code.join("\n") }] }); code = null; }
      else code = [];
      list = null;
      continue;
    }
    if (code) { code.push(line); continue; }
    const item = line.match(/^([*#])\s+(.+)$/);
    if (item) {
      const type = item[1] === "*" ? "bulletList" : "orderedList";
      if (list?.type !== type) { list = { type, content: [] }; content.push(list); }
      list?.content?.push({ type: "listItem", content: [{ type: "paragraph", content: wikiInline(item[2]) }] });
      continue;
    }
    list = null;
    const heading = line.match(/^h([1-6])\.\s+(.*)$/);
    content.push(heading ? { type: "heading", attrs: { level: Number(heading[1]) }, content: wikiInline(heading[2]) } : { type: "paragraph", content: wikiInline(line.replace(/\\\\/g, "\n")) });
  }
  if (code) content.push({ type: "codeBlock", content: [{ type: "text", text: code.join("\n") }] });
  return { type: "doc", content };
}

// Parse HTML into an allowlisted document. Never inject Jira HTML into the page.
function htmlDocument(text: string): JiraDocumentNode {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const convert = (node: Node, marks: NonNullable<JiraDocumentNode["marks"]> = []): JiraDocumentNode[] => {
    if (node.nodeType === 3) return [{ type: "text", text: node.textContent || "", marks }];
    if (!(node instanceof Element)) return [];
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "iframe", "object", "embed", "svg", "form", "input"].includes(tag)) return [];
    const markType = ({ strong: "strong", b: "strong", em: "em", i: "em", code: "code", s: "strike", u: "underline", a: "link" } as Record<string, string>)[tag];
    const nextMarks = markType ? [...marks, { type: markType, attrs: tag === "a" ? { href: node.getAttribute("href") } : undefined }] : marks;
    const children = Array.from(node.childNodes).flatMap(child => convert(child, nextMarks));
    if (tag === "br") return [{ type: "hardBreak" }];
    if (tag === "hr") return [{ type: "rule" }];
    if (tag === "pre") return [{ type: "codeBlock", content: [{ type: "text", text: node.textContent || "" }] }];
    const type = ({ p: "paragraph", div: "paragraph", ul: "bulletList", ol: "orderedList", li: "listItem", blockquote: "blockquote", table: "table", tr: "tableRow", td: "tableCell", th: "tableHeader" } as Record<string, string>)[tag];
    if (/^h[1-6]$/.test(tag)) return [{ type: "heading", attrs: { level: Number(tag[1]) }, content: children }];
    return type ? [{ type, content: children }] : children;
  };
  return { type: "doc", content: Array.from(doc.body.childNodes).flatMap(node => convert(node)) };
}

export function descriptionDocument(value: JiraIssueDetails["description"]): JiraDocumentNode | null {
  if (!value) return null;
  if (typeof value !== "string") return value;
  if (!value.trim()) return null;
  return /<\/?(?:p|div|br|strong|b|em|ul|ol|li|a|pre|h[1-6]|table)\b[^>]*>/i.test(value) ? htmlDocument(value) : wikiDocument(value);
}

export function documentHasContent(node: JiraDocumentNode | null): boolean {
  if (!node) return false;
  if (node.text?.trim() || ["media", "mention", "inlineCard", "emoji"].includes(node.type)) return true;
  return node.content?.some(documentHasContent) ?? false;
}
/** Texto puro da descrição, com quebras de linha, links e anexos visíveis (entrada da reescrita com IA). */
export function descriptionText(value: JiraIssueDetails["description"]): string {
  const text = (node: JiraDocumentNode): string => {
    const children = (sep = "") => (node.content ?? []).map(text).join(sep);
    switch (node.type) {
      case "text": {
        const href = node.marks?.find(m => m.type === "link")?.attrs?.href;
        return typeof href === "string" && href !== node.text ? `${node.text} (${href})` : node.text ?? "";
      }
      case "hardBreak": return "\n";
      case "paragraph": case "heading": return children() + "\n";
      case "bulletList": case "orderedList":
        return (node.content ?? []).map((item, i) => `${node.type === "bulletList" ? "*" : `${i + 1}.`} ${text(item).trim()}\n`).join("");
      case "codeBlock": return children() + "\n";
      case "tableRow": return (node.content ?? []).map(cell => text(cell).trim()).join(" | ") + "\n";
      case "rule": return "---\n";
      case "mention": case "emoji": return String(node.attrs?.text ?? node.attrs?.shortName ?? "");
      case "inlineCard": case "blockCard": return String(node.attrs?.url ?? "");
      case "media": return `[Anexo no Jira${node.attrs?.alt ? `: ${node.attrs.alt}` : ""}]\n`;
      default: return children();
    }
  };
  const document = descriptionDocument(value);
  return document ? text(document).replace(/\n{3,}/g, "\n\n").trim() : "";
}
