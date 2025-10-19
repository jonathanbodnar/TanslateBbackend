-- Supabase Schema (MVP) - Complete Implementation

create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- Users are in auth.users; create a profile table for denormalized public data
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- Questions table (replaces static data)
create table if not exists public.questions (
  id text primary key,
  headline text not null,
  left_label text not null,
  right_label text not null,
  helper_text text,
  category text check (category in ('communication', 'relationship', 'personality', 'fear')),
  order_index integer not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User roles for admin functionality
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('admin', 'editor', 'user')) not null default 'user',
  created_at timestamptz default now()
);

-- Intake sessions
create table if not exists public.intake_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  mode text check (mode in ('quick','full')) not null,
  story_text text not null,
  created_at timestamptz default now(),
  completed boolean default false
);

create table if not exists public.intake_answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.intake_sessions(id) on delete cascade,
  question_id text references public.questions(id) not null,
  choice text check (choice in ('left','right','neither')) not null,
  intensity smallint check (intensity between 0 and 2) not null,
  created_at timestamptz default now()
);

-- Reflections (WIMTS + chosen translation)
create table if not exists public.reflections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  base_intake_text text not null,
  wimts_option_id text not null,
  translation_mode text check (translation_mode in ('4','8')) not null,
  chosen_translation_key text not null,
  translation_text text not null,
  recipient_id uuid,
  created_at timestamptz default now()
);


-- Contacts (Relational Web)
create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  name text not null,
  role text,
  relationship_type text,
  created_at timestamptz default now()
);

create table if not exists public.contact_sliders (
  contact_id uuid primary key references public.contacts(id) on delete cascade,
  directness int2 default 50,
  formality int2 default 50,
  warmth int2 default 70,
  support int2 default 70,
  humor int2 default 50,
  teasing int2 default 40
);

-- Insights (Profile feed)
create table if not exists public.insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  type text check (type in ('communication','trigger','growth','realization')) not null,
  title text,
  snippet text,
  tags text[],
  created_at timestamptz default now()
);

-- Admin config versions
create table if not exists public.admin_configs (
  config_id text primary key,
  status text check (status in ('draft','published')) not null,
  payload jsonb not null,
  author_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  action text,
  config_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- Shortlinks (for share)
create table if not exists public.shortlinks (
  code text primary key,
  target_url text not null,
  utm jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_profiles_user on public.profiles(user_id);
create index if not exists idx_questions_active on public.questions(is_active);
create index if not exists idx_questions_order on public.questions(order_index);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_intake_sessions_user on public.intake_sessions(user_id);
create index if not exists idx_intake_sessions_completed on public.intake_sessions(completed);
create index if not exists idx_intake_answers_session on public.intake_answers(session_id);
create index if not exists idx_intake_answers_question on public.intake_answers(question_id);
create index if not exists idx_reflections_user on public.reflections(user_id);
create index if not exists idx_reflections_created on public.reflections(created_at);
create index if not exists idx_contacts_user on public.contacts(user_id);
create index if not exists idx_contact_sliders_contact on public.contact_sliders(contact_id);
create index if not exists idx_insights_user on public.insights(user_id);
create index if not exists idx_insights_type on public.insights(type);
create index if not exists idx_admin_configs_status on public.admin_configs(status);
create index if not exists idx_admin_audit_log_actor on public.admin_audit_log(actor_user_id);
create index if not exists idx_shortlinks_created_by on public.shortlinks(created_by);

-- pgvector extensions already declared at top

-- Embeddings for reflections
create table if not exists public.reflection_embeddings (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid unique references public.reflections(id) on delete cascade,
  embedding vector(1536) not null,
  created_at timestamptz default now()
);

-- Upsert helper
create or replace function public.upsert_reflection_embedding(reflection_id uuid, embedding vector(1536))
returns void
language plpgsql
as $$
begin
  insert into public.reflection_embeddings(reflection_id, embedding)
  values (upsert_reflection_embedding.reflection_id, upsert_reflection_embedding.embedding)
  on conflict (reflection_id) do update set embedding = excluded.embedding, created_at = now();
end;
$$;

-- Similarity helper: find nearest neighbors to a reflection's vector
create or replace function public.similar_reflections(p_reflection_id uuid, match_limit int default 5)
returns table (reflection_id uuid, distance double precision)
language sql
as $$
  with base as (
    select embedding from public.reflection_embeddings where reflection_id = p_reflection_id
  )
  select re.reflection_id, (re.embedding <=> base.embedding) as distance
  from public.reflection_embeddings re, base
  where re.reflection_id <> p_reflection_id
  order by re.embedding <=> base.embedding
  limit match_limit;
$$;


-- Analytics events table
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id UUID,
  page_id TEXT NOT NULL,
  app_version TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analytics_events_event ON analytics_events(event);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_ts ON analytics_events(ts);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);


-- WIMTS sessions (links to intake sessions or standalone)
CREATE TABLE IF NOT EXISTS public.wimts_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID, -- Optional reference to intake_sessions, no foreign key constraint
  user_id UUID REFERENCES auth.users(id),
  intake_text TEXT NOT NULL,
  profile_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE
);

-- WIMTS options generated for each session
CREATE TABLE IF NOT EXISTS public.wimts_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wimts_session_id UUID REFERENCES public.wimts_sessions(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL, -- 'A', 'B', 'C'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WIMTS selections (user choices)
CREATE TABLE IF NOT EXISTS public.wimts_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wimts_session_id UUID REFERENCES public.wimts_sessions(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wimts_sessions_user ON public.wimts_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wimts_sessions_session ON public.wimts_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_wimts_options_session ON public.wimts_options(wimts_session_id);
CREATE INDEX IF NOT EXISTS idx_wimts_selections_session ON public.wimts_selections(wimts_session_id);

-- RLS Policies
ALTER TABLE public.wimts_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wimts_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wimts_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY wimts_sessions_rw ON public.wimts_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY wimts_options_rw ON public.wimts_options
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.wimts_sessions ws 
    WHERE ws.id = wimts_session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY wimts_selections_rw ON public.wimts_selections
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.wimts_sessions ws 
    WHERE ws.id = wimts_session_id AND ws.user_id = auth.uid()
  ));

-- Additional RLS Policies for Complete Security

-- Profiles: user can manage own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY profiles_upsert_self ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Questions: public read, admin write
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY questions_public_read ON public.questions
  FOR SELECT USING (is_active = true);
CREATE POLICY questions_admin_write ON public.questions
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.user_roles r 
    WHERE r.user_id = auth.uid() AND r.role IN ('admin', 'editor')
  ));

-- User roles: users can read own role, admin can manage
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_read_self ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_roles_admin_manage ON public.user_roles
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.user_roles r 
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  ));

-- Intake sessions/answers: owner only
ALTER TABLE public.intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY intake_sessions_rw ON public.intake_sessions
  FOR ALL USING (
    user_id = auth.uid() OR user_id IS NULL
  ) WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

CREATE POLICY intake_answers_rw ON public.intake_answers
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.intake_sessions s 
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  )) WITH CHECK (EXISTS(
    SELECT 1 FROM public.intake_sessions s 
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

-- Reflections: owner only
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY reflections_rw ON public.reflections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Contacts & sliders: owner only
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sliders ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_rw ON public.contacts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY contact_sliders_rw ON public.contact_sliders
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.contacts c 
    WHERE c.id = contact_id AND c.user_id = auth.uid()
  )) WITH CHECK (EXISTS(
    SELECT 1 FROM public.contacts c 
    WHERE c.id = contact_id AND c.user_id = auth.uid()
  ));

-- Insights: owner select/insert; no updates for MVP
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY insights_rw ON public.insights
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY insights_insert ON public.insights
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin configs: only admins
ALTER TABLE public.admin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_configs_admin_only ON public.admin_configs
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.user_roles r 
    WHERE r.user_id = auth.uid() AND r.role IN ('admin', 'editor')
  )) WITH CHECK (EXISTS(
    SELECT 1 FROM public.user_roles r 
    WHERE r.user_id = auth.uid() AND r.role IN ('admin', 'editor')
  ));

CREATE POLICY admin_audit_log_admin_only ON public.admin_audit_log
  FOR ALL USING (EXISTS(
    SELECT 1 FROM public.user_roles r 
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  )) WITH CHECK (EXISTS(
    SELECT 1 FROM public.user_roles r 
    WHERE r.user_id = auth.uid() AND r.role = 'admin'
  ));

-- Shortlinks: public select (redirect), owner manage
ALTER TABLE public.shortlinks ENABLE ROW LEVEL SECURITY;
CREATE POLICY shortlinks_public_read ON public.shortlinks 
  FOR SELECT USING (true);
CREATE POLICY shortlinks_owner_write ON public.shortlinks
  FOR ALL USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Lock down embeddings table (service role/RPC only)
ALTER TABLE public.reflection_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON public.reflection_embeddings
  FOR ALL USING (false);