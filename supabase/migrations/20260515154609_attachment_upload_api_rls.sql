alter table public.report_artifacts
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

grant insert on table public.report_artifacts to authenticated;
grant insert, delete on table storage.objects to authenticated;

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
    from public.reports r
    join public.projects p on p.id = r.project_id
    where r.id = report_uuid
      and p.owner_id = (select auth.uid())
  );
end;
$$;

revoke execute on function public.snapbug_can_upload_report_artifact(text) from public, anon;
grant execute on function public.snapbug_can_upload_report_artifact(text) to authenticated;

create policy "Project owners can upload attachment rows" on public.report_artifacts
for insert to authenticated
with check (
  kind = 'attachment'
  and is_primary = false
  and uploaded_by = (select auth.uid())
  and exists (
    select 1
    from public.reports r
    join public.projects p on p.id = r.project_id
    where r.id = report_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "Uploaders can delete their attachment rows" on public.report_artifacts
for delete to authenticated
using (
  kind = 'attachment'
  and uploaded_by = (select auth.uid())
);

create policy "Project owners can upload storage attachments" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'report-artifacts'
  and public.snapbug_can_upload_report_artifact(name)
);

create policy "Uploaders can delete storage attachments" on storage.objects
for delete to authenticated
using (
  bucket_id = 'report-artifacts'
  and owner_id = (select auth.uid())::text
);
