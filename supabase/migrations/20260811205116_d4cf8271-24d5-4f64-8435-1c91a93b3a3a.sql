DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['avatars','activity-photos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_own_read');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_own_write');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_own_update');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_own_delete');

    EXECUTE format($f$CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = %L AND ((storage.foldername(name))[1] = auth.uid()::text OR public.go_is_admin(auth.uid())))$f$, b || '_own_read', b);
    EXECUTE format($f$CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)$f$, b || '_own_write', b);
    EXECUTE format($f$CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)$f$, b || '_own_update', b, b);
    EXECUTE format($f$CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text)$f$, b || '_own_delete', b);
  END LOOP;
END $$;