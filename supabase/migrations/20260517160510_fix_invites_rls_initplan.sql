drop policy if exists "Project owners and invitees can read invites" on public.project_invites;

create policy "Project owners and invitees can read invites" on public.project_invites
for select to authenticated using (
  private.is_project_owner(project_id)
  or (
    status = 'pending'
    and email = lower(coalesce((select (auth.jwt() ->> 'email')), ''))
  )
);
