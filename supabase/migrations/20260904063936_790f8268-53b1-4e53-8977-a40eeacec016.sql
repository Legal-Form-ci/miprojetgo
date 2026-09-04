-- 1) Trust fields on public.projects
CREATE OR REPLACE FUNCTION public.guard_projects_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_any_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.mp_score := OLD.mp_score;
  NEW.recommendation_level := OLD.recommendation_level;
  NEW.current_funding := OLD.current_funding;
  NEW.funds_raised := OLD.funds_raised;
  NEW.fonds_disponibles := OLD.fonds_disponibles;
  NEW.risk_score := OLD.risk_score;
  NEW.is_public := OLD.is_public;
  NEW.status := OLD.status;
  NEW.display_id := OLD.display_id;
  NEW.short_slug := OLD.short_slug;
  NEW.owner_id := OLD.owner_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_projects_trust_fields ON public.projects;
CREATE TRIGGER trg_guard_projects_trust_fields
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_projects_trust_fields();

REVOKE ALL ON FUNCTION public.guard_projects_trust_fields() FROM anon, authenticated;

-- 2) Trust fields on public.mp_projects
CREATE OR REPLACE FUNCTION public.guard_mp_projects_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_any_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.is_public := OLD.is_public;
  NEW.status := OLD.status;
  NEW.display_id := OLD.display_id;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_mp_projects_trust_fields ON public.mp_projects;
CREATE TRIGGER trg_guard_mp_projects_trust_fields
BEFORE UPDATE ON public.mp_projects
FOR EACH ROW EXECUTE FUNCTION public.guard_mp_projects_trust_fields();

REVOKE ALL ON FUNCTION public.guard_mp_projects_trust_fields() FROM anon, authenticated;

-- 3) Self-reported scores on mp_scoring_results: neutralize client-written scores
CREATE OR REPLACE FUNCTION public.guard_mp_scoring_client_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_any_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Client-side inserts/updates may not assert scores; they are recomputed server-side.
  NEW.score_juridique := 0;
  NEW.score_financier := 0;
  NEW.score_technique := 0;
  NEW.score_marche := 0;
  NEW.score_impact := 0;
  NEW.score_equipe := 0;
  NEW.score_global := 0;
  NEW.niveau := NULL;
  NEW.source := 'client_unverified';
  NEW.is_active := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_mp_scoring_client_scores ON public.mp_scoring_results;
CREATE TRIGGER trg_guard_mp_scoring_client_scores
BEFORE INSERT OR UPDATE ON public.mp_scoring_results
FOR EACH ROW EXECUTE FUNCTION public.guard_mp_scoring_client_scores();

REVOKE ALL ON FUNCTION public.guard_mp_scoring_client_scores() FROM anon, authenticated;

-- 4) Trigger-only functions must not be callable from the API
REVOKE ALL ON FUNCTION public.guard_profile_sensitive_fields() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_service_request_admin_fields() FROM anon, authenticated;
