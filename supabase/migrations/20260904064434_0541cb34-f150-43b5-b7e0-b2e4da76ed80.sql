-- Auto background sync of MiPROJET Go team members / activities to the ecosystem
CREATE OR REPLACE FUNCTION public.go_autosync_team_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_go boolean;
  v_profile record;
  v_roles text[];
  v_payload jsonb;
  v_signal uuid;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only MiPROJET Go users: activity owners or members of an activity
  SELECT EXISTS (SELECT 1 FROM public.activity_settings a WHERE a.user_id = v_user_id)
    INTO v_is_go;
  IF NOT v_is_go THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, full_name, phone INTO v_profile FROM public.profiles WHERE id = v_user_id;
  SELECT COALESCE(array_agg(r.role ORDER BY r.role), '{}'::text[])
    INTO v_roles FROM public.user_roles r WHERE r.user_id = v_user_id;

  v_payload := jsonb_build_object(
    'app', 'miprojet-go',
    'event', 'go.team.member_synced',
    'operation', TG_OP,
    'user_id', v_user_id,
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
$$;

REVOKE ALL ON FUNCTION public.go_autosync_team_member() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_go_autosync_team_member ON public.user_roles;
CREATE TRIGGER trg_go_autosync_team_member
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.go_autosync_team_member();

CREATE OR REPLACE FUNCTION public.go_autosync_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_signal uuid;
BEGIN
  v_payload := jsonb_build_object(
    'app', 'miprojet-go',
    'event', 'go.activity.synced',
    'operation', TG_OP,
    'user_id', NEW.user_id,
    'activity_name', NEW.activity_name,
    'activity_type', NEW.activity_type,
    'city', NEW.city,
    'currency', NEW.currency,
    'actor', auth.uid()
  );

  v_signal := public.emit_sync_signal(
    'go.activity.synced', 'activity_settings', NEW.id, auth.uid(), v_payload, 'info'
  );

  INSERT INTO public.go_sync_runs (actor_id, trigger, status, settings_pushed, signal_id, details)
  VALUES (auth.uid(), 'auto_activity', 'success', 1, v_signal, v_payload);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.go_sync_runs (actor_id, trigger, status, details, error)
  VALUES (auth.uid(), 'auto_activity', 'error', jsonb_build_object('activity_id', NEW.id), SQLERRM);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.go_autosync_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_go_autosync_activity ON public.activity_settings;
CREATE TRIGGER trg_go_autosync_activity
AFTER INSERT OR UPDATE ON public.activity_settings
FOR EACH ROW EXECUTE FUNCTION public.go_autosync_activity();
