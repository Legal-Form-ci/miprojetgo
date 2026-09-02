-- 1) Avatars: remove broad read policy (owner/admin policy already exists)
DROP POLICY IF EXISTS "avatars_authenticated_read" ON storage.objects;

-- 2) connection_requests: explicit null-safe target handling
DROP POLICY IF EXISTS "Users view their own connection requests" ON public.connection_requests;
CREATE POLICY "Users view their own connection requests"
ON public.connection_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = requester_id
    OR (target_id IS NOT NULL AND auth.uid() = target_id)
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- 3) Internal scoring routine must not be directly callable by clients
REVOKE ALL ON FUNCTION public.mp_recompute_score(uuid) FROM anon, authenticated;
