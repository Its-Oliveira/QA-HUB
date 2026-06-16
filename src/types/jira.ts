export interface JiraIssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
}

export interface JiraLinkedIssue {
  id: string;
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
  };
}

export interface JiraIssueLink {
  id: string;
  type: JiraIssueLinkType;
  inwardIssue?: JiraLinkedIssue;
  outwardIssue?: JiraLinkedIssue;
}
