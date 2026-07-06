
-- 1) Private schema for internal SECURITY DEFINER helpers (not exposed via API)
CREATE SCHEMA IF NOT EXISTS private_utils;
REVOKE ALL ON SCHEMA private_utils FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private_utils TO authenticated, service_role;

-- Move existing SECURITY DEFINER helpers out of the exposed public schema.
-- Policies and triggers referencing them by OID follow the move automatically.
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private_utils;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private_utils;

-- Lock down EXECUTE: only authenticated (for RLS policy calls) + service_role.
REVOKE ALL ON FUNCTION private_utils.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_utils.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION private_utils.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_utils.handle_new_user() TO service_role;

-- 2) Restrict avatar SELECT to owner (or admin)
DROP POLICY IF EXISTS "Avatars readable to authenticated" ON storage.objects;
CREATE POLICY "Users read own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR private_utils.has_role(auth.uid(), 'admin')
  )
);

-- 3) Server-side entitlement for premium exports
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS export_unlocked_until timestamptz;
