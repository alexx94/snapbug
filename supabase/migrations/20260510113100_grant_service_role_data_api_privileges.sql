grant usage on schema public to service_role;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.projects to service_role;
grant select, insert, update, delete on table public.project_keys to service_role;
grant select, insert, update, delete on table public.project_origins to service_role;
grant select, insert, update, delete on table public.reports to service_role;
grant select, insert, update, delete on table public.report_artifacts to service_role;

grant select on table public.development_reports to service_role;
grant select on table public.production_reports to service_role;
grant select on table public.bug_reports to service_role;
grant select on table public.todo_reports to service_role;
grant select on table public.feedback_reports to service_role;

grant usage on schema storage to service_role;
grant select, insert, update, delete on table storage.objects to service_role;
