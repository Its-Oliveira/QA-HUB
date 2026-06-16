import { Link2 } from "lucide-react";
import type { JiraIssueLink } from "@/types/jira";
import { hasIssueLinks, formatIssueLinksTooltip } from "@/utils/jiraLinkUtils";

interface IssueLinkIconProps {
  issuelinks?: JiraIssueLink[] | null;
  className?: string;
}

export function IssueLinkIcon({ issuelinks, className }: IssueLinkIconProps) {
  if (!hasIssueLinks(issuelinks)) return null;

  const links = issuelinks as JiraIssueLink[];
  const tooltip = formatIssueLinksTooltip(links);
  const count = links.length;

  return (
    <span
      title={tooltip}
      aria-label={`${count} card(s) vinculado(s)`}
      className={`inline-flex items-center gap-0.5 ml-1 text-blue-400 align-middle ${className ?? ""}`}
    >
      <Link2 size={13} aria-hidden />
      {count > 1 && (
        <span className="text-[10px] font-medium leading-none">{count}</span>
      )}
    </span>
  );
}

export default IssueLinkIcon;
