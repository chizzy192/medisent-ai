# Supabase setup (Stage 1)

One-time steps for the owner. Takes about ten minutes. No real data goes in; everything is the fictional demo set.

## 1. Create the project

1. https://supabase.com → New project. Region: closest to Nigeria (eu-west or eu-central). Any database password; you will not type it again.
2. Project settings → API. Copy three values into `.env.local` (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
NEXT_PUBLIC_DEMO_MODE=true
```

## 2. Run the SQL

SQL editor → New query. Paste and run each file in this order, one at a time:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_functions.sql`
4. `supabase/migrations/0004_storage.sql`
5. `supabase/migrations/0005_otp.sql`
6. `supabase/migrations/0006_grants.sql` (table privileges for the API roles; without it every request answers "permission denied")
7. `supabase/seed.sql` (safe to run again later; it regenerates the 30-day dose logs from today)

Already ran 0001–0004 before 0005 and 0006 existed? Just run 0005, 0006 and the seed now.

Check it worked: Table editor → `hospitals` shows two Demo hospitals, and the app's sign-in page no longer shows the blue "Supabase is not set up yet" box after `npm run dev` is restarted.

## 3. Auth settings

Authentication → Providers → Email: keep enabled, turn **Confirm email** off (accounts are verified by our own OTP, not by email). Nothing else is needed: the app signs people in with a server-side magic-link token after the OTP check.

## 4. Restart and test

```
npm run dev
```

Demo mode shows the one-time code (123456) on screen, so nothing depends on SMS.

| Who | Where | Use |
| --- | --- | --- |
| Pharmacist signup (the Stage 1 "Done when" test) | `/signup` | Adaeze Specialist Hospital (Demo) · Pharmacist · Chidinma Okafor · `AH-PH-001` · PCN `DEMO-PCN-2001` |
| Fake staff ID | `/signup` | Same hospital, Pharmacist, any name, `AH-PH-999` → rejected; three tries → blocked, admin alert |
| Patient login | `/login` | `08000000302` (Nkechi Okeke) → code 123456 → "Welcome to Adaeze Specialist Hospital (Demo)" |
| Hospital admin | `/login` | `08000000101` (Ngozi Eze) → `/hospital`, `/roster`, `/verifications` |
| Platform admin | `/login` | `08000000001` → `/approve-hospitals` |
| New hospital | `/register-hospital` | Any details; appears for the platform admin to approve |

Seeded demo accounts were created directly in `auth.users` by the seed, so signup for those identities says "You already have an account" and sends you to login.

## 5. Real SMS (later)

Add `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY` and optionally `AFRICASTALKING_SENDER_ID`, and set `NEXT_PUBLIC_DEMO_MODE=false`. Codes are then sent to the phone on file. While demo mode is on and `DEMO_TEST_PHONE` is set, every SMS goes to that phone.
