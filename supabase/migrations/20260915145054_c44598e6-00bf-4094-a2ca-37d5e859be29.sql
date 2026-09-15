REVOKE ALL ON FUNCTION public.cleanup_old_completed_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_completed_reminders() TO service_role;