-- [SECURITY] Ce bloc seedait un compte administrateur avec un mot de passe en clair.
-- Il a été retiré de l'historique du dépôt : ne jamais committer de mot de passe réel.
-- Les comptes administrateurs sont désormais créés via l'API admin Supabase (invitation
-- ou réinitialisation de mot de passe), sans identifiant en dur dans le code.

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