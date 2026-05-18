-- Storage DELETE policies for attachment files
create policy "Uploaders can delete own storage artifacts" on storage.objects
for delete to authenticated using (
  bucket_id = 'report-artifacts'
  and exists (
    select 1
    from public.report_artifacts ra
    where ra.storage_path = storage.objects.name
      and ra.kind = 'attachment'
      and ra.uploaded_by = (select auth.uid())
  )
);

create policy "Project owners can delete storage artifacts" on storage.objects
for delete to authenticated using (
  bucket_id = 'report-artifacts'
  and exists (
    select 1
    from public.report_artifacts ra
    join public.reports r on r.id = ra.report_id
    where ra.storage_path = storage.objects.name
      and private.is_project_owner(r.project_id)
  )
);

-- Audit trigger for artifact deletion
create or replace function private.audit_artifact_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_project_id uuid;
  actor_email text;
begin
  select project_id into report_project_id from public.reports where id = old.report_id;
  actor_email := private.profile_email(old.uploaded_by);

  insert into public.project_audit_events (
    project_id,
    report_id,
    artifact_id,
    actor_user_id,
    actor_email,
    action,
    old_values
  )
  values (
    report_project_id,
    old.report_id,
    old.id,
    old.uploaded_by,
    actor_email,
    'artifact.deleted',
    jsonb_build_object('kind', old.kind, 'display_name', old.display_name, 'content_type', old.content_type, 'byte_size', old.byte_size)
  );

  return old;
end;
$$;

revoke execute on function private.audit_artifact_deleted() from public, anon, authenticated;

create trigger report_artifacts_audit_deleted
after delete on public.report_artifacts
for each row execute function private.audit_artifact_deleted();
