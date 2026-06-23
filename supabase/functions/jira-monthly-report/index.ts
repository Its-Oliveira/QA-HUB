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

// 4 etapas obrigatórias em ordem cronológica
// (outros status podem ocorrer intercalados sem invalidar a contagem)
const FLOW_STEPS = [
  "Backlog",
  "Em desenvolvimento",
  "Em produção",
  "Concluído",
];

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

async function approximateCount(auth: string, jql: string): Promise<number> {
  try {
    const data = await jiraPost(
      auth,
      `https://${JIRA_DOMAIN}/rest/api/3/search/approximate-count`,
      { jql }
    );
    const c = data?.count ?? data?.total ?? 0;
    if (typeof c === "number" && c >= 0) return c;
  } catch (e) {
    console.log("approximate-count falhou:", (e as Error).message);
  }
  // Fallback: paginar
  const issues = await searchPaginated(auth, jql, "summary");
  return issues.length;
}

// ---------- Indicador 1: fluxo completo ----------
async function fetchChangelog(auth: string, key: string): Promise<any[]> {
  const histories: any[] = [];
  let startAt = 0;
  while (true) {
    const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${encodeURIComponent(
      key
    )}/changelog?startAt=${startAt}&maxResults=100`;
    const data = await jiraFetch(auth, url);
    const values = data?.values || [];
    histories.push(...values);
    if (data?.isLast || values.length === 0) break;
    startAt += values.length;
    if (startAt > 1000) break;
  }
  return histories;
}

// Retorna {completed: boolean, completedAt: string|null}
function evaluateFlow(histories: any[]) {
  // Coletar todas as transições de status: {toStatus, when}
  const transitions: { to: string; when: number }[] = [];
  for (const h of histories) {
    const when = Date.parse(h.created || h.timestamp || "");
    if (!when) continue;
    for (const item of h.items || []) {
      if (item.field === "status" && typeof item.toString === "string") {
        transitions.push({ to: item.toString, when });
      }
    }
  }
  transitions.sort((a, b) => a.when - b.when);

  // Para cada step, encontrar a primeira ocorrência após o tempo do step anterior
  let cursor = -Infinity;
  let lastTime = 0;
  for (const step of FLOW_STEPS) {
    const found = transitions.find((t) => t.to === step && t.when >= cursor);
    if (!found) return { completed: false, completedAt: null as string | null };
    cursor = found.when;
    lastTime = found.when;
  }
  return {
    completed: true,
    completedAt: new Date(lastTime).toISOString(),
  };
}

async function computeFlowCompleted(
  auth: string,
  startDate: string,
  endDate: string
) {
  // JQL: cards no projeto cuja transição "para Concluído" ocorreu no período
  const jql = `project = ${JIRA_PROJECT} AND status changed to "Concluído" DURING ("${jqlDate(
    startDate
  )}", "${jqlDate(endDate)} 23:59")`;
  const issues = await searchPaginated(auth, jql, "summary,status");

  // Concorrência limitada
  const CONC = 8;
  const completed: { key: string; completedAt: string }[] = [];
  let idx = 0;
  async function worker() {
    while (idx < issues.length) {
      const my = idx++;
      const issue = issues[my];
      try {
        const histories = await fetchChangelog(auth, issue.key);
        const ev = evaluateFlow(histories);
        if (ev.completed && ev.completedAt) {
          const t = Date.parse(ev.completedAt);
          const s = Date.parse(startDate + "T00:00:00Z");
          const e = Date.parse(endDate + "T23:59:59Z");
          if (t >= s && t <= e) {
            completed.push({ key: issue.key, completedAt: ev.completedAt });
          }
        }
      } catch (e) {
        console.log("changelog erro", issue.key, (e as Error).message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, issues.length) }, worker));
  return { count: completed.length, sample: completed.slice(0, 50), scanned: issues.length };
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

    const [bugClienteIssuesBlock, bugQACountBlock, flowBlock] = await Promise.all([
      safe(() => fetchBugClienteCreated(auth, startDate, endDate)),
      safe(() =>
        approximateCount(
          auth,
          `project = ${JIRA_PROJECT} AND issuetype = ${IT_BUG_QA} AND created >= "${jqlDate(
            startDate
          )}" AND created <= "${jqlDate(endDate)} 23:59"`
        )
      ),
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

    return new Response(
      JSON.stringify({
        startDate,
        endDate,
        bugCliente,
        bugQA: bugQACountBlock.ok
          ? { totalCreated: bugQACountBlock.value }
          : { error: bugQACountBlock.error },
        flowCompleted: flowBlock.ok
          ? flowBlock.value
          : { error: flowBlock.error },
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
