CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_name text;
  _phone text;
BEGIN
  _full_name := NULLIF(BTRIM(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    CONCAT_WS(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
  )), '');
  _phone := NULLIF(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), '[^0-9+]', '', 'g'), '');

  INSERT INTO public.profiles (id, email, first_name, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(SPLIT_PART(COALESCE(_full_name, ''), ' ', 1), ''), SPLIT_PART(COALESCE(NEW.email, NEW.id::text), '@', 1)),
    _full_name,
    _phone,
    UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  PERFORM public.emit_sync_signal(
    'go.account.created',
    'profiles',
    NEW.id,
    NEW.id,
    JSONB_BUILD_OBJECT(
      'app', 'miprojet-go',
      'user_id', NEW.id,
      'full_name', _full_name,
      'phone', _phone,
      'role', 'user',
      'event', 'account_created'
    ),
    'info'
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();