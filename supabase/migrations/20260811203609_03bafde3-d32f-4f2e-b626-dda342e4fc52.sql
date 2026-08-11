-- ============ 1. profiles: colonnes MiPROJET Go ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS export_unlocked_until timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username)) WHERE username IS NOT NULL;

UPDATE public.profiles
SET full_name = NULLIF(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), '')
WHERE full_name IS NULL;

-- ============ 2. helper admin ============
CREATE OR REPLACE FUNCTION public.go_is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  );
$$;

-- ============ 3. produits ============
CREATE TABLE IF NOT EXISTS public.produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nom text NOT NULL,
  prix_unitaire numeric NOT NULL DEFAULT 0,
  categorie text NOT NULL DEFAULT 'Divers',
  unite text,
  actif boolean NOT NULL DEFAULT true,
  stock_actif boolean NOT NULL DEFAULT false,
  stock_actuel numeric NOT NULL DEFAULT 0,
  seuil_alerte numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produits TO authenticated;
GRANT ALL ON public.produits TO service_role;
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "produits_own_or_admin" ON public.produits;
CREATE POLICY "produits_own_or_admin" ON public.produits FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.go_is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.go_is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS produits_user_nom_idx ON public.produits (user_id, nom);

-- ============ 4. operations ============
CREATE TABLE IF NOT EXISTS public.operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('entree','sortie')),
  montant numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  categorie text NOT NULL DEFAULT 'Divers',
  mode_paiement text NOT NULL DEFAULT 'especes',
  note text,
  date_operation timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manuel',
  produit_id uuid REFERENCES public.produits(id) ON DELETE SET NULL,
  quantite numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations TO authenticated;
GRANT ALL ON public.operations TO service_role;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operations_own_or_admin" ON public.operations;
CREATE POLICY "operations_own_or_admin" ON public.operations FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.go_is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.go_is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS operations_user_date_idx ON public.operations (user_id, date_operation DESC);

-- ============ 5. activity_settings ============
CREATE TABLE IF NOT EXISTS public.activity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  activity_name text NOT NULL,
  activity_type text NOT NULL DEFAULT 'boutique',
  owner_name text,
  phone text,
  address text,
  city text,
  description text,
  slogan text,
  email text,
  whatsapp text,
  facebook text,
  instagram text,
  tiktok text,
  website text,
  opening_hours text,
  currency text NOT NULL DEFAULT 'XOF',
  latitude numeric,
  longitude numeric,
  photos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_settings TO authenticated;
GRANT ALL ON public.activity_settings TO service_role;
ALTER TABLE public.activity_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_settings_own_or_admin" ON public.activity_settings;
CREATE POLICY "activity_settings_own_or_admin" ON public.activity_settings FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.go_is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.go_is_admin(auth.uid()));

-- ============ 6. import_sessions ============
CREATE TABLE IF NOT EXISTS public.import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  statut text NOT NULL DEFAULT 'valide',
  operations_extraites jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_sessions TO authenticated;
GRANT ALL ON public.import_sessions TO service_role;
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "import_sessions_own_or_admin" ON public.import_sessions;
CREATE POLICY "import_sessions_own_or_admin" ON public.import_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.go_is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.go_is_admin(auth.uid()));

-- ============ 7. export_audit_logs ============
CREATE TABLE IF NOT EXISTS public.export_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_phone text,
  periode_start timestamptz,
  type_filter text,
  query_text text,
  rows_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.export_audit_logs TO authenticated;
GRANT ALL ON public.export_audit_logs TO service_role;
ALTER TABLE public.export_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "export_audit_admin_read" ON public.export_audit_logs;
CREATE POLICY "export_audit_admin_read" ON public.export_audit_logs FOR SELECT TO authenticated
  USING (public.go_is_admin(auth.uid()));
DROP POLICY IF EXISTS "export_audit_admin_insert" ON public.export_audit_logs;
CREATE POLICY "export_audit_admin_insert" ON public.export_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.go_is_admin(auth.uid()) AND admin_user_id = auth.uid());

-- ============ 8. updated_at triggers ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['produits','operations','activity_settings','import_sessions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============ 9. stock automatique ============
CREATE OR REPLACE FUNCTION public.go_adjust_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.produit_id IS NOT NULL AND coalesce(NEW.quantite,0) <> 0 THEN
    UPDATE public.produits
    SET stock_actuel = stock_actuel + CASE WHEN NEW.type = 'entree' THEN -NEW.quantite ELSE NEW.quantite END
    WHERE id = NEW.produit_id AND stock_actif = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS go_adjust_stock_trg ON public.operations;
CREATE TRIGGER go_adjust_stock_trg AFTER INSERT ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.go_adjust_stock();

-- ============ 10. recherche produit ============
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS produits_nom_trgm_idx ON public.produits USING gin (nom gin_trgm_ops);