REVOKE EXECUTE ON FUNCTION public.guard_profile_sensitive_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_service_request_admin_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_access_requests() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_access_request(_id uuid, _status text, _notes text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_opportunity_contacts(p_id uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_project_team_contacts(_project_id uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invest_project_documents(_project_id uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_tender_views(_id uuid) FROM anon, authenticated;