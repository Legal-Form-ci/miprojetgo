DROP POLICY IF EXISTS "avatars_own_read" ON storage.objects;
CREATE POLICY "avatars_own_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "activity-photos_own_read" ON storage.objects;
CREATE POLICY "activity-photos_own_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'activity-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "project_media_owner_insert" ON storage.objects;
CREATE POLICY "project_media_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] = ANY (ARRAY['covers','logos','gallery','media'])
);

DROP POLICY IF EXISTS "project_media_owner_update" ON storage.objects;
CREATE POLICY "project_media_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] = ANY (ARRAY['covers','logos','gallery','media'])
);

DROP POLICY IF EXISTS "project_media_owner_delete" ON storage.objects;
CREATE POLICY "project_media_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);