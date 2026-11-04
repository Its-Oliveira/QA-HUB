# Architecture rules

- Fetch full Jira issue details on demand through an authenticated edge function using existing server credentials; keep the listing sync unchanged to avoid schema changes and preserve original descriptions.
- Render Jira descriptions through an allowlisted document tree, never raw HTML, so external issue content cannot execute scripts.