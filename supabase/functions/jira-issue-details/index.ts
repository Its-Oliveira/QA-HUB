import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { requireUser } from '../_shared/auth.ts';
import { discoverDetailFields, selectDescription } from './fields.ts';

const Input = z.object({ issueKey: z.string().regex(/^BUG-[1-9]\d*$/, 'Chave de bug inválida') });
const JIRA_URL = 'https://orcafascio.atlassian.net/rest/api/3';
let detailFields: { moduleIds: string[]; descriptionIds: string[]; expires: number } | null = null;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function moduleNames(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(moduleNames);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return moduleNames(obj.name ?? obj.value ?? obj.label);
  }
  return [];
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const unauthorized = await requireUser(req, corsHeaders);
  if (unauthorized) return unauthorized;
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  try {
    const parsed = Input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Informe uma chave de bug válida.' }, 400);
    const email = Deno.env.get('JIRA_EMAIL');
    const token = Deno.env.get('JIRA_API_TOKEN');
    if (!email || !token) return json({ error: 'Credenciais do Jira não configuradas.' }, 503);
    const headers = { Authorization: `Basic ${btoa(`${email}:${token}`)}`, Accept: 'application/json' };
    // Cache field metadata, never credentials or issue content.
    if (!detailFields || detailFields.expires < Date.now()) {
      const fieldsResponse = await fetch(`${JIRA_URL}/field`, { headers });
      if (!fieldsResponse.ok) {
        const details = await fieldsResponse.text();
        console.error(`Jira field request failed [${fieldsResponse.status}]: ${details}`);
        return json({ error: 'Não foi possível identificar os campos do Jira.', status: fieldsResponse.status, details }, fieldsResponse.status);
      }
      const fields = await fieldsResponse.json();
      detailFields = { ...discoverDetailFields(Array.isArray(fields) ? fields : []), expires: Date.now() + 300_000 };
    }
    const fields = ['summary', 'components', 'priority', 'description', ...detailFields.moduleIds, ...detailFields.descriptionIds];
    const response = await fetch(`${JIRA_URL}/issue/${encodeURIComponent(parsed.data.issueKey)}?fields=${fields.join(',')}`, { headers });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Jira issue request failed [${response.status}]: ${details}`);
      return json({ error: response.status === 404 ? 'Este bug não foi encontrado no Jira.' : 'Não foi possível carregar os detalhes no Jira.', status: response.status, details }, response.status);
    }
    const issue = await response.json();
    const data = issue.fields ?? {};
    const components = moduleNames(data.components);
    const modules = components.length ? components : detailFields.moduleIds.flatMap(id => moduleNames(data[id]));
    return json({ key: issue.key, summary: data.summary || issue.key, modules: [...new Set(modules)], priority: data.priority?.name ?? null, description: selectDescription(data, detailFields.descriptionIds) });
  } catch (error) {
    console.error('Jira issue details failed:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Não foi possível carregar os detalhes. Tente novamente.' }, 500);
  }
});