
CREATE TABLE public.export_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_phone text,
  periode_start timestamptz,
  type_filter text NOT NULL DEFAULT 'all',
  query_text text,
  rows_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.export_audit_logs TO authenticated;
GRANT ALL ON public.export_audit_logs TO service_role;

ALTER TABLE public.export_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read export audit"
  ON public.export_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert export audit"
  ON public.export_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
