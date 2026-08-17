CREATE TABLE IF NOT EXISTS public.go_sync_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  trigger text NOT NULL DEFAULT 'auto',
  status text NOT NULL DEFAULT 'success',
  modules_pushed integer NOT NULL DEFAULT 0,
  roles_pushed integer NOT NULL DEFAULT 0,
  settings_pushed integer NOT NULL DEFAULT 0,
  signal_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.go_sync_runs TO authenticated;
GRANT ALL ON public.go_sync_runs TO service_role;

ALTER TABLE public.go_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "go_sync_runs_own_read" ON public.go_sync_runs
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.go_is_admin(auth.uid()));

CREATE POLICY "go_sync_runs_own_insert" ON public.go_sync_runs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.go_is_admin(auth.uid()));

CREATE POLICY "go_sync_runs_admin_write" ON public.go_sync_runs
  FOR UPDATE TO authenticated
  USING (public.go_is_admin(auth.uid()))
  WITH CHECK (public.go_is_admin(auth.uid()));

CREATE POLICY "go_sync_runs_admin_delete" ON public.go_sync_runs
  FOR DELETE TO authenticated
  USING (public.go_is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS go_sync_runs_created_idx ON public.go_sync_runs (created_at DESC);

CREATE TRIGGER go_sync_runs_updated_at
  BEFORE UPDATE ON public.go_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
