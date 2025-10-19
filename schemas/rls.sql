-- Enable RLS and basic policies

alter table public.profiles enable row level security;
alter table public.intake_sessions enable row level security;
alter table public.intake_answers enable row level security;
alter table public.reflections enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_sliders enable row level security;
alter table public.insights enable row level security;
alter table public.admin_configs enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.shortlinks enable row level security;

-- Helper: current user id (via auth.jwt())
-- Supabase provides auth.uid() in policies

-- Profiles: user can select own profile
create policy profiles_select_self on public.profiles
  for select using (user_id = auth.uid());
create policy profiles_upsert_self on public.profiles
  for insert with check (user_id = auth.uid());
create policy profiles_update_self on public.profiles
  for update using (user_id = auth.uid());

-- Intake sessions/answers: owner only
create policy intake_sessions_rw on public.intake_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy intake_answers_rw on public.intake_answers
  for all using (exists(select 1 from public.intake_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists(select 1 from public.intake_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- Reflections: owner only
create policy reflections_rw on public.reflections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Contacts & sliders: owner only
create policy contacts_rw on public.contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy contact_sliders_rw on public.contact_sliders
  for all using (exists(select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid()))
  with check (exists(select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid()));

-- Insights: owner select/insert; no updates for MVP
create policy insights_rw on public.insights
  for select using (user_id = auth.uid());
create policy insights_insert on public.insights
  for insert with check (user_id = auth.uid());

-- Admin configs: only admins
-- Expect a Postgres function is_admin(auth.uid()) or a table user_roles(user_id, role)
-- For MVP, use a simple table user_roles
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id),
  role text check (role in ('admin','editor')) not null
);

create policy admin_configs_admin_only on public.admin_configs
  for all using (exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','editor')))
  with check (exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin')));

create policy admin_audit_log_admin_only on public.admin_audit_log
  for all using (exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin')))
  with check (exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin')));

-- Shortlinks: public select (redirect), owner manage
create policy shortlinks_public_read on public.shortlinks for select using (true);
create policy shortlinks_owner_write on public.shortlinks
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

-- Lock down embeddings table (service role/RPC only)
alter table public.reflection_embeddings enable row level security;

create policy "No selects" on public.reflection_embeddings
for select using (false);

create policy "No inserts" on public.reflection_embeddings
for insert with check (false);

create policy "No updates" on public.reflection_embeddings
for update using (false);

create policy "No deletes" on public.reflection_embeddings
for delete using (false);

-- User roles: users can only read their own role; writes via service role
alter table public.user_roles enable row level security;

create policy "User can read own role" on public.user_roles
for select using (auth.uid() = user_id);