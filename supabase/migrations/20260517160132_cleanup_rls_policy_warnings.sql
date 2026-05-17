drop policy if exists "Project owners can read keys" on public.project_keys;
drop policy if exists "Project owners can read origins" on public.project_origins;

drop policy if exists "Project owners and invitees can read invites" on public.project_invites;
create policy "Project owners and invitees can read invites" on public.project_invites
for select to authenticated using (
  private.is_project_owner(project_id)
  or (
    status = 'pending'
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

drop policy if exists "Project owners can manage memberships" on public.project_members;
drop policy if exists "Project creators can add owner membership" on public.project_members;

drop policy if exists "Project owners can delete artifacts" on public.report_artifacts;
drop policy if exists "Uploaders can delete their attachment rows" on public.report_artifacts;
create policy "Project owners or uploaders can delete artifacts" on public.report_artifacts
for delete to authenticated using (
  (
    kind = 'attachment'
    and uploaded_by = (select auth.uid())
  )
  or exists (
    select 1
    from public.reports r
    where r.id = report_id
      and private.is_project_owner(r.project_id)
  )
);
