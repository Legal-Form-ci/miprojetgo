-- 1. Internal RLS helper predicates: no direct client EXECUTE needed
REVOKE EXECUTE ON FUNCTION public.can_access_connection_channel(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_org_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.go_is_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_any_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_owner(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mp_can_read_document(uuid, uuid, org_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invest_can_read_document_object(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.org_role_at_least(uuid, org_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_any_project(uuid) FROM anon, authenticated;

-- 2. Privileged/sensitive definer functions: never callable anonymously
REVOKE EXECUTE ON FUNCTION public.admin_list_access_requests() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_access_request(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_agricapital_partition() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_opportunity_contacts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_team_contacts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.invest_project_documents(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mp_recompute_score(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mp_resync_scoring(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_tender_views(uuid) FROM anon;

-- 3. subscription_plans: policy must match its stated intent
DROP POLICY IF EXISTS "Active plans are viewable by everyone" ON public.subscription_plans;
CREATE POLICY "Active plans are viewable by everyone"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. avatars bucket: signed-in users can display avatars, anonymous cannot
DROP POLICY IF EXISTS "avatars_authenticated_read" ON storage.objects;
CREATE POLICY "avatars_authenticated_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');