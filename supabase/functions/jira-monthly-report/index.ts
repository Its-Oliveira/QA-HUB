// Edge: Relatório Mensal de QA
// Isolado. NÃO altera os outros edges.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIRA_DOMAIN = "orcafascio.atlassian.net";
const JIRA_PROJECT = '"Bugs OrçaFascio"';
const IT_BUG_CLIENTE = '"BUG cliente"';
const IT_BUG_QA = '"BUG QA"';
const RESOLUTION_CANCELLED = '"Cancelado QA"';


const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function jqlDate(d: string) {
  // já validado por ISO_DATE; usado dentro de aspas duplas no JQL
  return d;
}

async function jiraFetch(auth: string, url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Jira ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function jiraPost(auth: string, url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Jira ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function searchPaginated(auth: string, jql: string, fields: string) {
  const out: any[] = [];
  let nextPageToken: string | undefined;
  while (true) {
    let url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql?jql=${encodeURIComponent(
      jql
    )}&maxResults=100&fields=${fields}`;
    if (nextPageToken) url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
    const data = await jiraFetch(auth, url);
    const issues = data.issues || [];
    out.push(...issues);
    if (!data.nextPageToken || issues.length === 0) break;
    nextPageToken = data.nextPageToken;
  }
  // dedup
  const seen = new Set<string>();
  return out.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)));
}

// ---------- Indicador 1: cards em Done com resolução "Itens concluídos" ----------
async function computeFlowCompleted(
  auth: string,
  startDate: string,
  endDate: string
) {
  // Observação: filtrar por `resolution = "Itens concluídos"` direto na JQL não
  // funciona neste Jira (provável incompatibilidade de acento/quoting). Buscamos
  // todos os cards em Done no período e filtramos a resolução no código.
  const jql = `project = ${JIRA_PROJECT} AND statusCategory = Done AND resolutiondate >= "${jqlDate(
    startDate
  )}" AND resolutiondate <= "${jqlDate(endDate)} 23:59"`;
  const allIssues = await searchPaginated(
    auth,
    jql,
    "summary,status,resolution,reporter,created,resolutiondate"
  );
  const issues = allIssues.filter(
    (i: any) => (i.fields?.resolution?.name || "") === "Itens concluídos"
  );

  const completed = issues.map((issue: any) => ({
    key: issue.key,
    url: `https://${JIRA_DOMAIN}/browse/${issue.key}`,
    summary: issue.fields?.summary || "",
    reporter: issue.fields?.reporter?.displayName || "Sem relator",
    created: issue.fields?.created || null,
    completedAt: issue.fields?.resolutiondate || "",
  }));
  completed.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return { count: completed.length, issues: completed, scanned: issues.length };
}

async function fetchBugQACreated(
  auth: string,
  startDate: string,
  endDate: string
) {
  const jql = `project = ${JIRA_PROJECT} AND issuetype = ${IT_BUG_QA} AND created >= "${jqlDate(
    startDate
  )}" AND created <= "${jqlDate(endDate)} 23:59" ORDER BY created DESC`;
  return searchPaginated(auth, jql, "summary,reporter,created");
}

// ---------- Indicador 2: BUG CLIENTE criados + cancelados ----------
async function fetchBugClienteCreated(
  auth: string,
  startDate: string,
  endDate: string
) {
  const jql = `project = ${JIRA_PROJECT} AND issuetype = ${IT_BUG_CLIENTE} AND created >= "${jqlDate(
    startDate
  )}" AND created <= "${jqlDate(endDate)} 23:59" ORDER BY created DESC`;
  const fields = "summary,status,resolution,reporter,created,resolutiondate,issuetype,issuelinks";
  return searchPaginated(auth, jql, fields);
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const email = Deno.env.get("JIRA_EMAIL");
    const token = Deno.env.get("JIRA_API_TOKEN");
    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "Credenciais do Jira não configuradas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const auth = btoa(`${email}:${token}`);

    // Período
    const url = new URL(req.url);
    let startDate = url.searchParams.get("startDate") || "";
    let endDate = url.searchParams.get("endDate") || "";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.startDate) startDate = body.startDate;
        if (body?.endDate) endDate = body.endDate;
      } catch {
        // sem body json — usar default abaixo
      }
    }

    // Default: mês vigente
    const now = new Date();
    if (!startDate) {
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, "0");
      startDate = `${y}-${m}-01`;
    }
    if (!endDate) {
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, "0");
      const d = String(now.getUTCDate()).padStart(2, "0");
      endDate = `${y}-${m}-${d}`;
    }

    // Validação anti-injeção JQL
    if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
      return new Response(JSON.stringify({ error: "Datas inválidas (use YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (startDate > endDate) {
      return new Response(JSON.stringify({ error: "Data final anterior à inicial" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const todayISO = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
      now.getUTCDate()
    ).padStart(2, "0")}`;
    if (endDate > todayISO) {
      return new Response(JSON.stringify({ error: "Data final no futuro não permitida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Período:", startDate, "→", endDate);

    // Executar 3 indicadores em paralelo, isolando falhas
    type Block<T> = { ok: true; value: T } | { ok: false; error: string };
    async function safe<T>(fn: () => Promise<T>): Promise<Block<T>> {
      try {
        return { ok: true, value: await fn() };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    }

    const [bugClienteIssuesBlock, bugQAIssuesBlock, flowBlock] = await Promise.all([
      safe(() => fetchBugClienteCreated(auth, startDate, endDate)),
      safe(() => fetchBugQACreated(auth, startDate, endDate)),
      safe(() => computeFlowCompleted(auth, startDate, endDate)),
    ]);

    // Processar BUG CLIENTE — agregação por relator
    let bugCliente: any = { error: !bugClienteIssuesBlock.ok ? bugClienteIssuesBlock.error : null };
    if (bugClienteIssuesBlock.ok) {
      const issues = bugClienteIssuesBlock.value;
      const byReporter = new Map<
        string,
        { reporter: string; created: number; cancelled: number }
      >();
      const cancelledIssues: any[] = [];
      for (const i of issues) {
        const reporter = i.fields?.reporter?.displayName || "Sem relator";
        const isCancelled = (i.fields?.resolution?.name || "") === "Cancelado QA";
        let row = byReporter.get(reporter);
        if (!row) {
          row = { reporter, created: 0, cancelled: 0 };
          byReporter.set(reporter, row);
        }
        row.created += 1;
        if (isCancelled) {
          row.cancelled += 1;
          cancelledIssues.push({
            key: i.key,
            url: `https://${JIRA_DOMAIN}/browse/${i.key}`,
            summary: i.fields?.summary || "",
            reporter,
            created: i.fields?.created || null,
            resolutiondate: i.fields?.resolutiondate || null,
            issuelinks: Array.isArray(i.fields?.issuelinks) ? i.fields.issuelinks : [],
          });
        }
      }
      const totalCreated = issues.length;
      const totalCancelled = cancelledIssues.length;
      const rate = totalCreated > 0 ? (totalCancelled / totalCreated) * 100 : 0;
      const breakdown = Array.from(byReporter.values())
        .map((r) => ({
          ...r,
          rate: r.created > 0 ? (r.cancelled / r.created) * 100 : 0,
        }))
        .sort((a, b) => b.cancelled - a.cancelled || b.created - a.created);
      bugCliente = {
        totalCreated,
        totalCancelled,
        cancellationRate: rate,
        breakdown,
        cancelledIssues,
      };
    }

    // Processar BUG QA — lista enxuta
    let bugQA: any;
    if (bugQAIssuesBlock.ok) {
      const list = bugQAIssuesBlock.value.map((i: any) => ({
        key: i.key,
        url: `https://${JIRA_DOMAIN}/browse/${i.key}`,
        summary: i.fields?.summary || "",
        reporter: i.fields?.reporter?.displayName || "Sem relator",
        created: i.fields?.created || null,
      }));
      bugQA = { totalCreated: list.length, issues: list };
    } else {
      bugQA = { error: bugQAIssuesBlock.error };
    }

    return new Response(
      JSON.stringify({
        startDate,
        endDate,
        bugCliente,
        bugQA,
        flowCompleted: flowBlock.ok ? flowBlock.value : { error: flowBlock.error },
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
