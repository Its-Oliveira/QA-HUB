-- Clients may read history; only trusted Edge Functions may write it.
DROP POLICY "Authenticated users full access test_runs" ON public.test_runs;
REVOKE INSERT, UPDATE, DELETE ON public.test_runs FROM authenticated;
CREATE POLICY "Read test runs" ON public.test_runs FOR SELECT TO authenticated USING (true);
ALTER TABLE public.test_runs ADD COLUMN workflow_id TEXT, ADD COLUMN workflow_name TEXT,
 ADD COLUMN commit_sha TEXT, ADD COLUMN actor_id UUID REFERENCES auth.users(id),
 ADD COLUMN jobs JSONB NOT NULL DEFAULT '[]', ADD COLUMN failures JSONB NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX test_runs_github_id ON public.test_runs(github_run_id) WHERE github_run_id IS NOT NULL;
CREATE UNIQUE INDEX test_runs_active_dispatch ON public.test_runs(workflow_id, branch)
 WHERE status IN ('queued','in_progress','em_execucao') AND workflow_id IS NOT NULL AND actor_id IS NOT NULL;
CREATE TABLE public.actions_cache (key TEXT PRIMARY KEY, value JSONB NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
ALTER TABLE public.actions_cache ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.actions_audit (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES auth.users(id),
 actor TEXT NOT NULL, workflow_id TEXT NOT NULL, branch TEXT NOT NULL,
 correlation_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.actions_audit ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.actions_cache, public.actions_audit TO service_role;

-- Associate an API dispatch with its run atomically, including an early webhook row.
CREATE FUNCTION public.bind_workflow_run(local_id UUID, run_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 DELETE FROM public.test_runs WHERE github_run_id = run_id AND actor_id IS NULL AND id <> local_id;
 UPDATE public.test_runs SET github_run_id = run_id WHERE id = local_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Local dispatch not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.bind_workflow_run(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bind_workflow_run(UUID, TEXT) TO service_role;