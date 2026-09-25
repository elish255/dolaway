-- ============================================================
-- NARAVIBE + DOLAWAY shared Supabase database
-- Chatpesa-style server database, isolated by table prefix.
-- Run once in Supabase SQL Editor.
-- ============================================================
create extension if not exists pgcrypto;

-- ========================= NARAVIBE =========================
create table if not exists public.naravibe_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null,
  email text not null,
  phone text not null,
  country text not null default 'Tanzania',
  password_hash text not null,
  password_salt text not null,
  status text not null default 'pending' check (status in ('pending','active','inactive','banned','rejected')),
  role text not null default 'user' check (role in ('user','admin')),
  balance bigint not null default 0 check (balance >= 0),
  withdrawn bigint not null default 0 check (withdrawn >= 0),
  created_at timestamptz not null default now(),
  activated_at timestamptz
);
create unique index if not exists naravibe_users_username_key on public.naravibe_users(lower(username));
create unique index if not exists naravibe_users_email_key on public.naravibe_users(lower(email));
create unique index if not exists naravibe_users_phone_key on public.naravibe_users(phone);

create table if not exists public.naravibe_activation_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.naravibe_users(id) on delete cascade,
  method text not null check (method in ('automatic','lipa_namba')),
  amount bigint not null check (amount > 0),
  phone text not null,
  external_id text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  reviewed_at timestamptz
);
create index if not exists naravibe_activation_user_idx on public.naravibe_activation_payments(user_id,status);
create index if not exists naravibe_activation_created_idx on public.naravibe_activation_payments(created_at desc);

create table if not exists public.naravibe_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.naravibe_users(id) on delete cascade,
  amount bigint not null check (amount >= 50000),
  method text not null,
  account_number text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists naravibe_withdrawals_user_idx on public.naravibe_withdrawals(user_id,status);
create index if not exists naravibe_withdrawals_created_idx on public.naravibe_withdrawals(created_at desc);

create table if not exists public.naravibe_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid not null references public.naravibe_users(id) on delete cascade,
  person_name text not null,
  payout bigint not null default 0 check (payout >= 0),
  message_count integer not null default 0 check (message_count between 0 and 20),
  status text not null default 'open' check (status in ('open','completed','closed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists naravibe_chat_user_created_idx on public.naravibe_chat_sessions(user_id,created_at desc);

create table if not exists public.naravibe_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.naravibe_users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info','success','warning','error')),
  created_at timestamptz not null default now()
);
create index if not exists naravibe_notifications_user_idx on public.naravibe_notifications(user_id,created_at desc);

-- ========================= DOLAWAY ===========================
create table if not exists public.dolaway_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null,
  email text not null,
  phone text not null,
  country text not null default 'Tanzania',
  password_hash text not null,
  password_salt text not null,
  status text not null default 'pending' check (status in ('pending','active','inactive','banned','rejected')),
  role text not null default 'user' check (role in ('user','admin')),
  balance bigint not null default 0 check (balance >= 0),
  withdrawn bigint not null default 0 check (withdrawn >= 0),
  created_at timestamptz not null default now(),
  activated_at timestamptz
);
create unique index if not exists dolaway_users_username_key on public.dolaway_users(lower(username));
create unique index if not exists dolaway_users_email_key on public.dolaway_users(lower(email));
create unique index if not exists dolaway_users_phone_key on public.dolaway_users(phone);

create table if not exists public.dolaway_activation_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dolaway_users(id) on delete cascade,
  method text not null check (method in ('automatic','lipa_namba')),
  amount bigint not null check (amount > 0),
  phone text not null,
  external_id text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  reviewed_at timestamptz
);
create index if not exists dolaway_activation_user_idx on public.dolaway_activation_payments(user_id,status);
create index if not exists dolaway_activation_created_idx on public.dolaway_activation_payments(created_at desc);

create table if not exists public.dolaway_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dolaway_users(id) on delete cascade,
  amount bigint not null check (amount >= 50000),
  method text not null,
  account_number text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists dolaway_withdrawals_user_idx on public.dolaway_withdrawals(user_id,status);
create index if not exists dolaway_withdrawals_created_idx on public.dolaway_withdrawals(created_at desc);

create table if not exists public.dolaway_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid not null references public.dolaway_users(id) on delete cascade,
  person_name text not null,
  payout bigint not null default 0 check (payout >= 0),
  message_count integer not null default 0 check (message_count between 0 and 20),
  status text not null default 'open' check (status in ('open','completed','closed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists dolaway_chat_user_created_idx on public.dolaway_chat_sessions(user_id,created_at desc);

create table if not exists public.dolaway_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.dolaway_users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info','success','warning','error')),
  created_at timestamptz not null default now()
);
create index if not exists dolaway_notifications_user_idx on public.dolaway_notifications(user_id,created_at desc);

-- Server uses SUPABASE_SECRET_KEY / legacy service-role key. Browser does not write these tables.
alter table public.naravibe_users enable row level security;
alter table public.naravibe_activation_payments enable row level security;
alter table public.naravibe_withdrawals enable row level security;
alter table public.naravibe_chat_sessions enable row level security;
alter table public.naravibe_notifications enable row level security;

alter table public.dolaway_users enable row level security;
alter table public.dolaway_activation_payments enable row level security;
alter table public.dolaway_withdrawals enable row level security;
alter table public.dolaway_chat_sessions enable row level security;
alter table public.dolaway_notifications enable row level security;

-- ============================================================
-- ADMIN SETUP
-- 1. Register a normal account on each website.
-- 2. Replace the email below and run the corresponding UPDATE.
-- ============================================================
-- NaraVibe admin:
 update public.naravibe_users set role='admin', status='a
 ctive', activated_at=now()
 where lower(email)=lower('yohanaelisha164@gmail.com');
--
-- DolaWay admin:
 update public.dolaway_users set role='admin', status='active', activated_at=now()
where lower(email)=lower('yohanaelisha164@gmail.com');
