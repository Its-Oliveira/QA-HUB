import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Triggers a Cypress run in an external GitHub repository via repository_dispatch,
// creating a `test_runs` row (status=queued) that the workflow will update by
// calling this project's `test-run-webhook` function with the correlation_id.

interface TriggerBody {
  branch: string;
  environment: string;
  spec?: string | null;
  triggered_by: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as TriggerBody;
    if (!body?.branch || !body?.environment || !body?.triggered_by) {
      return new Response(JSON.stringify({ error: 'branch, environment e triggered_by são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GITHUB_TOKEN = Deno.env.get('GITHUB_PAT');
    const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER');
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO');

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return new Response(
        JSON.stringify({ error: 'Configuração incompleta: defina GITHUB_PAT, GITHUB_OWNER e GITHUB_REPO nos secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const correlation_id = crypto.randomUUID();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Insert queued row first
    const { error: insertError } = await supabase.from('test_runs').insert({
      correlation_id,
      status: 'queued',
      branch: body.branch,
      environment: body.environment,
      spec: body.spec || null,
      triggered_by: body.triggered_by,
    });
    if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

    // Dispatch to GitHub Actions
    const ghRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'cypress-run',
          client_payload: {
            correlation_id,
            branch: body.branch,
            environment: body.environment,
            spec: body.spec || '',
            triggered_by: body.triggered_by,
          },
        }),
      }
    );

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.error(`GitHub dispatch failed [${ghRes.status}]:`, errText);
      await supabase
        .from('test_runs')
        .update({ status: 'error_ao_disparar', finished_at: new Date().toISOString() })
        .eq('correlation_id', correlation_id);
      return new Response(
        JSON.stringify({ error: 'GitHub dispatch failed', status: ghRes.status, details: errText }),
        { status: ghRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ ok: true, correlation_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trigger-cypress-run error:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
