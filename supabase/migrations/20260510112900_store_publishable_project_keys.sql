alter table public.project_keys
add column if not exists key_value text;

comment on column public.project_keys.key_value is 'Publishable SnapBug key shown in dashboard. Not for service-role secrets.';
