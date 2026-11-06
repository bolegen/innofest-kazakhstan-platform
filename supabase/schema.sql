-- Run once in Supabase SQL Editor before opening registration.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  city text not null default '',
  organization text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','expert')),
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.archive_projects (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year between 2020 and 2026),
  title text not null,
  summary text not null default '',
  category text not null default '',
  place integer check (place between 1 and 3),
  source_url text not null default '',
  created_at timestamptz not null default now(),
  unique(year,title)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  user_email text not null default '',
  title text not null,
  concept text not null,
  category text not null,
  file_path text,
  file_name text,
  file_text text not null default '',
  source text not null default 'platform' check (source in ('platform','sheet')),
  source_key text unique,
  status text not null default 'pending' check (status in ('pending','analyzed','needs_review','approved','rejected')),
  analysis jsonb,
  created_at timestamptz not null default now()
);
create index if not exists submissions_owner_idx on public.submissions(owner_id);
create index if not exists submissions_status_idx on public.submissions(status);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  expert_id uuid not null references auth.users(id) on delete cascade,
  checklist jsonb not null,
  comment text not null default '',
  score integer not null check (score between 0 and 25),
  created_at timestamptz not null default now(),
  unique(submission_id,expert_id)
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.staff_roles where user_id=(select auth.uid()) and role='admin')
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.staff_roles where user_id=(select auth.uid()) and role in ('admin','expert'))
$$;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.is_admin(),public.is_staff() to authenticated;

create or replace function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,city,organization)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'city',''),coalesce(new.raw_user_meta_data->>'organization',''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup after insert on auth.users for each row execute function public.on_auth_user_created();

alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.archive_projects enable row level security;
alter table public.submissions enable row level security;
alter table public.reviews enable row level security;

revoke all on public.profiles,public.staff_roles,public.archive_projects,public.submissions,public.reviews from anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,delete on public.staff_roles to authenticated;
grant select,insert,update,delete on public.archive_projects to authenticated;
grant select,insert,update on public.submissions to authenticated;
grant select,insert,update on public.reviews to authenticated;

create policy "profiles_read" on public.profiles for select to authenticated using (id=(select auth.uid()) or (select public.is_admin()));
create policy "profiles_update" on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy "roles_read" on public.staff_roles for select to authenticated using (user_id=(select auth.uid()) or (select public.is_admin()));
create policy "roles_insert" on public.staff_roles for insert to authenticated with check ((select public.is_admin()) and role='expert');
create policy "roles_delete" on public.staff_roles for delete to authenticated using ((select public.is_admin()) and role='expert');
create policy "archive_read" on public.archive_projects for select to authenticated using ((select public.is_admin()));
create policy "archive_insert" on public.archive_projects for insert to authenticated with check ((select public.is_admin()));
create policy "archive_update" on public.archive_projects for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "archive_delete" on public.archive_projects for delete to authenticated using ((select public.is_admin()));
create policy "submissions_read" on public.submissions for select to authenticated using (owner_id=(select auth.uid()) or (select public.is_staff()));
create policy "submissions_insert" on public.submissions for insert to authenticated with check (owner_id=(select auth.uid()) and source='platform' and status='pending' and analysis is null);
create policy "submissions_update_admin" on public.submissions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reviews_read" on public.reviews for select to authenticated using ((select public.is_staff()));
create policy "reviews_insert" on public.reviews for insert to authenticated with check (expert_id=(select auth.uid()) and (select public.is_staff()) and score between 0 and 25);
create policy "reviews_update" on public.reviews for update to authenticated using (expert_id=(select auth.uid()) and (select public.is_staff())) with check (expert_id=(select auth.uid()) and (select public.is_staff()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-files','project-files',false,8388608,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown'])
on conflict (id) do nothing;
create policy "project_file_upload" on storage.objects for insert to authenticated with check (bucket_id='project-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "project_file_read" on storage.objects for select to authenticated using (bucket_id='project-files' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_staff())));

-- After your first signup, promote your account in SQL Editor:
-- insert into public.staff_roles(user_id,role)
-- select id,'admin' from auth.users where email='YOUR_EMAIL@example.com'
-- on conflict(user_id) do update set role='admin';

