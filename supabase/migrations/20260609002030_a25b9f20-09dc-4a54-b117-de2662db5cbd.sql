
-- Promeut le compte admin (0710262875) en role 'admin'
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = '0710262875@maestrabook.app'
ON CONFLICT (user_id, role) DO NOTHING;

-- Permet à l'admin de créer des comptes vendeurs via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.admin_create_vendeur(_phone text, _password text, _full_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seul un admin peut créer des vendeurs';
  END IF;
  -- Cette fonction reste un placeholder; la création réelle de l'auth user
  -- se fait côté serverFn via supabaseAdmin.
  RETURN NULL;
END;
$$;

-- Vue pour l'admin: liste des utilisateurs avec rôle
CREATE OR REPLACE VIEW public.users_overview
WITH (security_invoker=on) AS
  SELECT p.id, p.full_name, p.phone, p.created_at,
    COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}')::text[] AS roles
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  GROUP BY p.id, p.full_name, p.phone, p.created_at;

GRANT SELECT ON public.users_overview TO authenticated;
