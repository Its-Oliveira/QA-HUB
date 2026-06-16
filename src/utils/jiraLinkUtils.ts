import type { JiraIssueLink } from "@/types/jira";

/**
 * Verifica se um card possui ao menos um vínculo
 */
export function hasIssueLinks(issuelinks?: JiraIssueLink[] | null): boolean {
  return Array.isArray(issuelinks) && issuelinks.length > 0;
}

/**
 * Formata os vínculos para exibição em tooltip
 * Exemplo: "QA-42 · relates to\nQA-15 · is related to"
 */
export function formatIssueLinksTooltip(issuelinks: JiraIssueLink[]): string {
  return issuelinks
    .map((link) => {
      const related = link.outwardIssue ?? link.inwardIssue;
      const direction = link.outwardIssue
        ? link.type?.outward
        : link.type?.inward;
      return `${related?.key ?? "N/A"} · ${direction ?? "linked"}`;
    })
    .join("\n");
}

/**
 * Formata a URL de um card para exportação,
 * adicionando "[Vinculado]" ao final se o card possui vínculos.
 */
export function formatUrlForExport(
  url: string,
  issuelinks?: JiraIssueLink[] | null
): string {
  if (!url) return url;
  if (hasIssueLinks(issuelinks)) {
    return `${url} [Vinculado]`;
  }
  return url;
}
