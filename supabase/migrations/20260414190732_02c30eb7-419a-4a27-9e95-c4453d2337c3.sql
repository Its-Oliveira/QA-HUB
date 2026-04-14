
-- Add completed_at column
ALTER TABLE public.reminders ADD COLUMN completed_at timestamp with time zone DEFAULT NULL;

-- Backfill: set completed_at for already-completed reminders
UPDATE public.reminders SET completed_at = updated_at WHERE completed = true AND completed_at IS NULL;

-- Enable extensions for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_completed_reminders()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.reminders
  WHERE completed = true
    AND completed_at IS NOT NULL
    AND completed_at < now() - interval '7 days';
$$;

-- Schedule daily cleanup at 3 AM UTC
SELECT cron.schedule(
  'cleanup-completed-reminders',
  '0 3 * * *',
  $$SELECT public.cleanup_old_completed_reminders();$$
);
