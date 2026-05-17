create index if not exists report_artifacts_uploaded_by_idx
  on public.report_artifacts(uploaded_by)
  where uploaded_by is not null;

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
    join public.projects p on p.id = r.project_id
    where ra.storage_path = object_name
      and ra.kind = 'attachment'
      and ra.uploaded_by = (select auth.uid())
      and r.id = report_uuid
      and p.owner_id = (select auth.uid())
  );
end;
$$;

revoke execute on function public.snapbug_can_upload_report_artifact(text) from public, anon;
grant execute on function public.snapbug_can_upload_report_artifact(text) to authenticated;
