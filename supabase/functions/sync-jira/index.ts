import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JIRA_DOMAIN = 'orcafascio.atlassian.net'
const JIRA_PROJECT = 'BUG'

const STATUS_MAP: Record<string, string> = {
  'backlog': 'Backlog',
  'em revisão qa': 'Em Revisão QA',
  'em revisão': 'Em Revisão QA',
  'revisão qa': 'Em Revisão QA',
  'qa review': 'Em Revisão QA',
  'em produção': 'Em Produção',
  'produção': 'Em Produção',
  'production': 'Em Produção',
  'done': 'Em Produção',
}

const PRIORITY_MAP: Record<string, string> = {
  'highest': 'HIGH',
  'high': 'HIGH',
  'medium': 'MEDIUM',
  'low': 'LOW',
  'lowest': 'LOW',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const jiraEmail = Deno.env.get('JIRA_EMAIL')
    const jiraToken = Deno.env.get('JIRA_API_TOKEN')
    
    if (!jiraEmail || !jiraToken) {
      return new Response(JSON.stringify({ error: 'Credenciais do Jira não configuradas' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const auth = btoa(`${jiraEmail}:${jiraToken}`)
    const jql = encodeURIComponent(`project = ${JIRA_PROJECT} ORDER BY created DESC`)
    const url = `https://${JIRA_DOMAIN}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,description,status,priority,assignee,created`

    const jiraRes = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      }
    })

    if (!jiraRes.ok) {
      const errText = await jiraRes.text()
      return new Response(JSON.stringify({ error: `Erro da API Jira: ${jiraRes.status}`, details: errText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const jiraData = await jiraRes.json()
    const issues = jiraData.issues || []

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let synced = 0
    let skipped = 0

    for (const issue of issues) {
      const fields = issue.fields
      const statusName = fields.status?.name?.toLowerCase() || ''
      const mappedStatus = STATUS_MAP[statusName]

      if (!mappedStatus) {
        skipped++
        continue
      }

      const priorityName = fields.priority?.name?.toLowerCase() || 'medium'
      const mappedPriority = PRIORITY_MAP[priorityName] || 'MEDIUM'

      const assigneeName = fields.assignee?.displayName || ''
      const avatar = assigneeName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

      // Extract plain text from Jira's ADF description
      let description = ''
      if (fields.description?.content) {
        description = fields.description.content
          .flatMap((block: any) => block.content?.map((c: any) => c.text) || [])
          .join(' ')
      }

      const { error } = await supabase.from('jira_cards').upsert({
        key: issue.key,
        title: fields.summary || issue.key,
        description,
        status: mappedStatus,
        priority: mappedPriority,
        assignee: assigneeName,
        assignee_avatar: avatar,
        jira_synced: true,
      }, { onConflict: 'key' })

      if (!error) synced++
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total: issues.length, 
      synced, 
      skipped,
      message: `${synced} cards sincronizados, ${skipped} ignorados (status não mapeado)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
