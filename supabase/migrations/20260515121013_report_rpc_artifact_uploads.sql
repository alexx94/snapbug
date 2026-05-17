alter type public.artifact_kind add value if not exists 'attachment';

alter table public.report_artifacts
  add column if not exists display_name text,
  add column if not exists description text,
  add column if not exists position integer not null default 0,
  add column if not exists is_primary boolean not null default false;

alter table public.report_artifacts
  drop constraint if exists report_artifacts_report_id_kind_key;

update public.report_artifacts
set
  display_name = coalesce(display_name, 'Initial screenshot'),
  position = 0,
  is_primary = true
where kind = 'screenshot';

update public.report_artifacts
set display_name = coalesce(
  display_name,
  case kind
    when 'console_logs' then 'Console logs'
    when 'replay' then 'Replay events'
    else initcap(replace(kind::text, '_', ' '))
  end
)
where display_name is null;

create unique index if not exists report_artifacts_one_primary_idx
  on public.report_artifacts(report_id)
  where is_primary;

create index if not exists report_artifacts_report_position_idx
  on public.report_artifacts(report_id, is_primary desc, position asc, created_at asc);

create index if not exists reports_project_env_status_type_created_idx
  on public.reports(project_id, environment, status, type, created_at desc);

update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'application/json',
  'text/plain',
  'text/markdown',
  'application/pdf'
]::text[]
where id = 'report-artifacts';

grant usage on type public.snapbug_environment to authenticated;
grant usage on type public.report_status to authenticated;
grant usage on type public.report_type to authenticated;
grant usage on type public.report_priority to authenticated;

create or replace function public.get_project_reports(
  p_project_id uuid,
  p_environment public.snapbug_environment,
  p_status public.report_status default 'open'::public.report_status,
  p_type public.report_type default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_sort text default 'newest',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  environment public.snapbug_environment,
  type public.report_type,
  status public.report_status,
  priority public.report_priority,
  title text,
  message text,
  reporter_name text,
  page_url text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      r.id,
      r.environment,
      r.type,
      r.status,
      r.priority,
      r.title,
      r.message,
      r.reporter_name,
      r.page_url,
      r.created_at,
      r.updated_at
    from public.reports r
    where r.project_id = p_project_id
      and r.environment = p_environment
      and (p_status is null or r.status = p_status)
      and (p_type is null or r.type = p_type)
      and (p_date_from is null or r.created_at >= p_date_from)
      and (p_date_to is null or r.created_at < p_date_to)
  )
  select
    filtered.id,
    filtered.environment,
    filtered.type,
    filtered.status,
    filtered.priority,
    filtered.title,
    filtered.message,
    filtered.reporter_name,
    filtered.page_url,
    filtered.created_at,
    filtered.updated_at,
    count(*) over () as total_count
  from filtered
  order by
    case when p_sort = 'oldest' then filtered.created_at end asc,
    case when p_sort <> 'oldest' then filtered.created_at end desc,
    filtered.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_project_report_counts(
  p_project_id uuid
)
returns table (
  environment public.snapbug_environment,
  status public.report_status,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.environment, r.status, count(*) as total
  from public.reports r
  where r.project_id = p_project_id
  group by r.environment, r.status;
$$;

revoke execute on function public.get_project_reports(
  uuid,
  public.snapbug_environment,
  public.report_status,
  public.report_type,
  timestamptz,
  timestamptz,
  text,
  integer,
  integer
) from public, anon;

revoke execute on function public.get_project_report_counts(uuid) from public, anon;

grant execute on function public.get_project_reports(
  uuid,
  public.snapbug_environment,
  public.report_status,
  public.report_type,
  timestamptz,
  timestamptz,
  text,
  integer,
  integer
) to authenticated;

grant execute on function public.get_project_report_counts(uuid) to authenticated;
