create schema if not exists private;

do $$
begin
  create type public.project_role as enum ('owner', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_invite_status as enum ('pending', 'accepted', 'declined');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.developer_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'Development token',
  last_used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '90 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint developer_tokens_name_length check (char_length(name) between 1 and 120)
);

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status public.project_invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint project_invites_email_lowercase check (email = lower(email)),
  constraint project_invites_email_length check (char_length(email) between 3 and 320)
);

create table if not exists public.project_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  artifact_id uuid references public.report_artifacts(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.reports
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.report_artifacts
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

insert into public.project_members (project_id, user_id, role, created_at)
select id, owner_id, 'owner'::public.project_role, created_at
from public.projects
on conflict (project_id, user_id) do update set role = 'owner'::public.project_role;

create index if not exists project_members_user_idx on public.project_members(user_id, project_id);
create index if not exists developer_tokens_user_active_idx on public.developer_tokens(user_id, revoked_at, expires_at);
create index if not exists project_invites_project_status_idx on public.project_invites(project_id, status, created_at desc);
create index if not exists project_invites_email_status_idx on public.project_invites(email, status, expires_at);
create unique index if not exists project_invites_one_pending_email_idx
  on public.project_invites(project_id, email)
  where status = 'pending';
create index if not exists reports_created_by_idx on public.reports(created_by) where created_by is not null;
create index if not exists reports_updated_by_idx on public.reports(updated_by) where updated_by is not null;
create index if not exists project_audit_events_project_created_idx on public.project_audit_events(project_id, created_at desc);
create index if not exists project_audit_events_report_created_idx on public.project_audit_events(report_id, created_at desc) where report_id is not null;

alter table public.project_members enable row level security;
alter table public.developer_tokens enable row level security;
alter table public.project_invites enable row level security;
alter table public.project_audit_events enable row level security;

create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
      and pm.role = 'owner'
  );
$$;

create or replace function private.is_teammate(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members mine
    join public.project_members teammate on teammate.project_id = mine.project_id
    where mine.user_id = (select auth.uid())
      and teammate.user_id = p_user_id
  );
$$;

grant usage on schema private to authenticated;
revoke execute on function private.is_project_member(uuid) from public, anon;
revoke execute on function private.is_project_owner(uuid) from public, anon;
revoke execute on function private.is_teammate(uuid) from public, anon;
grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.is_project_owner(uuid) to authenticated;
grant execute on function private.is_teammate(uuid) to authenticated;

grant usage on type public.project_role to authenticated;
grant usage on type public.project_invite_status to authenticated;
grant usage on type public.project_role to service_role;
grant usage on type public.project_invite_status to service_role;
revoke update on table public.reports from authenticated;
grant select, delete on table public.reports to authenticated;
grant select on table public.project_members to authenticated;
grant select on table public.developer_tokens to authenticated;
grant select on table public.project_invites to authenticated;
grant select on table public.project_audit_events to authenticated;

grant select, insert, update, delete on table public.project_members to service_role;
grant select, insert, update, delete on table public.developer_tokens to service_role;
grant select, insert, update, delete on table public.project_invites to service_role;
grant select, insert, update, delete on table public.project_audit_events to service_role;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner or teammates" on public.profiles
for select to authenticated using (
  (select auth.uid()) = id
  or private.is_teammate(id)
);

drop policy if exists "Project owners can read projects" on public.projects;
drop policy if exists "Project owners can update projects" on public.projects;
drop policy if exists "Project owners can delete projects" on public.projects;

create policy "Project members can read projects" on public.projects
for select to authenticated using (private.is_project_member(id));

create policy "Project owners can update projects" on public.projects
for update to authenticated
using (private.is_project_owner(id))
with check (private.is_project_owner(id));

create policy "Project owners can delete projects" on public.projects
for delete to authenticated using (private.is_project_owner(id));

drop policy if exists "Project owners can manage keys" on public.project_keys;
create policy "Project owners can manage keys" on public.project_keys
for all to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));

drop policy if exists "Project owners can manage origins" on public.project_origins;
create policy "Project owners can manage origins" on public.project_origins
for all to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));

drop policy if exists "Project owners can read reports" on public.reports;
drop policy if exists "Project owners can update reports" on public.reports;
drop policy if exists "Project owners can delete reports" on public.reports;

create policy "Project members can read reports" on public.reports
for select to authenticated using (private.is_project_member(project_id));

create policy "Project members can update reports" on public.reports
for update to authenticated
using (private.is_project_member(project_id))
with check (private.is_project_member(project_id));

create policy "Project owners can delete reports" on public.reports
for delete to authenticated using (private.is_project_owner(project_id));

drop policy if exists "Project owners can read artifacts" on public.report_artifacts;
drop policy if exists "Project owners can delete artifacts" on public.report_artifacts;
drop policy if exists "Project owners can upload attachment rows" on public.report_artifacts;
drop policy if exists "Uploaders can delete their attachment rows" on public.report_artifacts;

create policy "Project members can read artifacts" on public.report_artifacts
for select to authenticated using (
  exists (
    select 1
    from public.reports r
    where r.id = report_id
      and private.is_project_member(r.project_id)
  )
);

create policy "Project members can upload attachment rows" on public.report_artifacts
for insert to authenticated
with check (
  kind = 'attachment'
  and is_primary = false
  and uploaded_by = (select auth.uid())
  and exists (
    select 1
    from public.reports r
    where r.id = report_id
      and private.is_project_member(r.project_id)
  )
);

create policy "Project owners can delete artifacts" on public.report_artifacts
for delete to authenticated using (
  exists (
    select 1
    from public.reports r
    where r.id = report_id
      and private.is_project_owner(r.project_id)
  )
);

create policy "Uploaders can delete their attachment rows" on public.report_artifacts
for delete to authenticated using (
  kind = 'attachment'
  and uploaded_by = (select auth.uid())
);

create policy "Project members can read memberships" on public.project_members
for select to authenticated using (private.is_project_member(project_id));

create policy "Project owners can manage memberships" on public.project_members
for all to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));

create policy "Project creators can add owner membership" on public.project_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Users can read own developer tokens" on public.developer_tokens
for select to authenticated
using (user_id = (select auth.uid()));

create policy "Project owners and invitees can read invites" on public.project_invites
for select to authenticated using (
  private.is_project_owner(project_id)
  or (
    status = 'pending'
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy "Project owners can create invites" on public.project_invites
for insert to authenticated
with check (
  invited_by = (select auth.uid())
  and private.is_project_owner(project_id)
);

create policy "Project owners can update invites" on public.project_invites
for update to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));

create policy "Project members can read audit events" on public.project_audit_events
for select to authenticated using (private.is_project_member(project_id));

drop policy if exists "Project owners can read storage artifacts" on storage.objects;
create policy "Project members can read storage artifacts" on storage.objects
for select to authenticated using (
  bucket_id = 'report-artifacts'
  and exists (
    select 1
    from public.report_artifacts ra
    join public.reports r on r.id = ra.report_id
    where ra.storage_path = storage.objects.name
      and private.is_project_member(r.project_id)
  )
);

create or replace function public.snapbug_can_upload_report_artifact(object_name text)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  folders text[];
  report_uuid uuid;
begin
  folders := storage.foldername(object_name);

  if array_length(folders, 1) < 3 then
    return false;
  end if;

  if folders[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  if folders[2] <> 'attachments' then
    return false;
  end if;

  if folders[3] <> (select auth.uid())::text then
    return false;
  end if;

  report_uuid := folders[1]::uuid;

  return exists (
    select 1
    from public.report_artifacts ra
    join public.reports r on r.id = ra.report_id
    where ra.storage_path = object_name
      and ra.kind = 'attachment'
      and ra.uploaded_by = (select auth.uid())
      and r.id = report_uuid
      and private.is_project_member(r.project_id)
  );
end;
$$;

create or replace function private.profile_email(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select email from public.profiles where id = p_user_id;
$$;

create or replace function private.audit_report_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_email text;
begin
  if old.status is not distinct from new.status and old.priority is not distinct from new.priority then
    return new;
  end if;

  actor_email := private.profile_email(new.updated_by);

  insert into public.project_audit_events (
    project_id,
    report_id,
    actor_user_id,
    actor_email,
    action,
    old_values,
    new_values
  )
  values (
    new.project_id,
    new.id,
    new.updated_by,
    actor_email,
    'report.status_updated',
    jsonb_build_object('status', old.status, 'priority', old.priority),
    jsonb_build_object('status', new.status, 'priority', new.priority)
  );

  return new;
end;
$$;

create or replace function private.audit_artifact_uploaded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_project_id uuid;
  actor_email text;
begin
  select project_id into report_project_id from public.reports where id = new.report_id;
  actor_email := private.profile_email(new.uploaded_by);

  insert into public.project_audit_events (
    project_id,
    report_id,
    artifact_id,
    actor_user_id,
    actor_email,
    action,
    new_values
  )
  values (
    report_project_id,
    new.report_id,
    new.id,
    new.uploaded_by,
    actor_email,
    'artifact.uploaded',
    jsonb_build_object('kind', new.kind, 'display_name', new.display_name, 'content_type', new.content_type, 'byte_size', new.byte_size)
  );

  return new;
end;
$$;

create or replace function private.audit_invite_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited_by_email text;
  invitee_id uuid;
  invitee_email text;
begin
  if tg_op = 'INSERT' then
    invited_by_email := private.profile_email(new.invited_by);
    insert into public.project_audit_events (project_id, actor_user_id, actor_email, action, new_values)
    values (
      new.project_id,
      new.invited_by,
      invited_by_email,
      'invite.created',
      jsonb_build_object('email', new.email, 'expires_at', new.expires_at)
    );
    return new;
  end if;

  if old.status = 'pending' and new.status in ('accepted', 'declined') and old.status is distinct from new.status then
    select id, email into invitee_id, invitee_email
    from public.profiles
    where email = new.email
    limit 1;

    insert into public.project_audit_events (project_id, actor_user_id, actor_email, action, old_values, new_values)
    values (
      new.project_id,
      invitee_id,
      coalesce(invitee_email, new.email),
      case when new.status = 'accepted' then 'invite.accepted' else 'invite.declined' end,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'email', new.email)
    );
  end if;

  return new;
end;
$$;

create or replace function private.audit_member_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_email text;
begin
  actor_email := private.profile_email(new.user_id);
  insert into public.project_audit_events (project_id, actor_user_id, actor_email, action, new_values)
  values (
    new.project_id,
    new.user_id,
    actor_email,
    'team.member_added',
    jsonb_build_object('user_id', new.user_id, 'role', new.role)
  );
  return new;
end;
$$;

revoke execute on function private.profile_email(uuid) from public, anon, authenticated;
revoke execute on function private.audit_report_status() from public, anon, authenticated;
revoke execute on function private.audit_artifact_uploaded() from public, anon, authenticated;
revoke execute on function private.audit_invite_events() from public, anon, authenticated;
revoke execute on function private.audit_member_added() from public, anon, authenticated;

drop trigger if exists reports_audit_status on public.reports;
create trigger reports_audit_status
after update of status, priority on public.reports
for each row execute function private.audit_report_status();

drop trigger if exists report_artifacts_audit_uploaded on public.report_artifacts;
create trigger report_artifacts_audit_uploaded
after insert on public.report_artifacts
for each row execute function private.audit_artifact_uploaded();

drop trigger if exists project_invites_audit_events on public.project_invites;
create trigger project_invites_audit_events
after insert or update of status on public.project_invites
for each row execute function private.audit_invite_events();

drop trigger if exists project_members_audit_added on public.project_members;
create trigger project_members_audit_added
after insert on public.project_members
for each row execute function private.audit_member_added();
