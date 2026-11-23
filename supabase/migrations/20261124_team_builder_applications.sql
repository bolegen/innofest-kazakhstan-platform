-- Apply after 20261124_team_builder.sql. Safe to run again.
begin;

create table if not exists public.team_opening_applications (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null references public.team_openings(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  applicant_name text not null,
  message text not null default '' check (char_length(message) <= 400),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (opening_id, applicant_id)
);

create index if not exists team_opening_applications_applicant_idx
  on public.team_opening_applications(applicant_id, created_at desc);

-- Application data never goes through generic table access.
alter table public.team_opening_applications enable row level security;
revoke all on public.team_opening_applications from public, anon, authenticated;

create or replace function public.apply_to_team_opening(p_opening_id uuid, p_message text default '')
returns uuid
language plpgsql security definer set search_path=pg_catalog, public as $$
declare
  v_user uuid := auth.uid();
  v_team uuid;
  v_opening public.team_openings%rowtype;
  v_name text;
  v_message text := trim(coalesce(p_message,''));
  v_id uuid;
begin
  if v_user is null or public.is_staff() or not public.email_is_confirmed() then
    raise exception 'Подтвердите email, чтобы откликнуться.';
  end if;
  if char_length(v_message) > 400 then
    raise exception 'Сообщение должно содержать не более 400 символов.';
  end if;
  select team_id into v_team from public.team_openings where id=p_opening_id;
  if v_team is null then raise exception 'Вакансия недоступна.'; end if;

  -- Serialize with invitations and joining by code, then lock the vacancy
  -- so a simultaneous close cannot race a new application.
  perform 1 from public.teams where id=v_team for update;
  select * into v_opening from public.team_openings
    where id=p_opening_id and team_id=v_team and status='open' for update;
  if not found then raise exception 'Вакансия недоступна.'; end if;

  if not public.team_builder_candidate_eligible(v_user) then
    raise exception 'Откликнуться может только участник без команды.';
  end if;
  if not public.team_builder_has_space(v_team) then
    raise exception 'В команде нет свободных мест.';
  end if;

  select coalesce(
    (select nullif(trim(display_name), '') from public.team_builder_profiles where user_id=v_user and visible),
    (select nullif(trim(full_name), '') from public.profiles where id=v_user),
    ''
  ) into v_name;

  insert into public.team_opening_applications(opening_id, applicant_id, applicant_name, message)
  values (p_opening_id, v_user, left(v_name,80), v_message)
  on conflict (opening_id, applicant_id) do nothing
  returning id into v_id;
  if v_id is null then raise exception 'Вы уже откликнулись на эту вакансию.'; end if;
  return v_id;
end;
$$;

create or replace function public.get_team_opening_applications()
returns table(
  id uuid, opening_id uuid, opening_title text, team_name text,
  opening_status text, applicant_name text, message text, status text,
  created_at timestamptz, can_review boolean
)
language sql stable security definer set search_path=pg_catalog, public as $$
  select a.id, a.opening_id, o.title, t.name,
    o.status, a.applicant_name, a.message, a.status, a.created_at, t.owner_id=(select auth.uid())
  from public.team_opening_applications a
  join public.team_openings o on o.id=a.opening_id
  join public.teams t on t.id=o.team_id
  where (select auth.uid()) is not null and not (select public.is_staff())
    and (a.applicant_id=(select auth.uid()) or t.owner_id=(select auth.uid()))
  order by a.created_at desc, a.id
$$;

create or replace function public.decide_team_opening_application(p_application_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path=pg_catalog, public as $$
declare
  v_user uuid := auth.uid();
  v_team uuid;
  v_opening public.team_openings%rowtype;
  v_application public.team_opening_applications%rowtype;
  v_membership text;
begin
  if v_user is null or public.is_staff() or p_accept is null then
    raise exception 'Отклик недоступен.';
  end if;

  -- Keep lock order consistent with apply and membership RPCs.
  select t.id into v_team
  from public.team_opening_applications a
  join public.team_openings o on o.id=a.opening_id
  join public.teams t on t.id=o.team_id
  where a.id=p_application_id and t.owner_id=v_user
  for update of t;
  if not found then raise exception 'Отклик недоступен.'; end if;

  select o.* into v_opening from public.team_openings o
  join public.team_opening_applications a on a.opening_id=o.id
  where a.id=p_application_id and o.team_id=v_team
  for update of o;
  if not found then raise exception 'Отклик недоступен.'; end if;

  select * into v_application from public.team_opening_applications
  where id=p_application_id and opening_id=v_opening.id for update;
  if not found then raise exception 'Отклик недоступен.'; end if;
  if v_application.status <> 'pending' then raise exception 'Решение по отклику уже принято.'; end if;

  if p_accept then
    if v_opening.status <> 'open' then raise exception 'Вакансия закрыта'; end if;

    -- Serialize simultaneous approvals of the same candidate from different captains.
    perform 1 from auth.users where id=v_application.applicant_id
      and email_confirmed_at is not null for no key update;
    if not found
      or exists(select 1 from public.staff_roles where user_id=v_application.applicant_id)
      or exists(select 1 from public.team_members where user_id=v_application.applicant_id
        and team_id<>v_team and status='accepted') then
      raise exception 'Кандидат больше не может вступить в команду.';
    end if;

    select status into v_membership from public.team_members
    where team_id=v_team and user_id=v_application.applicant_id;
    if v_membership is distinct from 'accepted' then
      -- An existing invitation may consume the applicant's own reserved slot.
      if (v_membership is null and not public.team_builder_has_space(v_team))
        or (select count(*) from public.team_members where team_id=v_team and status='accepted') >= 5 then
        raise exception 'В команде нет свободных мест.';
      end if;
      insert into public.team_members(team_id,user_id,status,invited_by)
      values(v_team,v_application.applicant_id,'accepted',v_user)
      on conflict(team_id,user_id) do update set status='accepted';
    end if;
  end if;

  update public.team_opening_applications
  set status=case when p_accept then 'accepted' else 'declined' end,
      decided_at=now()
  where id=p_application_id;
end;
$$;

revoke all on function public.apply_to_team_opening(uuid,text),
  public.get_team_opening_applications(), public.decide_team_opening_application(uuid,boolean)
  from public, anon, authenticated;
grant execute on function public.apply_to_team_opening(uuid,text),
  public.get_team_opening_applications(), public.decide_team_opening_application(uuid,boolean)
  to authenticated;

commit;
