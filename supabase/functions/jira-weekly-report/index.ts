// Edge function: busca todos os cards abertos do Jira para o relatório semanal.
// Reutiliza as credenciais (JIRA_EMAIL / JIRA_API_TOKEN) da integração existente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIRA_DOMAIN = "orcafascio.atlassian.net";
const JIRA_PROJECT = '"Bugs OrçaFascio"';
const JIRA_ISSUETYPE = '"BUG cliente"';
const JIRA_STATUSES = [
  "Backlog",
  "Não Iniciado",
  "Em Desenvolvimento",
  "Merge Request",
  "Revisão QA",
  "Reprovado QA",
  "Revert",
];

async function fetchAllIssues(auth: string): Promise<any[]> {
  const all: any[] = [];
  let nextPageToken: string | undefined;
  const statusList = JIRA_STATUSES.map((s) => `"${s}"`).join(", ");
  const jql = `project = ${JIRA_PROJECT} AND issuetype = ${JIRA_ISSUETYPE} AND status in (${statusList}) ORDER BY created DESC`;
  console.log("JQL:", jql);
  const fields = "summary,status,labels,components,created,issuetype";

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
    const issues = await fetchAllIssues(auth);

    const simplified = issues.map((i: any) => ({
      key: i.key,
      url: `https://${JIRA_DOMAIN}/browse/${i.key}`,
      summary: i.fields?.summary || "",
      status: i.fields?.status?.name || "",
      labels: i.fields?.labels || [],
      components: (i.fields?.components || []).map((c: any) => c.name),
      created: i.fields?.created || null,
      issuetype: i.fields?.issuetype?.name || "",
    }));

    return new Response(JSON.stringify({ issues: simplified, total: simplified.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
