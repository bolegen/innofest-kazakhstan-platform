-- Apply after 20261106_teams_dashboard_privacy.sql.
-- Creates opt-in candidate cards and team vacancies; existing invitations
-- continue to use invite_team_member / accept_team_invite.

create table if not exists public.team_builder_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  desired_role text not null check (char_length(trim(desired_role)) between 2 and 80),
  skills text[] not null check (cardinality(skills) between 1 and 5),
  bio text not null default '' check (char_length(bio) <= 400),
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.team_openings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 8 and 100),
  desired_role text not null check (char_length(trim(desired_role)) between 2 and 80),
  skills text[] not null check (cardinality(skills) between 1 and 5),
  description text not null check (char_length(trim(description)) between 10 and 350),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index if not exists team_openings_team_idx on public.team_openings(team_id);
create index if not exists team_openings_status_idx on public.team_openings(status);

-- Own cards can be edited later even after a person joins a team; public
-- discovery excludes accepted members and staff automatically.
create or replace function public.team_builder_candidate_eligible(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select not exists (
    select 1 from public.team_members
    where user_id=p_user_id and status='accepted'
  ) and not exists (
    select 1 from public.staff_roles where user_id=p_user_id
  )
$$;

create or replace function public.team_builder_has_space(p_team_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select (select count(*) from public.team_members
          where team_id=p_team_id) < 5
$$;

revoke all on function public.team_builder_candidate_eligible(uuid),
  public.team_builder_has_space(uuid) from public, anon;
grant execute on function public.team_builder_candidate_eligible(uuid),
  public.team_builder_has_space(uuid) to authenticated;

alter table public.team_builder_profiles enable row level security;
alter table public.team_openings enable row level security;
revoke all on public.team_builder_profiles, public.team_openings from public, anon, authenticated;
grant select,insert,update,delete on public.team_builder_profiles to authenticated;
grant select,insert,update,delete on public.team_openings to authenticated;

drop policy if exists "team_builder_profiles_read" on public.team_builder_profiles;
create policy "team_builder_profiles_read" on public.team_builder_profiles for select to authenticated
using (
  user_id=(select auth.uid()) or (
    visible and (select not public.is_staff())
    and public.team_builder_candidate_eligible(user_id)
  )
);
drop policy if exists "team_builder_profiles_insert" on public.team_builder_profiles;
create policy "team_builder_profiles_insert" on public.team_builder_profiles for insert to authenticated
with check (
  user_id=(select auth.uid()) and (select public.email_is_confirmed())
  and public.team_builder_candidate_eligible(user_id)
);
drop policy if exists "team_builder_profiles_update" on public.team_builder_profiles;
create policy "team_builder_profiles_update" on public.team_builder_profiles for update to authenticated
using (user_id=(select auth.uid()) and (select not public.is_staff()))
with check (user_id=(select auth.uid()) and (select not public.is_staff()));
drop policy if exists "team_builder_profiles_delete" on public.team_builder_profiles;
create policy "team_builder_profiles_delete" on public.team_builder_profiles for delete to authenticated
using (user_id=(select auth.uid()));

drop policy if exists "team_openings_read" on public.team_openings;
create policy "team_openings_read" on public.team_openings for select to authenticated
using (
  (select not public.is_staff()) and (
    (select public.is_team_owner(team_id))
    or (status='open' and public.team_builder_has_space(team_id))
  )
);
drop policy if exists "team_openings_insert" on public.team_openings;
create policy "team_openings_insert" on public.team_openings for insert to authenticated
with check (
  (select not public.is_staff()) and (select public.email_is_confirmed())
  and (select public.is_team_owner(team_id))
  and public.team_builder_has_space(team_id)
);
drop policy if exists "team_openings_update" on public.team_openings;
create policy "team_openings_update" on public.team_openings for update to authenticated
using ((select not public.is_staff()) and (select public.is_team_owner(team_id)))
with check ((select not public.is_staff()) and (select public.is_team_owner(team_id)));
drop policy if exists "team_openings_delete" on public.team_openings;
create policy "team_openings_delete" on public.team_openings for delete to authenticated
using ((select not public.is_staff()) and (select public.is_team_owner(team_id)));

-- Team names are disclosed only for open vacancies; join codes are never returned.
create or replace function public.get_team_builder_openings()
returns table(id uuid,team_id uuid,team_name text,title text,
              desired_role text,skills text[],description text,
              member_count bigint,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if (select auth.uid()) is null or public.is_staff() then
    raise exception 'Доступ только для участников';
  end if;
  return query
    select o.id,t.id,t.name,o.title,o.desired_role,o.skills,o.description,
      (select count(*) from public.team_members m
       where m.team_id=t.id and m.status='accepted'),
      o.created_at
    from public.team_openings o
    join public.teams t on t.id=o.team_id
    where o.status='open' and public.team_builder_has_space(t.id)
    order by o.created_at desc
    limit 200;
end;
$$;
revoke all on function public.get_team_builder_openings() from public, anon;
grant execute on function public.get_team_builder_openings() to authenticated;
