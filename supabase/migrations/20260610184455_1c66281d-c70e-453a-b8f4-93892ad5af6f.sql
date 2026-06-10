GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations TO authenticated;
GRANT ALL ON public.operations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_sessions TO authenticated;
GRANT ALL ON public.import_sessions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.users_overview TO authenticated;