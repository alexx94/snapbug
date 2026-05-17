drop policy if exists "Project owners can manage keys" on public.project_keys;
drop policy if exists "Project members can read keys" on public.project_keys;

create policy "Project members can read keys" on public.project_keys
for select to authenticated
using (private.is_project_member(project_id));

create policy "Project owners can insert keys" on public.project_keys
for insert to authenticated
with check (private.is_project_owner(project_id));

create policy "Project owners can update keys" on public.project_keys
for update to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));

create policy "Project owners can delete keys" on public.project_keys
for delete to authenticated
using (private.is_project_owner(project_id));

drop policy if exists "Project owners can manage origins" on public.project_origins;
drop policy if exists "Project members can read origins" on public.project_origins;

create policy "Project members can read origins" on public.project_origins
for select to authenticated
using (private.is_project_member(project_id));

create policy "Project owners can insert origins" on public.project_origins
for insert to authenticated
with check (private.is_project_owner(project_id));

create policy "Project owners can update origins" on public.project_origins
for update to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));

create policy "Project owners can delete origins" on public.project_origins
for delete to authenticated
using (private.is_project_owner(project_id));
