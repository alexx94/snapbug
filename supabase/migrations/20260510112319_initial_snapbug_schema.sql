create extension if not exists pgcrypto;

create type public.snapbug_environment as enum ('development', 'production');
create type public.report_type as enum ('bug', 'todo', 'feedback');
create type public.report_status as enum ('open', 'triaged', 'in_progress', 'resolved', 'closed');
create type public.report_priority as enum ('low', 'medium', 'high', 'critical');
create type public.artifact_kind as enum ('screenshot', 'console_logs', 'replay');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_slug_length check (char_length(slug) between 2 and 80),
  constraint projects_name_length check (char_length(name) between 1 and 120),
  unique (owner_id, slug)
);

create table public.project_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  environment public.snapbug_environment not null,
  key_prefix text not null,
  key_hash text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (project_id, environment)
);

create table public.project_origins (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  environment public.snapbug_environment not null,
  origin text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, environment, origin)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  environment public.snapbug_environment not null,
  type public.report_type not null,
  status public.report_status not null default 'open',
  priority public.report_priority not null default 'medium',
  title text,
  message text not null,
  reporter_name text,
  page_url text not null,
  user_agent text,
  browser jsonb not null default '{}'::jsonb,
  viewport jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  origin text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_message_length check (char_length(message) between 1 and 5000),
  constraint reports_title_length check (title is null or char_length(title) <= 200),
  constraint reports_reporter_name_length check (reporter_name is null or char_length(reporter_name) <= 120)
);

create table public.report_artifacts (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  kind public.artifact_kind not null,
  storage_path text not null,
  content_type text not null,
  byte_size integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, kind)
);

create index projects_owner_id_idx on public.projects(owner_id);
create index project_keys_hash_idx on public.project_keys(key_hash) where enabled = true;
create index project_origins_lookup_idx on public.project_origins(project_id, environment, origin) where enabled = true;
create index reports_project_env_created_idx on public.reports(project_id, environment, created_at desc);
create index reports_project_type_status_idx on public.reports(project_id, type, status);
create index report_artifacts_report_id_idx on public.report_artifacts(report_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger projects_touch_updated_at before update on public.projects
for each row execute function public.touch_updated_at();

create trigger reports_touch_updated_at before update on public.reports
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create view public.development_reports
with (security_invoker = true)
as select * from public.reports where environment = 'development';

create view public.production_reports
with (security_invoker = true)
as select * from public.reports where environment = 'production';

create view public.bug_reports
with (security_invoker = true)
as select * from public.reports where type = 'bug';

create view public.todo_reports
with (security_invoker = true)
as select * from public.reports where type = 'todo';

create view public.feedback_reports
with (security_invoker = true)
as select * from public.reports where type = 'feedback';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-artifacts',
  'report-artifacts',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'application/json']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_keys enable row level security;
alter table public.project_origins enable row level security;
alter table public.reports enable row level security;
alter table public.report_artifacts enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

create policy "Profiles are insertable by owner" on public.profiles
for insert to authenticated with check ((select auth.uid()) = id);

create policy "Profiles are updatable by owner" on public.profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Project owners can read projects" on public.projects
for select to authenticated using ((select auth.uid()) = owner_id);

create policy "Project owners can create projects" on public.projects
for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy "Project owners can update projects" on public.projects
for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Project owners can delete projects" on public.projects
for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Project owners can manage keys" on public.project_keys
for all to authenticated using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
);

create policy "Project owners can manage origins" on public.project_origins
for all to authenticated using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
);

create policy "Project owners can read reports" on public.reports
for select to authenticated using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
);

create policy "Project owners can update reports" on public.reports
for update to authenticated using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
);

create policy "Project owners can delete reports" on public.reports
for delete to authenticated using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
);

create policy "Project owners can read artifacts" on public.report_artifacts
for select to authenticated using (
  exists (
    select 1
    from public.reports r
    join public.projects p on p.id = r.project_id
    where r.id = report_id and p.owner_id = (select auth.uid())
  )
);

create policy "Project owners can delete artifacts" on public.report_artifacts
for delete to authenticated using (
  exists (
    select 1
    from public.reports r
    join public.projects p on p.id = r.project_id
    where r.id = report_id and p.owner_id = (select auth.uid())
  )
);

create policy "Project owners can read storage artifacts" on storage.objects
for select to authenticated using (
  bucket_id = 'report-artifacts'
  and exists (
    select 1
    from public.report_artifacts ra
    join public.reports r on r.id = ra.report_id
    join public.projects p on p.id = r.project_id
    where ra.storage_path = storage.objects.name
      and p.owner_id = (select auth.uid())
  )
);

grant usage on schema public to anon, authenticated;
grant select on public.development_reports to authenticated;
grant select on public.production_reports to authenticated;
grant select on public.bug_reports to authenticated;
grant select on public.todo_reports to authenticated;
grant select on public.feedback_reports to authenticated;
