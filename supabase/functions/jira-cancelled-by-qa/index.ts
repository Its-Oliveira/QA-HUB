// Edge function: Relatório "Cancelados pelo QA" do mês corrente.
//
// REGRA DE NEGÓCIO (não alterar sem revisão):
// - Projeto Jira: "Bugs OrçaFascio" (Orçafascio)
// - Tipo permitido: "BUG cliente" APENAS
// - Tipos EXCLUÍDOS de qualquer contagem: "BUG Backoffice", "BUG QA", "BUG DEV"
// - Resolução filtrada (case-sensitive): "Card Cancelado pelo QA"
// - Período: do dia 01 do mês corrente até o instante da consulta.
//
// Reutiliza JIRA_EMAIL / JIRA_API_TOKEN.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIRA_DOMAIN = "orcafascio.atlassian.net";
const JIRA_PROJECT = '"Bugs OrçaFascio"';
const JIRA_ISSUETYPE = '"BUG cliente"';

async function fetchAllIssues(auth: string, jql: string, fields: string): Promise<any[]> {
  const all: any[] = [];
  let nextPageToken: string | undefined;
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

    // Query A — Cancelados pelo QA no mês
    const jqlCancelled = `project = ${JIRA_PROJECT} AND issuetype = ${JIRA_ISSUETYPE} AND status in ("Done", "Concluído") AND resolution = "Card Cancelado pelo QA" AND resolutiondate >= startOfMonth() AND resolutiondate <= now() ORDER BY resolutiondate DESC`;
    // Query B — Total criados no mês
    const jqlTotal = `project = ${JIRA_PROJECT} AND issuetype = ${JIRA_ISSUETYPE} AND created >= startOfMonth() AND created <= now() ORDER BY created DESC`;

    console.log("JQL cancelled:", jqlCancelled);
    console.log("JQL total:", jqlTotal);

    const fieldsCancelled = "summary,status,resolution,resolutiondate,assignee,created,issuetype";
    const fieldsTotal = "summary,created,issuetype";

    const [cancelledRaw, totalRaw] = await Promise.all([
      fetchAllIssues(auth, jqlCancelled, fieldsCancelled),
      fetchAllIssues(auth, jqlTotal, fieldsTotal),
    ]);

    const cancelled = cancelledRaw.map((i: any) => ({
      key: i.key,
      jiraUrl: `https://${JIRA_DOMAIN}/browse/${i.key}`,
      summary: i.fields?.summary || "",
      status: i.fields?.status?.name || "",
      resolution: i.fields?.resolution?.name || "",
      resolutionDate: i.fields?.resolutiondate || null,
      assigneeDisplayName: i.fields?.assignee?.displayName || null,
      created: i.fields?.created || null,
      issuetype: i.fields?.issuetype?.name || "",
    }));

    return new Response(
      JSON.stringify({
        cancelled,
        cancelledCount: cancelled.length,
        totalCount: totalRaw.length,
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
