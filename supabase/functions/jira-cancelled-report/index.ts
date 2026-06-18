// Edge function: busca cards do Jira cancelados pelo QA no mês atual.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIRA_DOMAIN = "orcafascio.atlassian.net";
const JIRA_PROJECT = '"Bugs OrçaFascio"';
const JIRA_ISSUETYPE = '"BUG cliente"';
const JIRA_RESOLUTION = '"Cancelado QA"';

async function fetchAllIssues(auth: string): Promise<any[]> {
  const all: any[] = [];
  let nextPageToken: string | undefined;
  const jql = `project = ${JIRA_PROJECT} AND issuetype = ${JIRA_ISSUETYPE} AND resolution = ${JIRA_RESOLUTION} AND created >= startOfMonth() AND created <= now() ORDER BY created DESC`;
  console.log("JQL:", jql);
  const fields = "summary,status,resolution,assignee,created,resolutiondate,issuetype,issuelinks";

  while (true) {
    let url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql?jql=${encodeURIComponent(
      jql
    )}&maxResults=100&fields=${fields}`;
    if (nextPageToken) url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Jira ${res.status}: ${t}`);
    }
    const data = await res.json();
    const issues = data.issues || [];
    all.push(...issues);
    if (!data.nextPageToken || issues.length === 0) break;
    nextPageToken = data.nextPageToken;
  }

  const seen = new Set<string>();
  return all.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)));
}

async function fetchTotalMonth(auth: string): Promise<number> {
  const jql = `project = ${JIRA_PROJECT} AND issuetype = ${JIRA_ISSUETYPE} AND created >= startOfMonth() AND created <= now()`;
  const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql?jql=${encodeURIComponent(
    jql
  )}&maxResults=0&fields=summary`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const email = Deno.env.get("JIRA_EMAIL");
    const token = Deno.env.get("JIRA_API_TOKEN");
    if (!email || !token) {
      return new Response(JSON.stringify({ error: "Credenciais do Jira não configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const auth = btoa(`${email}:${token}`);
    const [issues, totalMonth] = await Promise.all([fetchAllIssues(auth), fetchTotalMonth(auth)]);

    const simplified = issues.map((i: any) => ({
      key: i.key,
      url: `https://${JIRA_DOMAIN}/browse/${i.key}`,
      summary: i.fields?.summary || "",
      status: i.fields?.status?.name || "",
      resolution: i.fields?.resolution?.name || "",
      assignee: i.fields?.assignee?.displayName || "Não atribuído",
      assigneeAvatar: i.fields?.assignee?.avatarUrls?.["24x24"] || "",
      created: i.fields?.created || null,
      resolutiondate: i.fields?.resolutiondate || null,
      issuelinks: Array.isArray(i.fields?.issuelinks) ? i.fields.issuelinks : [],
    }));

    return new Response(
      JSON.stringify({
        issues: simplified,
        totalCancelled: simplified.length,
        totalMonth,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
