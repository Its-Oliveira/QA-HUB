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
