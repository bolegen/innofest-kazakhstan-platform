-- Review before applying. The website build does not execute this file.
drop policy if exists "submissions_read" on public.submissions;
create policy "submissions_read" on public.submissions for select to authenticated
using (
  (select public.is_admin())
  or (
    not (select public.is_staff())
    and (
      owner_id = (select auth.uid())
      or (team_id is not null and (select public.is_team_member(team_id)))
    )
  )
);

drop policy if exists "submissions_insert" on public.submissions;
create policy "submissions_insert" on public.submissions for insert to authenticated
with check (
  not (select public.is_staff())
  and owner_id = (select auth.uid())
  and source = 'platform'
  and status = 'pending'
  and analysis is null
  and (select public.email_is_confirmed())
  and team_id is not null
  and (select public.is_team_member(team_id))
  and (select public.valid_team_size(team_id))
);
