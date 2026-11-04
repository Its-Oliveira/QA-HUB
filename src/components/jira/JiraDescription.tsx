import { Fragment, type ReactNode } from "react";
import { descriptionDocument, documentHasContent, safeJiraLink, type JiraDocumentNode, type JiraIssueDetails } from "@/lib/jiraDetails";

function renderNode(node: JiraDocumentNode, key: number): ReactNode {
  const children = node.content?.map(renderNode);
  if (node.type === "text") {
    let text: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "strong": text = <strong>{text}</strong>; break;
        case "em": text = <em>{text}</em>; break;
        case "strike": text = <s>{text}</s>; break;
        case "underline": text = <u>{text}</u>; break;
        case "code": text = <code className="rounded bg-secondary px-1 font-mono text-sm">{text}</code>; break;
        case "link": {
          const href = safeJiraLink(mark.attrs?.href);
          if (href) text = <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{text}</a>;
          break;
        }
      }
    }
    return <Fragment key={key}>{text}</Fragment>;
  }
  switch (node.type) {
    case "doc": return <Fragment key={key}>{children}</Fragment>;
    case "paragraph": return <p key={key} className="min-h-5 whitespace-pre-wrap">{children}</p>;
    case "heading": return <div role="heading" aria-level={Number(node.attrs?.level) || 3} key={key} className="font-semibold text-base">{children}</div>;
    case "hardBreak": return <br key={key} />;
    case "bulletList": return <ul key={key} className="list-disc space-y-1 pl-6">{children}</ul>;
    case "orderedList": return <ol key={key} start={Number(node.attrs?.order) || 1} className="list-decimal space-y-1 pl-6">{children}</ol>;
    case "listItem": return <li key={key} className="space-y-1">{children}</li>;
    case "codeBlock": return <pre key={key} className="max-w-full overflow-x-auto rounded-md bg-secondary p-3 font-mono text-xs whitespace-pre">{children}</pre>;
    case "blockquote": return <blockquote key={key} className="border-l-2 border-primary pl-4 space-y-2">{children}</blockquote>;
    case "rule": return <hr key={key} className="border-border" />;
    case "table": return <div key={key} className="overflow-x-auto"><table className="w-full border-collapse"><tbody>{children}</tbody></table></div>;
    case "tableRow": return <tr key={key}>{children}</tr>;
    case "tableCell": return <td key={key} className="border border-border p-2 align-top">{children}</td>;
    case "tableHeader": return <th key={key} className="border border-border bg-secondary p-2 text-left">{children}</th>;
    case "mention": return <span key={key}>{String(node.attrs?.text ?? "")}</span>;
    case "emoji": return <span key={key}>{String(node.attrs?.text ?? node.attrs?.shortName ?? "")}</span>;
    case "inlineCard": case "blockCard": {
      const href = safeJiraLink(node.attrs?.url);
      return href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{href}</a> : null;
    }
    case "media": return <span key={key} className="text-muted-foreground">{String(node.attrs?.alt ?? "[Anexo no Jira]")}</span>;
    default: return <Fragment key={key}>{children}</Fragment>;
  }
}

export default function JiraDescription({ description }: { description: JiraIssueDetails["description"] }) {
  const document = descriptionDocument(description);
  return <div className="space-y-3 break-words text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
    {documentHasContent(document) && document ? renderNode(document, 0) : <p className="text-muted-foreground">Sem descrição informada</p>}
  </div>;
}