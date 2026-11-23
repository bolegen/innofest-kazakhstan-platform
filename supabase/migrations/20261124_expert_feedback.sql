begin;

-- Published, organizer-authored feedback is separate from internal expert reviews.
create table if not exists public.submission_feedback (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  published_at timestamptz not null default now()
);

alter table public.submission_feedback enable row level security;
revoke all on public.submission_feedback from public, anon, authenticated;
grant select on public.submission_feedback to authenticated;

drop policy if exists "submission_feedback_read" on public.submission_feedback;
create policy "submission_feedback_read" on public.submission_feedback
for select to authenticated
using (
  (select public.is_admin())
  or (
    not (select public.is_staff())
    and exists (
      select 1
      from public.submissions as s
      where s.id = submission_feedback.submission_id
        and s.source = 'platform'
        and (s.owner_id = (select auth.uid()) or public.is_team_member(s.team_id))
    )
  )
);

create or replace function public.get_expert_review_summary(p_submission_ids uuid[])
returns table(submission_id uuid, review_count integer, average_score numeric, evaluations jsonb)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Доступ разрешён только администратору' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_submission_ids), 0) > 100 then
    raise exception 'Можно запросить не более 100 заявок' using errcode = '22023';
  end if;
  return query
  select r.submission_id, count(*)::integer, round(avg(r.score), 1),
         jsonb_agg(jsonb_build_object('score', r.score, 'comment', r.comment)
                   order by r.created_at, r.id)
  from public.reviews as r
  where r.submission_id = any(p_submission_ids)
  group by r.submission_id;
end;
$$;

-- A null body explicitly withdraws the feedback. Never send a raw review as a side effect.
create or replace function public.set_submission_feedback(p_submission_id uuid, p_body text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_body text := btrim(p_body, E' \t\n\r');
begin
  if not public.is_admin() then
    raise exception 'Доступ разрешён только администратору' using errcode = '42501';
  end if;
  if p_body is null then
    delete from public.submission_feedback as f where f.submission_id = p_submission_id;
    return;
  end if;
  if char_length(v_body) not between 1 and 3000 then
    raise exception 'Введите от 1 до 3000 символов' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.submissions as s
    where s.id = p_submission_id and s.source = 'platform'
      and (s.owner_id is not null or s.team_id is not null)
  ) then
    raise exception 'У заявки нет кабинета участника' using errcode = '22023';
  end if;
  insert into public.submission_feedback as f (submission_id, body)
  values (p_submission_id, v_body)
  on conflict (submission_id) do update set body = excluded.body, published_at = now();
end;
$$;

revoke all on function public.get_expert_review_summary(uuid[]),
  public.set_submission_feedback(uuid, text) from public, anon, authenticated;
grant execute on function public.get_expert_review_summary(uuid[]),
  public.set_submission_feedback(uuid, text) to authenticated;

commit;
