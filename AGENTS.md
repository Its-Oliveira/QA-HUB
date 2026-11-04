# Architecture rules

- Fetch full Jira issue details on demand through an authenticated edge function using existing server credentials; keep the listing sync unchanged to avoid schema changes and preserve original descriptions.
- Resolve company-specific Jira description fields through field metadata, prioritizing the problem-description field and falling back to the standard description, because Jira screens can use custom fields instead of the standard one.
- Render Jira descriptions through an allowlisted document tree, never raw HTML, so external issue content cannot execute scripts.