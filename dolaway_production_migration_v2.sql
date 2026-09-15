-- DOLAWAY PRODUCTION SUPABASE MIGRATION
-- IMPORTANT:
-- Run PART 1, PART 2, PART 3, and PART 4 separately.
-- Do NOT run all four parts together.
-- This version contains the complete SQL.

-- ============================================================
-- PART 1 — EXTENSION, ENUMS, TABLES
-- ============================================================

create extension if not exists pgcrypto;

drop type if exists public.account_status cascade;
drop type if exists public.account_role cascade;
drop type if exists public.payment_status cascade;
drop type if exists public.chat_status cascade;

create type public.account_status as enum ('pending','approved','rejected');
create type public.account_role as enum ('user','admin');
create type public.payment_status as enum ('pending','approved','rejected');
create type public.chat_status as enum ('open','completed','closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text not null unique,
  email text not null,
  phone text not null default '',
  country text not null default '',
  status public.account_status not null default 'pending',
  role public.account_role not null default 'user',
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_type text not null default 'activation',
  amount bigint not null check (amount > 0),
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id)
);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  foreigner_slug text not null,
  payout bigint not null check (payout >= 0),
  message_count integer not null default 0 check (message_count >= 0 and message_count <= 20),
  status public.chat_status not null default 'open',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, foreigner_slug)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender_type text not null check(sender_type in ('user','foreigner')),
  content text not null check(length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check(amount >= 50000),
  phone text not null,
  status text not null default 'pending'
    check(status in ('pending','approved','rejected','paid')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_chat_sessions_user on public.chat_sessions(user_id);
create index if not exists idx_chat_messages_session on public.chat_messages(session_id);
create index if not exists idx_withdrawals_user on public.withdrawals(user_id);


-- ============================================================
-- PART 2 — FUNCTIONS AND AUTH TRIGGER
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    'user_' || substr(replace(new.id::text,'-',''),1,10)
  );

  insert into public.profiles(
    id, full_name, username, email, phone, country
  )
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    v_username,
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'country','')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


create or replace function public.get_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where lower(username) = lower(trim(p_username))
  limit 1;
$$;


create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;


create or replace function public.create_activation_payment(p_amount bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  x public.payments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount <> 14500 then
    raise exception 'Invalid activation amount';
  end if;

  select *
  into x
  from public.payments
  where user_id = auth.uid()
    and payment_type = 'activation'
    and status = 'pending'
  order by created_at desc
  limit 1;

  if x.id is null then
    insert into public.payments(user_id, amount)
    values(auth.uid(), p_amount)
    returning * into x;
  end if;

  return json_build_object(
    'id', x.id,
    'status', x.status,
    'amount', x.amount
  );
end;
$$;


create or replace function public.approve_activation_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.payments;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select *
  into p
  from public.payments
  where id = p_payment_id
  for update;

  if p.id is null then
    raise exception 'Payment not found';
  end if;

  if p.status <> 'pending' then
    raise exception 'Payment is not pending';
  end if;

  update public.payments
  set
    status = 'approved',
    approved_at = now(),
    approved_by = auth.uid()
  where id = p.id;

  update public.profiles
  set
    status = 'approved',
    updated_at = now()
  where id = p.user_id;
end;
$$;


create or replace function public.reject_activation_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.payments
  set
    status = 'rejected',
    approved_at = now(),
    approved_by = auth.uid()
  where id = p_payment_id
    and status = 'pending';

  if not found then
    raise exception 'Payment not found or already processed';
  end if;
end;
$$;


create or replace function public.get_or_create_chat_session(
  p_foreigner_slug text,
  p_payout bigint
)
returns public.chat_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  x public.chat_sessions;
begin
  if not exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  ) then
    raise exception 'Account is not approved';
  end if;

  if p_foreigner_slug is null or length(trim(p_foreigner_slug)) = 0 then
    raise exception 'Invalid foreigner';
  end if;

  if p_payout < 0 then
    raise exception 'Invalid payout';
  end if;

  insert into public.chat_sessions(
    user_id,
    foreigner_slug,
    payout
  )
  values(
    auth.uid(),
    trim(p_foreigner_slug),
    p_payout
  )
  on conflict(user_id, foreigner_slug)
  do update set
    payout = excluded.payout
  returning * into x;

  return x;
end;
$$;


create or replace function public.send_chat_message(
  p_session_id uuid,
  p_content text
)
returns public.chat_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  x public.chat_sessions;
begin
  select *
  into x
  from public.chat_sessions
  where id = p_session_id
    and user_id = auth.uid()
  for update;

  if x.id is null then
    raise exception 'Chat not found';
  end if;

  if x.status <> 'open' or x.message_count >= 20 then
    raise exception 'Chat is closed';
  end if;

  if not exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  ) then
    raise exception 'Account is not approved';
  end if;

  if length(trim(p_content)) = 0 then
    raise exception 'Empty message';
  end if;

  insert into public.chat_messages(
    session_id,
    sender_type,
    content
  )
  values(
    x.id,
    'user',
    trim(p_content)
  );

  update public.chat_sessions
  set message_count = message_count + 1
  where id = x.id
  returning * into x;

  if x.message_count >= 20 then
    update public.chat_sessions
    set
      status = 'completed',
      completed_at = now()
    where id = x.id
    returning * into x;
  end if;

  return x;
end;
$$;


create or replace function public.complete_chat(p_session_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  x public.chat_sessions;
  new_balance bigint;
begin
  select *
  into x
  from public.chat_sessions
  where id = p_session_id
    and user_id = auth.uid()
  for update;

  if x.id is null then
    raise exception 'Chat not found';
  end if;

  if x.status = 'completed' and x.completed_at is not null then
    select balance
    into new_balance
    from public.profiles
    where id = auth.uid();

    return json_build_object(
      'balance', new_balance,
      'already_completed', true
    );
  end if;

  if x.message_count < 20 then
    raise exception 'Chat must reach 20 messages';
  end if;

  update public.chat_sessions
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now())
  where id = x.id;

  update public.profiles
  set
    balance = balance + x.payout,
    updated_at = now()
  where id = auth.uid()
  returning balance into new_balance;

  return json_build_object(
    'balance', new_balance,
    'already_completed', false
  );
end;
$$;


create or replace function public.request_withdrawal(
  p_amount bigint,
  p_phone text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  b bigint;
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount < 50000 then
    raise exception 'Minimum withdrawal is 50000';
  end if;

  v_phone := regexp_replace(trim(p_phone), '[^0-9]', '', 'g');

  if v_phone !~ '^0[67][0-9]{8}$' then
    raise exception 'Invalid phone number';
  end if;

  update public.profiles
  set
    balance = balance - p_amount,
    updated_at = now()
  where id = auth.uid()
    and status = 'approved'
    and balance >= p_amount
  returning balance into b;

  if b is null then
    raise exception 'Insufficient balance or account is not approved';
  end if;

  insert into public.withdrawals(
    user_id,
    amount,
    phone
  )
  values(
    auth.uid(),
    p_amount,
    v_phone
  );

  return json_build_object(
    'balance', b,
    'status', 'success'
  );
end;
$$;


-- ============================================================
-- PART 3 — RLS + POLICIES
-- ============================================================

alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.withdrawals enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self
on public.profiles
for select
using (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin
on public.profiles
for update
using (public.is_admin())
with check (public.is_admin());


drop policy if exists payments_self on public.payments;
create policy payments_self
on public.payments
for select
using (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists payments_admin on public.payments;
create policy payments_admin
on public.payments
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists payments_insert_self on public.payments;
create policy payments_insert_self
on public.payments
for insert
with check (user_id = auth.uid());


drop policy if exists sessions_self on public.chat_sessions;
create policy sessions_self
on public.chat_sessions
for select
using (
  user_id = auth.uid()
  or public.is_admin()
);


drop policy if exists messages_self on public.chat_messages;
create policy messages_self
on public.chat_messages
for select
using (
  exists(
    select 1
    from public.chat_sessions s
    where s.id = session_id
      and (
        s.user_id = auth.uid()
        or public.is_admin()
      )
  )
);


drop policy if exists withdrawals_self on public.withdrawals;
create policy withdrawals_self
on public.withdrawals
for select
using (
  user_id = auth.uid()
  or public.is_admin()
);


-- Admin can manage withdrawal records.
drop policy if exists withdrawals_admin on public.withdrawals;
create policy withdrawals_admin
on public.withdrawals
for update
using (public.is_admin())
with check (public.is_admin());


-- ============================================================
-- PART 4 — ADMIN SETUP + VERIFICATION
-- ============================================================

-- 1. FIRST create your admin/user account through the website.
-- 2. Then replace the email below with your real admin email.
--
-- Example:
--
-- update public.profiles
-- set role = 'admin',
--     status = 'approved',
--     updated_at = now()
-- where email = 'admin@dolaway.com';


-- OPTIONAL: verify the database setup:
--
-- select id, full_name, username, email, status, role, balance
-- from public.profiles
-- order by created_at desc;
--
-- select id, user_id, amount, status, created_at
-- from public.payments
-- order by created_at desc;
--
-- select id, user_id, foreigner_slug, payout, message_count, status
-- from public.chat_sessions
-- order by created_at desc;
--
-- select id, user_id, amount, phone, status, created_at
-- from public.withdrawals
-- order by created_at desc;
