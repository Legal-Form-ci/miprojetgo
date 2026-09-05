-- 1) Fonctions de contrôle d'accès référencées par des policies : doivent rester exécutables
GRANT EXECUTE ON FUNCTION public.go_is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invest_can_read_document_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_any_admin(uuid) TO authenticated;

-- 2) Équipe d'une activité (multi-tenant)
CREATE TABLE IF NOT EXISTS public.go_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_role text NOT NULL DEFAULT 'vendeur',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT go_team_members_role_chk CHECK (team_role IN ('gerant','vendeur','caissier','livreur','autre'))
);
CREATE INDEX IF NOT EXISTS go_team_members_owner_idx ON public.go_team_members(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.go_team_members TO authenticated;
GRANT ALL ON public.go_team_members TO service_role;
ALTER TABLE public.go_team_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.go_is_activity_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('go_admin','admin','super_admin')
  );
$$;
REVOKE ALL ON FUNCTION public.go_is_activity_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.go_is_activity_admin(uuid) TO authenticated, service_role;

-- Responsable -> voit/gère ses lignes et celles de son équipe
CREATE OR REPLACE FUNCTION public.go_can_access_team_row(_row_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = _row_user
    OR public.is_any_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.go_team_members t
      WHERE t.owner_id = auth.uid() AND t.member_id = _row_user AND t.active
    );
$$;
-- Données partagées (produits, paramètres) : en plus, le membre voit celles de son responsable
CREATE OR REPLACE FUNCTION public.go_can_access_shared_row(_row_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.go_can_access_team_row(_row_user)
    OR EXISTS (
      SELECT 1 FROM public.go_team_members t
      WHERE t.member_id = auth.uid() AND t.owner_id = _row_user AND t.active
    );
$$;
REVOKE ALL ON FUNCTION public.go_can_access_team_row(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.go_can_access_shared_row(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.go_can_access_team_row(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.go_can_access_shared_row(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS go_team_members_owner_all ON public.go_team_members;
CREATE POLICY go_team_members_owner_all ON public.go_team_members
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.is_any_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS go_team_members_member_read ON public.go_team_members;
CREATE POLICY go_team_members_member_read ON public.go_team_members
  FOR SELECT TO authenticated USING (member_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at ON public.go_team_members;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.go_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Policies multi-tenant sur les données Go
DROP POLICY IF EXISTS operations_own_or_admin ON public.operations;
DROP POLICY IF EXISTS admin_manage_operations ON public.operations;
CREATE POLICY operations_tenant_access ON public.operations
  FOR ALL TO authenticated
  USING (public.go_can_access_team_row(user_id))
  WITH CHECK (public.go_can_access_team_row(user_id));

DROP POLICY IF EXISTS produits_own_or_admin ON public.produits;
DROP POLICY IF EXISTS admin_manage_produits ON public.produits;
CREATE POLICY produits_tenant_read ON public.produits
  FOR SELECT TO authenticated USING (public.go_can_access_shared_row(user_id));
CREATE POLICY produits_tenant_write ON public.produits
  FOR INSERT TO authenticated WITH CHECK (public.go_can_access_team_row(user_id));
CREATE POLICY produits_tenant_update ON public.produits
  FOR UPDATE TO authenticated USING (public.go_can_access_team_row(user_id)) WITH CHECK (public.go_can_access_team_row(user_id));
CREATE POLICY produits_tenant_delete ON public.produits
  FOR DELETE TO authenticated USING (public.go_can_access_team_row(user_id));

DROP POLICY IF EXISTS activity_settings_own_or_admin ON public.activity_settings;
CREATE POLICY activity_settings_tenant_read ON public.activity_settings
  FOR SELECT TO authenticated USING (public.go_can_access_shared_row(user_id));
CREATE POLICY activity_settings_owner_write ON public.activity_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_any_admin(auth.uid()));
CREATE POLICY activity_settings_owner_update ON public.activity_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_any_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_any_admin(auth.uid()));
CREATE POLICY activity_settings_owner_delete ON public.activity_settings
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_any_admin(auth.uid()));

-- Le responsable peut lire les profils et rôles de son équipe
DROP POLICY IF EXISTS go_owner_view_team_profiles ON public.profiles;
CREATE POLICY go_owner_view_team_profiles ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.go_team_members t WHERE t.owner_id = auth.uid() AND t.member_id = profiles.id));
DROP POLICY IF EXISTS go_owner_view_team_roles ON public.user_roles;
CREATE POLICY go_owner_view_team_roles ON public.user_roles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.go_team_members t WHERE t.owner_id = auth.uid() AND t.member_id = user_roles.user_id));

-- Photos d'activité : l'équipe peut voir celles du responsable
DROP POLICY IF EXISTS "activity-photos_team_read" ON storage.objects;
CREATE POLICY "activity-photos_team_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'activity-photos' AND EXISTS (
    SELECT 1 FROM public.go_team_members t
    WHERE t.member_id = auth.uid() AND t.owner_id::text = (storage.foldername(name))[1] AND t.active
  ));
-- Avatars : le responsable voit ceux de son équipe (et inversement)
DROP POLICY IF EXISTS "avatars_team_read" ON storage.objects;
CREATE POLICY "avatars_team_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND EXISTS (
    SELECT 1 FROM public.go_team_members t
    WHERE t.active AND (
      (t.owner_id = auth.uid() AND t.member_id::text = (storage.foldername(name))[1]) OR
      (t.member_id = auth.uid() AND t.owner_id::text = (storage.foldername(name))[1])
    )
  ));

-- 4) Rôle go_admin pour les comptes Go existants
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'go_admin'
FROM auth.users u
WHERE (u.raw_user_meta_data->>'source_app' = 'miprojet-go'
       OR EXISTS (SELECT 1 FROM public.activity_settings a WHERE a.user_id = u.id))
  AND NOT EXISTS (SELECT 1 FROM public.go_team_members t WHERE t.member_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- 5) Trigger de création de compte : rôle Go + signal uniquement pour Go
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _full_name text;
  _phone text;
  _is_go boolean;
  _go_role text;
BEGIN
  _full_name := NULLIF(BTRIM(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    CONCAT_WS(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
  )), '');
  _phone := NULLIF(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), '[^0-9+]', '', 'g'), '');
  _is_go := COALESCE(NEW.raw_user_meta_data->>'source_app', '') = 'miprojet-go';
  _go_role := COALESCE(NEW.raw_user_meta_data->>'go_role', 'go_admin');

  INSERT INTO public.profiles (id, email, first_name, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(SPLIT_PART(COALESCE(_full_name, ''), ' ', 1), ''), SPLIT_PART(COALESCE(NEW.email, NEW.id::text), '@', 1)),
    _full_name,
    _phone,
    UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _is_go THEN
    IF _go_role = 'go_admin' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'go_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendeur')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    PERFORM public.emit_sync_signal(
      'go.account.created', 'profiles', NEW.id, NEW.id,
      JSONB_BUILD_OBJECT(
        'app', 'miprojet-go',
        'user_id', NEW.id,
        'full_name', _full_name,
        'phone', _phone,
        'role', _go_role,
        'event', 'account_created'
      ),
      'info'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 6) Auto-sync équipe : inclut responsables Go et membres d'équipe
CREATE OR REPLACE FUNCTION public.go_autosync_team_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_user_id uuid;
  v_is_go boolean;
  v_profile record;
  v_roles text[];
  v_owner uuid;
  v_payload jsonb;
  v_signal uuid;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.activity_settings a WHERE a.user_id = v_user_id)
      OR EXISTS (SELECT 1 FROM public.go_team_members t WHERE t.member_id = v_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_user_id AND r.role IN ('go_admin','vendeur'))
    INTO v_is_go;
  IF NOT v_is_go THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, full_name, phone INTO v_profile FROM public.profiles WHERE id = v_user_id;
  SELECT COALESCE(array_agg(r.role ORDER BY r.role), '{}'::text[])
    INTO v_roles FROM public.user_roles r WHERE r.user_id = v_user_id;
  SELECT owner_id INTO v_owner FROM public.go_team_members WHERE member_id = v_user_id LIMIT 1;

  v_payload := jsonb_build_object(
    'app', 'miprojet-go',
    'event', 'go.team.member_synced',
    'operation', TG_OP,
    'user_id', v_user_id,
    'owner_id', v_owner,
    'full_name', v_profile.full_name,
    'phone', v_profile.phone,
    'roles', to_jsonb(v_roles),
    'actor', auth.uid()
  );

  v_signal := public.emit_sync_signal(
    'go.team.member_synced', 'user_roles', v_user_id, auth.uid(), v_payload, 'info'
  );

  INSERT INTO public.go_sync_runs (actor_id, trigger, status, roles_pushed, signal_id, details)
  VALUES (auth.uid(), 'auto_team', 'success', COALESCE(array_length(v_roles, 1), 0), v_signal, v_payload);

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.go_sync_runs (actor_id, trigger, status, details, error)
  VALUES (auth.uid(), 'auto_team', 'error', jsonb_build_object('user_id', v_user_id), SQLERRM);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Sync automatique aussi lors des changements d'équipe
DROP TRIGGER IF EXISTS trg_go_autosync_team_membership ON public.go_team_members;
CREATE OR REPLACE FUNCTION public.go_autosync_team_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_member uuid := COALESCE(NEW.member_id, OLD.member_id);
  v_profile record;
  v_payload jsonb;
  v_signal uuid;
BEGIN
  SELECT id, full_name, phone INTO v_profile FROM public.profiles WHERE id = v_member;
  v_payload := jsonb_build_object(
    'app', 'miprojet-go',
    'event', 'go.team.membership_changed',
    'operation', TG_OP,
    'user_id', v_member,
    'owner_id', COALESCE(NEW.owner_id, OLD.owner_id),
    'team_role', COALESCE(NEW.team_role, OLD.team_role),
    'active', COALESCE(NEW.active, false),
    'full_name', v_profile.full_name,
    'phone', v_profile.phone,
    'actor', auth.uid()
  );
  v_signal := public.emit_sync_signal('go.team.membership_changed', 'go_team_members', v_member, auth.uid(), v_payload, 'info');
  INSERT INTO public.go_sync_runs (actor_id, trigger, status, roles_pushed, signal_id, details)
  VALUES (COALESCE(auth.uid(), NEW.owner_id, OLD.owner_id), 'auto_team', 'success', 1, v_signal, v_payload);
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.go_sync_runs (actor_id, trigger, status, details, error)
  VALUES (COALESCE(auth.uid(), NEW.owner_id, OLD.owner_id), 'auto_team', 'error', jsonb_build_object('user_id', v_member), SQLERRM);
  RETURN COALESCE(NEW, OLD);
END;
$function$;
CREATE TRIGGER trg_go_autosync_team_membership
  AFTER INSERT OR UPDATE OR DELETE ON public.go_team_members
  FOR EACH ROW EXECUTE FUNCTION public.go_autosync_team_membership();