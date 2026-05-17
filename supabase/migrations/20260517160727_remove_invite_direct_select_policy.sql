drop policy if exists "Project owners and invitees can read invites" on public.project_invites;
revoke select on table public.project_invites from authenticated;
