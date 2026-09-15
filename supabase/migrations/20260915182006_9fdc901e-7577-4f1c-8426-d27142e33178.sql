CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  spec TEXT NOT NULL,
  describe_path TEXT[] NOT NULL DEFAULT '{}',
  title TEXT NOT NULL,
  full_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  duration_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  screenshot TEXT,
  video TEXT,
  source_line INTEGER,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.test_results TO authenticated;
GRANT ALL ON public.test_results TO service_role;

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read test results"
ON public.test_results
FOR SELECT
TO authenticated
USING (true);

CREATE UNIQUE INDEX test_results_unique_test
ON public.test_results (run_id, spec, full_title);

CREATE INDEX test_results_run_idx ON public.test_results (run_id);

CREATE TRIGGER update_test_results_updated_at
BEFORE UPDATE ON public.test_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.test_results REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_results;