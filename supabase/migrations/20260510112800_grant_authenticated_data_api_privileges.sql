grant usage on schema public to authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.project_keys to authenticated;
grant select, insert, update, delete on table public.project_origins to authenticated;
grant select, update, delete on table public.reports to authenticated;
grant select, delete on table public.report_artifacts to authenticated;

grant select on table public.development_reports to authenticated;
grant select on table public.production_reports to authenticated;
grant select on table public.bug_reports to authenticated;
grant select on table public.todo_reports to authenticated;
grant select on table public.feedback_reports to authenticated;

grant usage on schema storage to authenticated;
grant select on table storage.objects to authenticated;
