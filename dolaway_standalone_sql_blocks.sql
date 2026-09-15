DOLAWAY STANDALONE SUPABASE — SEPARATE SQL BLOCKS
========================================================
IMPORTANT:
1. Use a NEW Supabase project/database for DolaWay.
2. Run BLOCK 01, then BLOCK 02, then BLOCK 03... in order.
3. Copy ONE BLOCK at a time into the SQL Editor and press Run.
4. Do NOT paste all blocks together if your editor shows
   "cannot insert multiple commands into a prepared statement".
5. BLOCK 70 is run only AFTER you have registered the admin account.

This database is independent of 1Vela.
Activation fee: TZS 14,500.
Chat reward: after 20 user messages.
Minimum withdrawal balance: TZS 50,000.
========================================================

-- ============================================================
-- BLOCK 01: Enable pgcrypto
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- BLOCK 02: Account status type
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TYPE public.account_status AS ENUM ('pending','approved','rejected');

-- ============================================================
-- BLOCK 03: Account role type
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TYPE public.account_role AS ENUM ('user','admin');

-- ============================================================
-- BLOCK 04: Payment status type
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TYPE public.payment_status AS ENUM ('pending','approved','rejected');

-- ============================================================
-- BLOCK 05: Chat status type
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TYPE public.chat_status AS ENUM ('open','completed','closed');

-- ============================================================
-- BLOCK 06: Withdrawal status type
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TYPE public.withdrawal_status AS ENUM ('pending','paid','rejected');

-- ============================================================
-- BLOCK 07: Profiles table
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  username text NOT NULL UNIQUE,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Tanzania',
  status public.account_status NOT NULL DEFAULT 'pending',
  role public.account_role NOT NULL DEFAULT 'user',
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCK 08: Activation payments table
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TABLE public.activation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 14500 CHECK (amount = 14500),
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id)
);

-- ============================================================
-- BLOCK 09: Foreigners table
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TABLE public.foreigners (
  slug text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🌍',
  avatar text NOT NULL DEFAULT '',
  online boolean NOT NULL DEFAULT true,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  minutes integer NOT NULL DEFAULT 30,
  wants text NOT NULL DEFAULT '',
  payout numeric(12,2) NOT NULL DEFAULT 0 CHECK (payout >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCK 10: Chat sessions table
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  foreigner_slug text NOT NULL REFERENCES public.foreigners(slug),
  payout numeric(12,2) NOT NULL DEFAULT 0 CHECK (payout >= 0),
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0 AND message_count <= 20),
  status public.chat_status NOT NULL DEFAULT 'open',
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, foreigner_slug)
);

-- ============================================================
-- BLOCK 11: Chat messages table
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user','foreigner')),
  content text NOT NULL CHECK (length(trim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCK 12: Withdrawals table
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 50000),
  phone text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES public.profiles(id)
);

-- ============================================================
-- BLOCK 13: Profiles indexes
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE INDEX profiles_status_idx ON public.profiles(status);

-- ============================================================
-- BLOCK 14: Activation payment indexes
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE UNIQUE INDEX activation_one_pending_per_user_idx
ON public.activation_payments(user_id)
WHERE status = 'pending';

-- ============================================================
-- BLOCK 15: Foreigners index
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE INDEX foreigners_active_idx ON public.foreigners(active);

-- ============================================================
-- BLOCK 16: Chat indexes
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE INDEX chat_sessions_user_created_idx ON public.chat_sessions(user_id, created_at DESC);

-- ============================================================
-- BLOCK 17: Chat message index
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE INDEX chat_messages_session_created_idx ON public.chat_messages(session_id, created_at ASC);

-- ============================================================
-- BLOCK 18: Withdrawal indexes
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE INDEX withdrawals_user_created_idx ON public.withdrawals(user_id, created_at DESC);

-- ============================================================
-- BLOCK 19: Seed DolaWay foreigners
-- Run ONLY this block, then move to the next block.
-- ============================================================
INSERT INTO public.foreigners
  (slug, name, emoji, avatar, online, rating, minutes, wants, payout)
VALUES
  ('Isabella','Isabella','🎵','https://i.pravatar.cc/150?img=48',true,4.8,47,'Practice Conversation & Music',54500),
  ('Priya','Priya','🌺','https://i.pravatar.cc/150?img=25',true,4.9,38,'Gardens, Flowers & Nature Words',44500),
  ('Felix','Felix','🚗','https://i.pravatar.cc/150?img=44',true,4.7,33,'Cars & Transport Conversation',38500),
  ('Harriet','Harriet','🎨','https://i.pravatar.cc/150?img=61',true,4.6,24,'Art & Colors in Swahili',31000),
  ('Bianca','Bianca','👗','https://i.pravatar.cc/150?img=21',true,4.9,43,'Fashion & Cultural Clothes',48000),
  ('Rosalie','Rosalie','🌐','https://i.pravatar.cc/150?img=47',true,4.9,51,'Languages & World Cultures',53500),
  ('Rowan','Rowan','🚴','https://i.pravatar.cc/150?img=59',true,4.9,45,'Cycling & Outdoor Life',50500),
  ('Matilda','Matilda','🍕','https://i.pravatar.cc/150?img=26',true,4.9,49,'African Food Recipes Discussion',52500),
  ('Thomas','Thomas','💼','https://i.pravatar.cc/150?img=28',true,4.8,40,'Business & Work Vocabulary',46000);

-- ============================================================
-- BLOCK 20: New user trigger function
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    'user_' || SUBSTR(REPLACE(NEW.id::text, '-', ''), 1, 10)
  );

  INSERT INTO public.profiles (
    id, full_name, username, email, phone, country
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    v_username,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'country', ''), 'Tanzania')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ============================================================
-- BLOCK 21: Auth user trigger
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BLOCK 22: Admin check function
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- BLOCK 23: Username login lookup
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_login_email(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE LOWER(username) = LOWER(TRIM(p_username))
  LIMIT 1;
$$;

-- ============================================================
-- BLOCK 24: My profile function
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- BLOCK 25: Create activation payment function
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_activation_payment(p_phone text)
RETURNS public.activation_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_payment public.activation_payments;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'You must be logged in'; END IF;
  IF p_phone IS NULL OR LENGTH(TRIM(p_phone)) < 9 THEN
    RAISE EXCEPTION 'Enter a valid phone number';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Account is already approved';
  END IF;

  SELECT * INTO v_payment
  FROM public.activation_payments
  WHERE user_id = v_user AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  IF v_payment.id IS NOT NULL THEN RETURN v_payment; END IF;

  INSERT INTO public.activation_payments(user_id, phone, amount)
  VALUES(v_user, TRIM(p_phone), 14500)
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

-- ============================================================
-- BLOCK 26: Admin approve/reject activation
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.review_activation_payment(
  p_payment_id uuid,
  p_status public.payment_status
)
RETURNS public.activation_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.activation_payments;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;

  SELECT * INTO v_payment
  FROM public.activation_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status <> 'pending' THEN RAISE EXCEPTION 'Payment already reviewed'; END IF;

  UPDATE public.activation_payments
  SET status = p_status,
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END,
      approved_by = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE NULL END
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  UPDATE public.profiles
  SET status = CASE WHEN p_status = 'approved' THEN 'approved'::public.account_status
                    ELSE 'rejected'::public.account_status END,
      updated_at = now()
  WHERE id = v_payment.user_id;

  RETURN v_payment;
END;
$$;

-- ============================================================
-- BLOCK 27: Get foreigners
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_foreigners()
RETURNS SETOF public.foreigners
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.foreigners
  WHERE active = true
  ORDER BY created_at ASC;
$$;

-- ============================================================
-- BLOCK 28: Open/get chat session
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_chat_session(p_foreigner_slug text)
RETURNS public.chat_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_foreigner public.foreigners;
  v_session public.chat_sessions;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'You must be logged in'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Account is not approved';
  END IF;

  SELECT * INTO v_foreigner
  FROM public.foreigners
  WHERE slug = TRIM(p_foreigner_slug) AND active = true;

  IF v_foreigner.slug IS NULL THEN RAISE EXCEPTION 'Foreigner not found'; END IF;

  SELECT * INTO v_session
  FROM public.chat_sessions
  WHERE user_id = v_user AND foreigner_slug = v_foreigner.slug
  LIMIT 1;

  IF v_session.id IS NOT NULL THEN RETURN v_session; END IF;

  INSERT INTO public.chat_sessions(user_id, foreigner_slug, payout)
  VALUES(v_user, v_foreigner.slug, v_foreigner.payout)
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- ============================================================
-- BLOCK 29: Send chat message and reward at 20
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_session_id uuid,
  p_content text
)
RETURNS public.chat_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.chat_sessions;
  v_new_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'You must be logged in'; END IF;
  IF p_content IS NULL OR LENGTH(TRIM(p_content)) = 0 THEN
    RAISE EXCEPTION 'Empty message';
  END IF;

  SELECT * INTO v_session
  FROM public.chat_sessions
  WHERE id = p_session_id AND user_id = v_user
  FOR UPDATE;

  IF v_session.id IS NULL THEN RAISE EXCEPTION 'Chat not found'; END IF;
  IF v_session.status <> 'open' OR v_session.message_count >= 20 THEN
    RAISE EXCEPTION 'Chat is closed';
  END IF;

  INSERT INTO public.chat_messages(session_id, sender_type, content)
  VALUES(v_session.id, 'user', TRIM(p_content));

  v_new_count := v_session.message_count + 1;

  IF v_new_count = 20 THEN
    UPDATE public.chat_sessions
    SET message_count = 20,
        status = 'completed',
        rewarded = true,
        completed_at = now()
    WHERE id = v_session.id
    RETURNING * INTO v_session;

    UPDATE public.profiles
    SET balance = balance + v_session.payout,
        updated_at = now()
    WHERE id = v_user;
  ELSE
    UPDATE public.chat_sessions
    SET message_count = v_new_count
    WHERE id = v_session.id
    RETURNING * INTO v_session;
  END IF;

  RETURN v_session;
END;
$$;

-- ============================================================
-- BLOCK 30: My chat sessions
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_chat_sessions()
RETURNS SETOF public.chat_sessions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.chat_sessions
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
$$;

-- ============================================================
-- BLOCK 31: My chat messages
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_chat_messages(p_session_id uuid)
RETURNS SETOF public.chat_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.*
  FROM public.chat_messages m
  JOIN public.chat_sessions s ON s.id = m.session_id
  WHERE m.session_id = p_session_id AND s.user_id = auth.uid()
  ORDER BY m.created_at ASC;
$$;

-- ============================================================
-- BLOCK 32: Request withdrawal
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_phone text
)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance numeric;
  v_withdrawal public.withdrawals;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'You must be logged in'; END IF;
  IF p_amount IS NULL OR p_amount < 50000 THEN
    RAISE EXCEPTION 'Minimum withdrawal is TZS 50,000';
  END IF;
  IF p_phone IS NULL OR TRIM(p_phone) !~ '^0[67][0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid Tanzania phone number';
  END IF;

  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE id = v_user AND status = 'approved'
  FOR UPDATE;

  IF v_balance IS NULL THEN RAISE EXCEPTION 'Approved profile not found'; END IF;
  IF v_balance < 50000 THEN RAISE EXCEPTION 'Minimum balance for withdrawal is TZS 50,000'; END IF;
  IF p_amount > v_balance THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = v_user;

  INSERT INTO public.withdrawals(user_id, amount, phone)
  VALUES(v_user, p_amount, TRIM(p_phone))
  RETURNING * INTO v_withdrawal;

  RETURN v_withdrawal;
END;
$$;

-- ============================================================
-- BLOCK 33: Admin review withdrawal
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE OR REPLACE FUNCTION public.review_withdrawal(
  p_withdrawal_id uuid,
  p_status public.withdrawal_status
)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal public.withdrawals;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('paid','rejected') THEN
    RAISE EXCEPTION 'Invalid withdrawal status';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF v_withdrawal.id IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_withdrawal.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal already reviewed'; END IF;

  UPDATE public.withdrawals
  SET status = p_status, processed_at = now(), processed_by = auth.uid()
  WHERE id = p_withdrawal_id
  RETURNING * INTO v_withdrawal;

  IF p_status = 'rejected' THEN
    UPDATE public.profiles
    SET balance = balance + v_withdrawal.amount, updated_at = now()
    WHERE id = v_withdrawal.user_id;
  END IF;

  RETURN v_withdrawal;
END;
$$;

-- ============================================================
-- BLOCK 34: Enable RLS on profiles
-- Run ONLY this block, then move to the next block.
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCK 35: Enable RLS on activation payments
-- Run ONLY this block, then move to the next block.
-- ============================================================
ALTER TABLE public.activation_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCK 36: Enable RLS on foreigners
-- Run ONLY this block, then move to the next block.
-- ============================================================
ALTER TABLE public.foreigners ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCK 37: Enable RLS on chat sessions
-- Run ONLY this block, then move to the next block.
-- ============================================================
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCK 38: Enable RLS on chat messages
-- Run ONLY this block, then move to the next block.
-- ============================================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCK 39: Enable RLS on withdrawals
-- Run ONLY this block, then move to the next block.
-- ============================================================
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCK 40: Profiles select policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

-- ============================================================
-- BLOCK 41: Activation payments select policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Users can view own activation payments"
ON public.activation_payments
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- BLOCK 42: Activation payments insert policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Users can insert own activation payments"
ON public.activation_payments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- BLOCK 43: Foreigners select policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Authenticated users can view active foreigners"
ON public.foreigners
FOR SELECT TO authenticated
USING (active = true OR public.is_admin());

-- ============================================================
-- BLOCK 44: Chat sessions select policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Users can view own chat sessions"
ON public.chat_sessions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- BLOCK 45: Chat messages select policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Users can view own chat messages"
ON public.chat_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id
      AND (s.user_id = auth.uid() OR public.is_admin())
  )
);

-- ============================================================
-- BLOCK 46: Withdrawals select policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Users can view own withdrawals"
ON public.withdrawals
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- BLOCK 47: Admin profile update policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- BLOCK 48: Admin activation update policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Admins can update activation payments"
ON public.activation_payments
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- BLOCK 49: Admin foreigners management policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Admins can manage foreigners"
ON public.foreigners
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- BLOCK 50: Admin chat sessions policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Admins can manage chat sessions"
ON public.chat_sessions
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- BLOCK 51: Admin chat messages policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Admins can manage chat messages"
ON public.chat_messages
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- BLOCK 52: Admin withdrawals update policy
-- Run ONLY this block, then move to the next block.
-- ============================================================
CREATE POLICY "Admins can update withdrawals"
ON public.withdrawals
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- BLOCK 53: Grant profile select
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT SELECT ON public.profiles TO authenticated;

-- ============================================================
-- BLOCK 54: Grant activation access
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT SELECT, INSERT ON public.activation_payments TO authenticated;

-- ============================================================
-- BLOCK 55: Grant foreigners select
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT SELECT ON public.foreigners TO authenticated;

-- ============================================================
-- BLOCK 56: Grant chat select
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT SELECT ON public.chat_sessions, public.chat_messages TO authenticated;

-- ============================================================
-- BLOCK 57: Grant withdrawals select
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT SELECT ON public.withdrawals TO authenticated;

-- ============================================================
-- BLOCK 58: Grant functions
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- BLOCK 59: Grant username lookup
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_login_email(text) TO anon, authenticated;

-- ============================================================
-- BLOCK 60: Grant profile function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ============================================================
-- BLOCK 61: Grant activation function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_activation_payment(text) TO authenticated;

-- ============================================================
-- BLOCK 62: Grant payment review function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.review_activation_payment(uuid, public.payment_status) TO authenticated;

-- ============================================================
-- BLOCK 63: Grant foreigners function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_foreigners() TO anon, authenticated;

-- ============================================================
-- BLOCK 64: Grant chat open function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_or_create_chat_session(text) TO authenticated;

-- ============================================================
-- BLOCK 65: Grant send message function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid, text) TO authenticated;

-- ============================================================
-- BLOCK 66: Grant chat session function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_my_chat_sessions() TO authenticated;

-- ============================================================
-- BLOCK 67: Grant chat messages function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_my_chat_messages(uuid) TO authenticated;

-- ============================================================
-- BLOCK 68: Grant withdrawal function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text) TO authenticated;

-- ============================================================
-- BLOCK 69: Grant withdrawal review function
-- Run ONLY this block, then move to the next block.
-- ============================================================
GRANT EXECUTE ON FUNCTION public.review_withdrawal(uuid, public.withdrawal_status) TO authenticated;

-- ============================================================
-- BLOCK 70: Create first admin after registration
-- Run ONLY this block, then move to the next block.
-- ============================================================
-- EDIT THE EMAIL BELOW, then run this ONE statement
UPDATE public.profiles
SET role = 'admin',
    status = 'approved',
    updated_at = now()
WHERE email = 'yohanaelisha164@gmail.com';
