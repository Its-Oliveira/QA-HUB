import Anthropic from 'npm:@anthropic-ai/sdk'
import { requireUser } from '../_shared/auth.ts'
import { adfToText } from '../_shared/adf.ts'
import { OUTPUT_SCHEMA, SYSTEM_PROMPT } from './prompt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JIRA_DOMAIN = 'orcafascio.atlassian.net'
const MODEL = 'claude-opus-5-5'
const MAX_TEXT = 20_000
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

async function fetchIssue(key: string) {
  const email = Deno.env.get('JIRA_EMAIL')
  const token = Deno.env.get('JIRA_API_TOKEN')
  if (!email || !token) throw new Error('Credenciais do Jira não configuradas')

  const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/issue/${key}?expand=names`, {
    headers: { 'Authorization': `Basic ${btoa(`${email}:${token}`)}`, 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`Jira API ${res.status}: ${await res.text()}`)
  const issue = await res.json()

  const names: Record<string, string> = issue.names || {}
  const problemFieldId = Object.keys(names).find(
    (id) => names[id]?.trim().toLowerCase() === PROBLEM_FIELD_NAME,
  )
  const problemText = problemFieldId ? adfToText(issue.fields?.[problemFieldId]) : ''

  return {
    titulo: issue.fields?.summary || key,
    texto: problemText || adfToText(issue.fields?.description),
    anexos: describeAttachments(issue.fields?.attachment),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const unauthorized = await requireUser(req, corsHeaders)
  if (unauthorized) return unauthorized

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY não configurada' }, 500)

    const body = await req.json().catch(() => ({}))
    const key = String(body.key || '').trim().toUpperCase()
    if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key)) return json({ error: 'Key do card inválida' }, 400)

    // Na primeira chamada o original vem do Jira; ao gerar de novo, o front
    // manda o original (possivelmente editado pelo QA).
    const original = typeof body.texto === 'string'
      ? { titulo: String(body.titulo || key), texto: body.texto, anexos: String(body.anexos || 'nenhum') }
      : await fetchIssue(key)

    if (!original.texto.trim()) return json({ error: 'O card não tem texto para reescrever', original }, 422)
    if (original.texto.length > MAX_TEXT) return json({ error: 'Texto do card muito longo' }, 413)

    const client = new Anthropic({ apiKey })
    // `fallbacks` ainda pode não estar nos tipos do SDK; o corpo vai igual para a API.
    const params = {
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `### Original\nTítulo: ${original.titulo}\n${original.texto}\nAnexos da issue: ${original.anexos}`,
      }],
    }
    const response = await client.beta.messages.create(
      params as unknown as Parameters<typeof client.beta.messages.create>[0],
    ) as Anthropic.Beta.BetaMessage

    if (response.stop_reason === 'refusal') {
      return json({ error: 'A IA recusou reescrever este card', original }, 502)
    }
    if (response.stop_reason === 'max_tokens') {
      return json({ error: 'A resposta da IA foi cortada; tente de novo', original }, 502)
    }
    const block = response.content.find((b) => b.type === 'text')
    const text = block?.type === 'text' ? block.text : undefined
    if (!text) return json({ error: 'A IA não retornou conteúdo', original }, 502)

    return json({ original, rewritten: JSON.parse(text) })
  } catch (err) {
    console.error('Rewrite error:', err)
    const message = err instanceof Anthropic.APIError ? `IA: ${err.status} ${err.message}` : (err as Error).message
    return json({ error: message }, 500)
  }
})
