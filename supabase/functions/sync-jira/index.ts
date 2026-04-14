import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

async function fetchAllIssues(auth: string): Promise<any[]> {
  const allIssues: any[] = []
  let startAt = 0
  const maxResults = 100
  const jql = `project = ${JIRA_PROJECT} AND issuetype != Sub-task ORDER BY created DESC`

  while (true) {
    const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=summary,description,status,priority,assignee,created`

    const res = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      }
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Jira API ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const issues = data.issues || []
    allIssues.push(...issues)

    console.log(`Fetched page: startAt=${startAt}, received=${issues.length}, total=${data.total}`)

    if (startAt + issues.length >= data.total || issues.length === 0) break
    startAt += maxResults
  }

  // Deduplicate by key
  const seen = new Set<string>()
  return allIssues.filter(issue => {
    if (seen.has(issue.key)) return false
    seen.add(issue.key)
    return true
  })
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
    const allIssues = await fetchAllIssues(auth)

    console.log(`Total unique issues fetched: ${allIssues.length}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let synced = 0
    let skipped = 0
    const syncedKeys: string[] = []
    const unmappedStatuses = new Set<string>()

    for (const issue of allIssues) {
      const fields = issue.fields
      const statusName = fields.status?.name?.toLowerCase() || ''
      const mappedStatus = STATUS_MAP[statusName]

      if (!mappedStatus) {
        unmappedStatuses.add(fields.status?.name || 'unknown')
        skipped++
        continue
      }

      const priorityName = fields.priority?.name?.toLowerCase() || 'medium'
      const mappedPriority = PRIORITY_MAP[priorityName] || 'MEDIUM'

      const assigneeName = fields.assignee?.displayName || ''
      const avatar = assigneeName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

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

      if (!error) {
        synced++
        syncedKeys.push(issue.key)
      }
    }

    // Remove stale jira-synced cards that no longer exist in Jira response
    if (syncedKeys.length > 0) {
      const { data: deleted, error: delError } = await supabase
        .from('jira_cards')
        .delete()
        .eq('jira_synced', true)
        .not('key', 'in', `(${syncedKeys.join(',')})`)
        .select('key')

      const removedCount = deleted?.length || 0
      if (removedCount > 0) {
        console.log(`Removed ${removedCount} stale cards: ${deleted?.map((d: any) => d.key).join(', ')}`)
      }
      if (delError) {
        console.error('Error removing stale cards:', delError)
      }

      return new Response(JSON.stringify({ 
        success: true, 
        total: allIssues.length, 
        synced, 
        skipped,
        removed: removedCount,
        unmappedStatuses: Array.from(unmappedStatuses),
        message: `${synced} sincronizados, ${skipped} ignorados, ${removedCount} removidos`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total: allIssues.length, 
      synced, 
      skipped,
      removed: 0,
      unmappedStatuses: Array.from(unmappedStatuses),
      message: `${synced} sincronizados, ${skipped} ignorados`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Sync error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
