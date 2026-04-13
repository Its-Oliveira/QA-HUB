
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- jira_cards
CREATE TABLE public.jira_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Backlog',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  assignee TEXT DEFAULT '',
  assignee_avatar TEXT DEFAULT '',
  time_indicator TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.jira_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access jira_cards" ON public.jira_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_jira_cards_updated_at BEFORE UPDATE ON public.jira_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- reminders
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Outro',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  completed BOOLEAN NOT NULL DEFAULT false,
  jira_card_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access reminders" ON public.reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- test_entries
CREATE TABLE public.test_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  feature_description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Não iniciado',
  environment TEXT NOT NULL DEFAULT 'staging',
  documentation TEXT DEFAULT '',
  links TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.test_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access test_entries" ON public.test_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_test_entries_updated_at BEFORE UPDATE ON public.test_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- automation_tracker
CREATE TABLE public.automation_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature TEXT DEFAULT '',
  test_file TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pendente',
  last_run_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access automation_tracker" ON public.automation_tracker FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_automation_tracker_updated_at BEFORE UPDATE ON public.automation_tracker FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
