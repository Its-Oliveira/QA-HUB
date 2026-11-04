import { requireUser } from '../_shared/auth.ts'
import { adfToText } from '../_shared/adf.ts'

// Busca o texto original de um card no Jira para o botão "Reescrever card com IA".
// A reescrita em si roda na ponte local (scripts/ponte-ia.mjs), com o Claude Code.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JIRA_DOMAIN = 'orcafascio.atlassian.net'
// Nome do campo onde o suporte escreve o card ("Informações principais" no Jira).
// Se a issue não tiver esse campo, cai na descrição padrão.
const PROBLEM_FIELD_NAME = 'descrição do problema'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

/** Resume os anexos só por tipo; nomes de arquivo podem ter dados do cliente. */
function describeAttachments(attachments: { mimeType?: string; filename?: string }[] = []): string {
  if (attachments.length === 0) return 'nenhum'
  const counts: Record<string, number> = {}
  for (const a of attachments) {
    const mime: string = a.mimeType || ''
    const name: string = (a.filename || '').toLowerCase()
    const kind = mime.startsWith('image/') ? 'imagem'
      : mime.startsWith('video/') ? 'vídeo'
      : /sheet|excel|csv/.test(mime) || /\.(xlsx?|csv)$/.test(name) ? 'planilha'
      : mime === 'application/pdf' ? 'PDF'
      : 'arquivo'
    counts[kind] = (counts[kind] || 0) + 1
  }
  return Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const unauthorized = await requireUser(req, corsHeaders)
  if (unauthorized) return unauthorized

  try {
    const email = Deno.env.get('JIRA_EMAIL')
    const token = Deno.env.get('JIRA_API_TOKEN')
    if (!email || !token) return json({ error: 'Credenciais do Jira não configuradas' }, 500)

    const body = await req.json().catch(() => ({}))
    const key = String(body.key || '').trim().toUpperCase()
    if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key)) return json({ error: 'Key do card inválida' }, 400)

    const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/issue/${key}?expand=names`, {
      headers: { 'Authorization': `Basic ${btoa(`${email}:${token}`)}`, 'Accept': 'application/json' },
    })
    if (!res.ok) return json({ error: `Jira API ${res.status}: ${await res.text()}` }, 502)
    const issue = await res.json()

    const names: Record<string, string> = issue.names || {}
    const problemFieldId = Object.keys(names).find(
      (id) => names[id]?.trim().toLowerCase() === PROBLEM_FIELD_NAME,
    )
    const problemText = problemFieldId ? adfToText(issue.fields?.[problemFieldId]) : ''

    return json({
      original: {
        titulo: issue.fields?.summary || key,
        texto: problemText || adfToText(issue.fields?.description),
        anexos: describeAttachments(issue.fields?.attachment),
      },
    })
  } catch (err) {
    console.error('Jira card text error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
