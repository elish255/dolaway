-- Shared Supabase schema for NaraVibe + DolaWay.
-- Both apps use the SAME database but NEVER share user/payment/chat tables.
-- Chatpesa tables remain untouched.
create extension if not exists pgcrypto;

-- ========================= NARAVIBE =========================
do $$ begin
  if not exists (select 1 from pg_type where typname='naravibe_user_status') then create type public.naravibe_user_status as enum ('pending','active','deactivated','banned','rejected'); end if;
end $$;
create table if not exists public.naravibe_users(
 id uuid primary key default gen_random_uuid(), name text not null, username text not null, email text not null, phone text not null, country text not null default 'Tanzania',
 password_hash text not null, password_salt text not null, status public.naravibe_user_status not null default 'pending', role text not null default 'user' check(role in('user','admin')),
 balance bigint not null default 0 check(balance>=0), withdrawn bigint not null default 0 check(withdrawn>=0), created_at timestamptz not null default now(), activated_at timestamptz);
create unique index if not exists naravibe_users_username_key on public.naravibe_users(lower(username));
create unique index if not exists naravibe_users_email_key on public.naravibe_users(lower(email));
create unique index if not exists naravibe_users_phone_key on public.naravibe_users(phone);
create table if not exists public.naravibe_payments(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.naravibe_users(id) on delete cascade,
 method text not null check(method in('automatic','lipa_namba')), amount bigint not null check(amount>0), phone text not null, external_id text, status text not null default 'pending' check(status in('pending','approved','rejected')), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), confirmed_at timestamptz, reviewed_at timestamptz);
create index if not exists naravibe_payments_user_idx on public.naravibe_payments(user_id,status);
create table if not exists public.naravibe_withdrawals(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.naravibe_users(id) on delete cascade, amount bigint not null check(amount>=50000), phone text not null, status text not null default 'pending' check(status in('pending','approved','rejected')), created_at timestamptz not null default now(), reviewed_at timestamptz);
create table if not exists public.naravibe_chat_sessions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.naravibe_users(id) on delete cascade, foreigner_slug text not null, payout bigint not null, message_count integer not null default 0 check(message_count between 0 and 20), status text not null default 'open' check(status in('open','completed','closed')), created_at timestamptz not null default now(), completed_at timestamptz, unique(user_id,foreigner_slug));
create table if not exists public.naravibe_chat_messages(
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.naravibe_chat_sessions(id) on delete cascade, sender_type text not null check(sender_type in('user','foreigner')), content text not null, created_at timestamptz not null default now());
create table if not exists public.naravibe_notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid references public.naravibe_users(id) on delete cascade, title text not null, message text not null, type text not null default 'info' check(type in('info','success','warning','error')), created_at timestamptz not null default now());

-- ========================= DOLAWAY =========================
do $$ begin
  if not exists (select 1 from pg_type where typname='dolaway_user_status') then create type public.dolaway_user_status as enum ('pending','active','deactivated','banned','rejected'); end if;
end $$;
create table if not exists public.dolaway_users(
 id uuid primary key default gen_random_uuid(), name text not null, username text not null, email text not null, phone text not null, country text not null default 'Tanzania',
 password_hash text not null, password_salt text not null, status public.dolaway_user_status not null default 'pending', role text not null default 'user' check(role in('user','admin')),
 balance bigint not null default 0 check(balance>=0), withdrawn bigint not null default 0 check(withdrawn>=0), created_at timestamptz not null default now(), activated_at timestamptz);
create unique index if not exists dolaway_users_username_key on public.dolaway_users(lower(username));
create unique index if not exists dolaway_users_email_key on public.dolaway_users(lower(email));
create unique index if not exists dolaway_users_phone_key on public.dolaway_users(phone);
create table if not exists public.dolaway_payments(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.dolaway_users(id) on delete cascade,
 method text not null check(method in('automatic','lipa_namba')), amount bigint not null check(amount>0), phone text not null, external_id text, status text not null default 'pending' check(status in('pending','approved','rejected')), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), confirmed_at timestamptz, reviewed_at timestamptz);
create index if not exists dolaway_payments_user_idx on public.dolaway_payments(user_id,status);
create table if not exists public.dolaway_withdrawals(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.dolaway_users(id) on delete cascade, amount bigint not null check(amount>=50000), phone text not null, status text not null default 'pending', created_at timestamptz not null default now(), reviewed_at timestamptz);
create table if not exists public.dolaway_chat_sessions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.dolaway_users(id) on delete cascade, foreigner_slug text not null, payout bigint not null, message_count integer not null default 0 check(message_count between 0 and 20), status text not null default 'open' check(status in('open','completed','closed')), created_at timestamptz not null default now(), completed_at timestamptz, unique(user_id,foreigner_slug));
create table if not exists public.dolaway_chat_messages(
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.dolaway_chat_sessions(id) on delete cascade, sender_type text not null check(sender_type in('user','foreigner')), content text not null, created_at timestamptz not null default now());
create table if not exists public.dolaway_notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid references public.dolaway_users(id) on delete cascade, title text not null, message text not null, type text not null default 'info', created_at timestamptz not null default now());

alter table public.naravibe_users enable row level security; alter table public.naravibe_payments enable row level security; alter table public.naravibe_withdrawals enable row level security; alter table public.naravibe_chat_sessions enable row level security; alter table public.naravibe_chat_messages enable row level security; alter table public.naravibe_notifications enable row level security;
alter table public.dolaway_users enable row level security; alter table public.dolaway_payments enable row level security; alter table public.dolaway_withdrawals enable row level security; alter table public.dolaway_chat_sessions enable row level security; alter table public.dolaway_chat_messages enable row level security; alter table public.dolaway_notifications enable row level security;

-- Admin setup: register an account in the respective site, then run the matching line:
-- update public.naravibe_users set role='admin',status='active',activated_at=now() where lower(email)=lower('YOUR_NARAVIBE_ADMIN_EMAIL');
-- update public.dolaway_users set role='admin',status='active',activated_at=now() where lower(email)=lower('YOUR_DOLAWAY_ADMIN_EMAIL');

-- Server-side access uses SUPABASE_SERVICE_ROLE_KEY, so the browser never receives direct table write access.
