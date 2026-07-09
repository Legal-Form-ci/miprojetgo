
-- 1) Colonnes supplémentaires pour paramètres activité
ALTER TABLE public.activity_settings
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS slogan text;

-- 2) Politiques RLS sur storage.objects pour le bucket activity-photos
DROP POLICY IF EXISTS "activity_photos_select_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_photos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_photos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_photos_delete_own" ON storage.objects;

CREATE POLICY "activity_photos_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'activity-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "activity_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "activity_photos_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'activity-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "activity_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'activity-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
