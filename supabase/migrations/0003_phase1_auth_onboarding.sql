-- ============================================================================
-- MIGRATION 0003: PHASE 1 AUTHENTICATION, PROFILES & ONBOARDING FIELDS
-- ============================================================================
-- Ensures public.profiles and public.user_preferences capture all 11 required
-- Phase 1 onboarding attributes, creates an automatic auth.users -> profiles
-- trigger, and enforces strict Row Level Security (RLS) policies.

alter table public.profiles
  add column if not exists email text,
  add column if not exists academic_year text,
  add column if not exists career_interests text[] default '{}',
  add column if not exists learning_goals text,
  add column if not exists preferred_language text default 'en';

-- Ensure RLS is active on profiles and user_preferences
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

-- Granular RLS policies for profiles (SELECT, INSERT, UPDATE, DELETE)
drop policy if exists "Users can view and update own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Granular RLS policies for user_preferences
drop policy if exists "Users can view and update own preferences" on public.user_preferences;
drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Automatic profile & preferences provisioning when a student signs up via Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    country,
    preferred_language,
    timezone,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'country', 'India'),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce(new.raw_user_meta_data->>'timezone', 'Asia/Kolkata'),
    false
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (
    user_id,
    language
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

