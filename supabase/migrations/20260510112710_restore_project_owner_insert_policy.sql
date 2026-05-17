drop policy if exists "Enable insert for authenticated users only" on public.projects;
drop policy if exists "Project owners can create projects" on public.projects;

create policy "Project owners can create projects" on public.projects
for insert to authenticated
with check ((select auth.uid()) = owner_id);
