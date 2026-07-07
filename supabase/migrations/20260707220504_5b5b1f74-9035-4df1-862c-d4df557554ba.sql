do $$
declare
  target_phone text := '0759566087';
  target_email text := '0759566087@miprojet.app';
  target_password text := '@Massa29012020';
  target_user_id uuid;
begin
  select id into target_user_id from auth.users where email = target_email limit 1;

  if target_user_id is null then
    target_user_id := gen_random_uuid();
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      target_email,
      crypt(target_password, gen_salt('bf')),
      now(),
      jsonb_build_object('phone', target_phone, 'full_name', 'Administrateur MiProjet Go'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
      set encrypted_password = crypt(target_password, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('phone', target_phone, 'full_name', 'Administrateur MiProjet Go'),
          updated_at = now()
      where id = target_user_id;
  end if;

  insert into public.profiles (id, phone, full_name, first_name, last_name)
  values (target_user_id, target_phone, 'Administrateur MiProjet Go', 'Administrateur', 'MiProjet Go')
  on conflict (id) do update
    set phone = excluded.phone,
        full_name = excluded.full_name,
        first_name = excluded.first_name,
        last_name = excluded.last_name;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id, role) do nothing;
end $$;

create table if not exists public.activity_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_name text not null default 'Mon activité',
  activity_type text not null default 'autre',
  owner_name text,
  phone text,
  address text,
  city text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

grant select, insert, update, delete on public.activity_settings to authenticated;
grant all on public.activity_settings to service_role;

alter table public.activity_settings enable row level security;

drop policy if exists "Users manage own activity settings" on public.activity_settings;
create policy "Users manage own activity settings"
on public.activity_settings
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists trg_activity_settings_touch_updated_at on public.activity_settings;
create trigger trg_activity_settings_touch_updated_at
before update on public.activity_settings
for each row execute function public.touch_updated_at();