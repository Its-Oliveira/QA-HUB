
CREATE TABLE public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL UNIQUE,
  github_run_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  branch TEXT NOT NULL,
  environment TEXT NOT NULL,
  spec TEXT,
  triggered_by TEXT NOT NULL,
  total INT,
  passed INT,
  failed INT,
  skipped INT,
  duration_ms INT,
  report_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_runs TO authenticated;
GRANT ALL ON public.test_runs TO service_role;

ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access test_runs"
  ON public.test_runs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_test_runs_created_at ON public.test_runs (created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.test_runs;
ALTER TABLE public.test_runs REPLICA IDENTITY FULL;
