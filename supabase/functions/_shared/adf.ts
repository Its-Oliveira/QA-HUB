/**
 * Converte o formato ADF (Atlassian Document Format) do Jira em texto simples,
 * preservando parágrafos, listas, quebras de linha e links. O sync-jira achata
 * tudo numa linha só; aqui a IA precisa da estrutura original do card.
 */
type AdfNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, string | undefined>;
  marks?: { type: string; attrs?: Record<string, string | undefined> }[];
  content?: AdfNode[];
};

function inline(nodes: AdfNode[] = []): string {
  return nodes
    .map((n) => {
      switch (n.type) {
        case "text": {
          const link = n.marks?.find((m) => m.type === "link")?.attrs?.href;
          const text = n.text ?? "";
          return link && link !== text ? `${text} (${link})` : text;
        }
        case "hardBreak":
          return "\n";
        case "inlineCard":
        case "blockCard":
          return n.attrs?.url ?? "";
        case "mention":
          return n.attrs?.text ?? "";
        case "emoji":
          return n.attrs?.text ?? n.attrs?.shortName ?? "";
        default:
          return inline(n.content);
      }
    })
    .join("");
}

function block(node: AdfNode, indent = ""): string[] {
  switch (node.type) {
    case "paragraph":
    case "heading":
      return [indent + inline(node.content)];
    case "bulletList":
    case "orderedList":
      return (node.content ?? []).flatMap((item, i) => {
        const bullet = node.type === "orderedList" ? `${i + 1}. ` : "* ";
        const [first = "", ...rest] = (item.content ?? []).flatMap((c) => block(c, indent + "  "));
        return [indent + bullet + first.trimStart(), ...rest];
      });
    case "codeBlock":
    case "blockquote":
    case "panel":
      return (node.content ?? []).flatMap((c) => (c.type === "text" ? [indent + (c.text ?? "")] : block(c, indent)));
    case "rule":
      return ["---"];
    case "mediaSingle":
    case "mediaGroup":
    case "media":
      return [];
    case "blockCard":
    case "embedCard":
      return [indent + (node.attrs?.url ?? "")];
    case "table":
      return (node.content ?? []).map((row) =>
        indent + (row.content ?? []).map((cell) => (cell.content ?? []).flatMap((c) => block(c)).join(" ")).join(" | "),
      );
    default:
      return node.content ? node.content.flatMap((c) => block(c, indent)) : [];
  }
}

export function adfToText(doc: unknown): string {
  if (typeof doc === "string") return doc.trim();
  const root = doc as AdfNode | null;
  if (!root?.content) return "";
  return root.content
    .map((n) => block(n).join("\n"))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
