import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JIRA_DOMAIN = 'orcafascio.atlassian.net'

const PRIORITY_MAP: Record<string, string> = {
  'highest': 'HIGH',
  'high': 'HIGH',
  'medium': 'MEDIUM',
  'low': 'LOW',
  'lowest': 'LOW',
}

function extractText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(extractText).join('')
  if (content.type === 'text') return content.text || ''
  if (content.type === 'hardBreak') return '\n'
  if (content.type === 'paragraph') return extractText(content.content) + '\n\n'
  if (content.content) return extractText(content.content)
  return ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const issueKey = url.searchParams.get('key')

    if (!issueKey) {
      return new Response(JSON.stringify({ error: 'Parâmetro "key" é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const jiraEmail = Deno.env.get('JIRA_EMAIL')
    const jiraToken = Deno.env.get('JIRA_API_TOKEN')

    if (!jiraEmail || !jiraToken) {
      return new Response(JSON.stringify({ error: 'Credenciais do Jira não configuradas' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const auth = btoa(`${jiraEmail}:${jiraToken}`)

    // Fetch issue with all fields
    const issueUrl = `https://${JIRA_DOMAIN}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description,status,priority,assignee,reporter,created,updated,attachment,comment,customfield_*,components,labels,timetracking,issuetype`
    
    const res = await fetch(issueUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      }
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Jira API ${res.status}: ${errText}`)
    }

    const issue = await res.json()
    const fields = issue.fields

    // Extract description as readable text
    const description = fields.description ? extractText(fields.description.content || fields.description).trim() : ''

    // Extract custom fields that might contain the extra metadata
    // We'll send all custom fields and let the frontend pick what it needs
    const customFields: Record<string, any> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith('customfield_') && value != null) {
        // Try to extract displayable value
        if (typeof value === 'string') {
          customFields[key] = value
        } else if (typeof value === 'object' && (value as any).value) {
          customFields[key] = (value as any).value
        } else if (typeof value === 'object' && (value as any).name) {
          customFields[key] = (value as any).name
        } else if (typeof value === 'object' && (value as any).content) {
          customFields[key] = extractText((value as any).content).trim()
        } else if (typeof value === 'number') {
          customFields[key] = value
        }
      }
    }

    // Build attachments list
    const attachments = (fields.attachment || []).map((att: any) => ({
      id: att.id,
      filename: att.filename,
      mimeType: att.mimeType,
      size: att.size,
      created: att.created,
      thumbnail: att.thumbnail,
      content: att.content, // download URL
      author: att.author?.displayName || '',
    }))

    const priorityName = fields.priority?.name?.toLowerCase() || 'medium'

    const result = {
      key: issue.key,
      title: fields.summary || issue.key,
      description,
      status: fields.status?.name || 'Backlog',
      statusCategoryColor: fields.status?.statusCategory?.colorName || 'blue-gray',
      priority: PRIORITY_MAP[priorityName] || 'MEDIUM',
      priorityName: fields.priority?.name || 'Medium',
      assignee: fields.assignee ? {
        name: fields.assignee.displayName,
        avatar: fields.assignee.avatarUrls?.['48x48'] || fields.assignee.avatarUrls?.['32x32'] || '',
      } : null,
      reporter: fields.reporter ? {
        name: fields.reporter.displayName,
        avatar: fields.reporter.avatarUrls?.['48x48'] || fields.reporter.avatarUrls?.['32x32'] || '',
      } : null,
      created: fields.created,
      updated: fields.updated,
      attachments,
      timetracking: fields.timetracking || null,
      labels: fields.labels || [],
      components: (fields.components || []).map((c: any) => c.name),
      issueType: fields.issuetype?.name || 'Bug',
      customFields,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Get issue error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
