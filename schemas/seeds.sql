-- Minimal seeds (safe for local/dev)

insert into public.admin_configs (config_id, status, payload, author_user_id)
values (
  'cfg_mvp_1',
  'published',
  (select to_jsonb(payload) from jsonb_to_record('{"payload":null}'::jsonb) as t(payload jsonb))
  , null
)
on conflict do nothing;

-- Example roles (replace with real users in dev)
-- insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-000000000000','admin');


