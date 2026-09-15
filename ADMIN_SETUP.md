# DolaWay backend + admin setup

## 1. Create the database
Create a Supabase project, open **SQL Editor**, and run `supabase-schema.sql` from this project.

## 2. Configure the frontend
Copy `.env.example` to `.env.local` and set:

- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon/public key

Never put the Supabase service-role key in frontend code.

## 3. Create the first admin
Register the admin account normally. Then, in Supabase SQL Editor, run:

```sql
update public.profiles
set role = 'admin', status = 'approved'
where email = 'YOUR_ADMIN_EMAIL';
```

Then open `/admin` while logged in as that account.

## 4. User flow implemented

1. User registers.
2. Activation payment record is created for **TZS 14,500** and remains `pending`.
3. Admin sees pending payments in `/admin` and clicks **Approve** or **Reject**.
4. Approving changes the user's status to `approved`.
5. The payment page polls the account status and automatically sends an approved user to `/dashboard`.
6. Approved users can select a foreigner and chat.
7. Exactly **20 user messages** closes the chat. The foreigner's configured payout is credited once, server-side, to the user's balance.
8. Clicking the balance / Withdraw opens the withdrawal form.
9. Minimum withdrawal is **TZS 50,000**. The server atomically checks the balance, deducts the amount, and creates a withdrawal record. The UI shows **Withdrawal Successful**.

## 5. Important payment note
The current payment screen still displays the existing LIPA NAMBA instructions. The database records the user's claim as pending; it does **not** pretend to have received a real mobile-money callback. For automatic payment verification, connect your mobile-money provider webhook/API to the `payments` table and only mark the payment approved after the provider confirms the transaction.
