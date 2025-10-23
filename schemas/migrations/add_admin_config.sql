-- Admin Panel Configuration Table
-- Single record with config_id='current'
-- No versioning, no audit trail

create table if not exists public.admin_configs (
  config_id text primary key default 'current',
  payload jsonb not null,
  author_user_id uuid references auth.users(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies (admin-only access)
alter table public.admin_configs enable row level security;

create policy "Admins can read configs"
  on public.admin_configs for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

create policy "Admins can insert configs"
  on public.admin_configs for insert
  with check (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

create policy "Admins can update configs"
  on public.admin_configs for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insert default configuration
insert into public.admin_configs (config_id, payload, notes)
values (
  'current',
  '{
    "cognitive": {
      "axis_weights": { "N": 1.0, "S": 1.0, "T": 1.0, "F": 1.0 },
      "shadow_factor": 0.35,
      "trigger_threshold": 0.22,
      "blindspot_decay_rate": 0.92
    },
    "fear": {
      "weights": {
        "unworthiness": 1.0,
        "unlovability": 1.0,
        "powerlessness": 1.0,
        "unsafety": 1.0
      },
      "recency_decay": { "half_life_days": 14 },
      "heat_map_gradient": [0.15, 0.35, 0.6, 0.8]
    },
    "intake": {
      "flow": { "min_cards": 5, "max_cards": 6, "summary_confirm_min_confidence": 0.7 },
      "intensity": { "up": 2, "down": 1, "neither": 0.5 },
      "functions": { "Se": 1, "Ne": 1, "Si": 1, "Ni": 1, "Te": 1, "Ti": 1, "Fe": 1, "Fi": 1 }
    },
    "translator": {
      "default_mode": "4",
      "enable_advanced": true
    },
    "share": {
      "card_templates": ["minimal_quote_v1", "split_then_now_v1", "glow_pulse_v1"],
      "public_wall_enabled": false
    },
    "ui": {
      "animation_speed_factor": 1.0,
      "bar_display_limit": 3,
      "theme_palette": "indigo_glass"
    }
  }'::jsonb,
  'Initial MVP defaults'
)
on conflict (config_id) do nothing;

