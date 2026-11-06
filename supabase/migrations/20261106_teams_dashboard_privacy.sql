-- Run in the Supabase SQL Editor after schema.sql. Safe to re-run.
create extension if not exists pgcrypto;

alter table public.submissions add column if not exists technical_description text not null default '';
alter table public.submissions add column if not exists features text not null default '';

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  owner_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique default upper(encode(gen_random_bytes(6),'hex')),
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('invited','accepted')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (team_id,user_id)
);
create index if not exists team_members_user_idx on public.team_members(user_id);
alter table public.submissions add column if not exists team_id uuid references public.teams(id);
create index if not exists submissions_team_idx on public.submissions(team_id);

create or replace function public.is_team_member(p_team_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members
    where team_id=p_team_id and user_id=(select auth.uid()) and status='accepted')
$$;
create or replace function public.is_team_owner(p_team_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.teams where id=p_team_id and owner_id=(select auth.uid()))
$$;
create or replace function public.valid_team_size(p_team_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select (select count(*) from public.team_members where team_id=p_team_id and status='accepted') between 2 and 5
$$;
create or replace function public.email_is_confirmed() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null)
$$;
revoke all on function public.is_team_member(uuid),public.is_team_owner(uuid),public.valid_team_size(uuid),public.email_is_confirmed() from public;
grant execute on function public.is_team_member(uuid),public.is_team_owner(uuid),public.valid_team_size(uuid),public.email_is_confirmed() to authenticated;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
revoke all on public.teams,public.team_members from anon,authenticated;
grant select on public.teams,public.team_members to authenticated;
drop policy if exists "teams_read" on public.teams;
create policy "teams_read" on public.teams for select to authenticated
using ((select public.is_team_member(id)) or owner_id=(select auth.uid()));
drop policy if exists "team_members_read" on public.team_members;
create policy "team_members_read" on public.team_members for select to authenticated
using (user_id=(select auth.uid()) or (select public.is_team_member(team_id)));

create or replace function public.create_team(p_name text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Войдите в аккаунт'; end if;
  if char_length(trim(p_name)) not between 2 and 100 then raise exception 'Название команды: 2–100 символов'; end if;
  insert into public.teams(name,owner_id) values(trim(p_name),(select auth.uid())) returning id into v_id;
  insert into public.team_members(team_id,user_id,status) values(v_id,(select auth.uid()),'accepted');
  return v_id;
end;
$$;

create or replace function public.invite_team_member(p_team_id uuid,p_user_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_team_owner(p_team_id) then raise exception 'Только создатель команды может приглашать'; end if;
  perform 1 from public.teams where id=p_team_id for update;
  if (select count(*) from public.team_members where team_id=p_team_id) >= 5 then
    raise exception 'В команде может быть не более 5 человек, включая приглашённых';
  end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Пользователь с таким ID не найден'; end if;
  insert into public.team_members(team_id,user_id,status,invited_by)
  values(p_team_id,p_user_id,'invited',(select auth.uid()))
  on conflict (team_id,user_id) do nothing;
end;
$$;

create or replace function public.accept_team_invite(p_team_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if (select auth.uid()) is null then raise exception 'Войдите в аккаунт'; end if;
  perform 1 from public.teams where id=p_team_id for update;
  if (select count(*) from public.team_members where team_id=p_team_id and status='accepted') >= 5 then
    raise exception 'В команде уже 5 участников';
  end if;
  update public.team_members set status='accepted'
  where team_id=p_team_id and user_id=(select auth.uid()) and status='invited';
  if not found then raise exception 'Приглашение не найдено'; end if;
end;
$$;

create or replace function public.join_team_by_code(p_code text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if (select auth.uid()) is null then raise exception 'Войдите в аккаунт'; end if;
  select id into v_team from public.teams where join_code=upper(trim(p_code)) for update;
  if v_team is null then raise exception 'Код команды не найден'; end if;
  if not public.is_team_member(v_team) then
    if (select count(*) from public.team_members where team_id=v_team and status='accepted') >= 5 then
      raise exception 'В команде уже 5 участников';
    end if;
    insert into public.team_members(team_id,user_id,status)
    values(v_team,(select auth.uid()),'accepted')
    on conflict (team_id,user_id) do update set status='accepted';
  end if;
  return v_team;
end;
$$;

create or replace function public.get_my_teams()
returns table(team_id uuid,team_name text,join_code text,owner_id uuid,my_status text,member_count bigint)
language sql stable security definer set search_path=public as $$
  select t.id,t.name,case when m.status='accepted' then t.join_code else null end,
    t.owner_id,m.status,(select count(*) from public.team_members x where x.team_id=t.id and x.status='accepted')
  from public.team_members m join public.teams t on t.id=m.team_id
  where m.user_id=(select auth.uid()) order by t.created_at desc
$$;

create or replace function public.get_team_members(p_team_id uuid)
returns table(member_id uuid,full_name text,status text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_team_member(p_team_id) then raise exception 'Нет доступа к команде'; end if;
  return query select m.user_id,p.full_name,m.status from public.team_members m
    left join public.profiles p on p.id=m.user_id
    where m.team_id=p_team_id order by m.created_at;
end;
$$;

revoke all on function public.create_team(text),public.invite_team_member(uuid,uuid),
  public.accept_team_invite(uuid),public.join_team_by_code(text),public.get_my_teams(),
  public.get_team_members(uuid) from public;
grant execute on function public.create_team(text),public.invite_team_member(uuid,uuid),
  public.accept_team_invite(uuid),public.join_team_by_code(text),public.get_my_teams(),
  public.get_team_members(uuid) to authenticated;

drop policy if exists "submissions_read" on public.submissions;
create policy "submissions_read" on public.submissions for select to authenticated
using (owner_id=(select auth.uid()) or (select public.is_admin()) or
  (team_id is not null and (select public.is_team_member(team_id))));
drop policy if exists "submissions_insert" on public.submissions;
create policy "submissions_insert" on public.submissions for insert to authenticated
with check (owner_id=(select auth.uid()) and source='platform' and status='pending' and analysis is null
  and (select public.email_is_confirmed())
  and team_id is not null and (select public.is_team_member(team_id)) and (select public.valid_team_size(team_id)));

-- Experts receive only project content and a technical description. They cannot select
-- submissions directly or download files, which may reveal team identities.
create or replace function public.get_expert_submissions()
returns table(id uuid,title text,concept text,technical_description text,features text,
  category text,status text,analysis jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_staff() then raise exception 'Доступ разрешён только экспертам'; end if;
  return query select s.id,s.title,s.concept,s.technical_description,s.features,
    s.category,s.status,s.analysis,s.created_at from public.submissions s
    order by s.created_at desc limit 100;
end;
$$;
revoke all on function public.get_expert_submissions() from public;
grant execute on function public.get_expert_submissions() to authenticated;

drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews for select to authenticated
using (expert_id=(select auth.uid()) or (select public.is_admin()));
drop policy if exists "project_file_read" on storage.objects;
create policy "project_file_read" on storage.objects for select to authenticated
using (bucket_id='project-files' and
  ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_admin())));

create or replace function public.get_dashboard_stats() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'total',(select count(*) from public.submissions where source='platform'),
    'by_status',coalesce((select jsonb_agg(jsonb_build_object('status',status,'count',n) order by n desc)
      from (select status,count(*) n from public.submissions where source='platform' group by status) q),'[]'::jsonb),
    'by_category',coalesce((select jsonb_agg(jsonb_build_object('category',category,'count',n) order by n desc)
      from (select category,count(*) n from public.submissions where source='platform' group by category) q),'[]'::jsonb),
    'with_features',(select count(*) from public.submissions where source='platform' and length(trim(features))>0)
  )
$$;
revoke all on function public.get_dashboard_stats() from public;
grant execute on function public.get_dashboard_stats() to anon,authenticated;

