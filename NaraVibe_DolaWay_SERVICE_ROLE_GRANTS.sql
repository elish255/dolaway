-- Fix for: 42501 permission denied for table naravibe_users / dolaway_users
-- Run this ONCE in Supabase SQL Editor for the shared database.
-- This grants the server-side service_role access to ONLY the NaraVibe + DolaWay tables.

GRANT USAGE ON SCHEMA public TO service_role;

-- NaraVibe
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.naravibe_users,
  public.naravibe_activation_payments,
  public.naravibe_withdrawals,
  public.naravibe_chat_sessions,
  public.naravibe_notifications
TO service_role;

-- DolaWay
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.dolaway_users,
  public.dolaway_activation_payments,
  public.dolaway_withdrawals,
  public.dolaway_chat_sessions,
  public.dolaway_notifications
TO service_role;

-- Keep the privileges after future ALTER TABLE operations on these existing tables.
-- (No sequences are required because all IDs use gen_random_uuid().)

-- Verification: these should return true for each table.
SELECT
  has_table_privilege('service_role', 'public.naravibe_users', 'SELECT') AS naravibe_users_select,
  has_table_privilege('service_role', 'public.naravibe_users', 'INSERT') AS naravibe_users_insert,
  has_table_privilege('service_role', 'public.dolaway_users', 'SELECT') AS dolaway_users_select,
  has_table_privilege('service_role', 'public.dolaway_users', 'INSERT') AS dolaway_users_insert;
