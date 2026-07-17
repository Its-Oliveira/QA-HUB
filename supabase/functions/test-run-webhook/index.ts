import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Webhook called by the external GitHub Actions Cypress workflow to update
// a `test_runs` row identified by correlation_id.
// Auth: shared secret via header `X-Webhook-Secret` matching env `TEST_RUN_WEBHOOK_SECRET`.

interface WebhookBody {
  correlation_id: string;
  status?: 'queued' | 'em_execucao' | 'passed' | 'failed' | 'error_ao_disparar';
  github_run_id?: string;
  total?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  duration_ms?: number;
  report_url?: string;
  started_at?: string;
  finished_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const secret = Deno.env.get('TEST_RUN_WEBHOOK_SECRET');
    const provided = req.headers.get('x-webhook-secret');
    if (!secret || provided !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as WebhookBody;
    if (!body?.correlation_id) {
      return new Response(JSON.stringify({ error: 'correlation_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const update: Record<string, unknown> = {};
    const fields: (keyof WebhookBody)[] = [
      'status', 'github_run_id', 'total', 'passed', 'failed', 'skipped',
      'duration_ms', 'report_url', 'started_at', 'finished_at',
    ];
    for (const f of fields) if (body[f] !== undefined) update[f] = body[f];

    // Auto-fill started_at when transitioning to em_execucao
    if (body.status === 'em_execucao' && !body.started_at) {
      update.started_at = new Date().toISOString();
    }
    // Auto-fill finished_at on terminal states
    if ((body.status === 'passed' || body.status === 'failed') && !body.finished_at) {
      update.finished_at = new Date().toISOString();
    }

    const { error } = await supabase.from('test_runs').update(update).eq('correlation_id', body.correlation_id);
    if (error) {
      console.error('DB update failed:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('test-run-webhook error:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
