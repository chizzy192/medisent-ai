# Deploying Medisent AI to Vercel

Demo deployment: Next.js on Vercel, data on Supabase. Follow the sections in order. Nothing in
this document contains a secret value; copy values from the Supabase and provider dashboards.

## 1. Before you start

- Supabase project with migrations `0001` – `0011` applied in order (SQL editor, one file at a
  time) and `supabase/seed.sql` run once (`docs/SUPABASE_SETUP.md`).
- Supabase → Authentication → Providers → Email enabled, **Confirm email off** (the app verifies
  people with its own OTP).
- Storage buckets exist (created by migrations 0004 and 0010): `hospital-logos`,
  `hospital-licences`, `label-photos`, `audio-cache`, `med-photos`.
- `npm run build` passes locally.

## 2. Environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production and Preview).
Names only; the values come from the provider dashboards.

| Name | Where it runs | Required | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | browser + server | yes | `https://<your-app>.vercel.app` (no trailing slash). Used for metadata and links. |
| `NEXT_PUBLIC_DEMO_MODE` | browser + server | yes, `true` for the demo | Fixed sign-in code `123456`, demo hints on /login, "Reset demo data" button, SMS routed to `DEMO_TEST_PHONE`. Set to `false` (or remove) for a real pilot. |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | yes | Supabase → Settings → API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | yes | Supabase anon (public) key. Safe in the browser; RLS protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | yes | Supabase service role key. Used by server actions, route handlers and the cron job. |
| `DATABASE_URL` | **server only** | for "Reset demo data" | Supabase → Connect → **Transaction pooler** URI (port 6543), with the database password. Only the reset uses it. |
| `DEMO_TEST_PHONE` | **server only** | recommended in demo mode | Every SMS the demo would send goes to this number instead of the patient's. |
| `GEMINI_API_KEY` | **server only** | yes (pack reader) | Google AI Studio key. |
| `GEMINI_MODEL` | **server only** | no | Override of the model list in `src/lib/ai/scan.ts`. |
| `SPITCH_API_KEY` | **server only** | yes (voice) | Without it the browser's English voice reads instead, labelled "Offline voice". |
| `AFRICASTALKING_USERNAME` | **server only** | no | `sandbox` for the sandbox. Without the three Africa's Talking values SMS is logged, not sent. |
| `AFRICASTALKING_API_KEY` | **server only** | no | |
| `AFRICASTALKING_SENDER_ID` | **server only** | no | |
| `CRON_SECRET` | **server only** | yes | Any long random string. Vercel sends it as `Authorization: Bearer …` to the cron route; the route refuses other callers. |

Rules checked in this repo:

- Only `NEXT_PUBLIC_*` names are referenced from client components (`src/lib/db/env.ts`,
  `showSourceBadge` uses `NODE_ENV`). Server secrets are referenced only from server actions,
  route handlers, `src/lib/**` and `src/lib/db/secrets.ts`.
- Never give a secret a `NEXT_PUBLIC_` prefix. Never paste values into this file or the repo.

## 3. Vercel steps

1. Vercel → Add New → Project → import the Git repository. Framework preset: Next.js. Root
   directory: the repo root. Build command `next build`, output default. Node 20 or newer.
2. Add the environment variables from section 2 before the first deploy.
3. Deploy. The first build takes two to three minutes.
4. After the first deploy, set `NEXT_PUBLIC_APP_URL` to the real domain and redeploy (Vercel →
   Deployments → ⋯ → Redeploy).
5. `vercel.json` already declares the cron (section 5). Vercel reads it on deploy; check
   Project → Settings → Cron Jobs shows `/api/cron/refills`.
6. Optional custom domain: Project → Settings → Domains. Then update `NEXT_PUBLIC_APP_URL` and
   the Supabase URLs in section 4.

## 4. Supabase Auth URLs

Sign-in uses a server-side magic-link token exchange, so the app's domain must be allowed.
Supabase → Authentication → URL Configuration:

- **Site URL:** `https://<your-app>.vercel.app`
- **Redirect URLs** (add each):
  - `https://<your-app>.vercel.app/**`
  - `https://*-<team>.vercel.app/**` (preview deployments; replace `<team>` with the Vercel team
    slug shown in preview URLs)
  - `http://localhost:3000/**` (keep for local work)
  - your custom domain with `/**` if you add one

## 5. Cron: daily refill and course sweep

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/refills", "schedule": "0 7 * * *" }] }
```

- Runs 07:00 UTC = 08:00 Africa/Lagos every day. It alerts patients and pharmacists about
  medicines running out and raises "course at risk" alerts for 2+ missed doses.
- Vercel calls it with `Authorization: Bearer $CRON_SECRET`; the route refuses anything else
  when `CRON_SECRET` is set. Set the variable before the first scheduled run.
- Manual run (replace the placeholders, never commit the command):
  `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-app>.vercel.app/api/cron/refills`
  → `{"ok":true,"checked":…,"alerted":…,"coursesAtRisk":…}`.

## 6. Reset demo data

Two ways, same effect: `supabase/reset.sql` (removes rehearsal rows, puts seeded rows back) then
`supabase/seed.sql` (regenerates logs, refills, alerts; dates are Lagos-based).

- **In the app:** sign in as the platform admin (0800 000 0001, code 123456) → Approve hospitals
  → "Reset demo data…" → confirm. Needs `DATABASE_URL` and `NEXT_PUBLIC_DEMO_MODE=true`. Written
  to `audit_log` as `demo_reset`.
- **From a laptop:** `node scripts/reset-demo.mjs` with `DATABASE_URL` in `.env.local`.

Run it between rehearsals and once right before judging. Pack photos uploaded during
rehearsals stay in the `med-photos` bucket (harmless; delete them in Supabase → Storage if you
want a clean bucket).

## 7. Phone smoke test (10 points, about 8 minutes)

Use a real Android phone on mobile data, in Chrome. Demo accounts: patient Folake Adebayo
0800 000 0304, pharmacist Chidinma Okafor 0800 000 0104, code 123456.

1. **Landing:** open the site. Fonts load, the preview console's play button speaks "Take one
   tablet every morning" with the Spitch voice. No layout overflow at phone width.
2. **Sign in as the patient:** /login shows the demo accounts box; phone → code 123456 → Home
   says "Welcome, Folake" with today's doses.
3. **Listen:** tap Listen on a dose card. Audio plays; in production no source badge shows.
4. **Scan, "Is this my drug?":** Scan tab → camera opens → photograph the Amoxicillin demo pack →
   "This is on your list" (or "Not on your list" for a pack she does not have) with the dose
   from the record read aloud. Never a dose from the pack.
5. **Add a medicine:** Scan → "Add it to your list" → pack photo → reader fields with
   confidence % → pick from the list → type the dose → save → Home shows "Not checked yet".
6. **Course card:** sign in as Aisha Lawal (0800 000 0306): "Finish the course · Day N of 5"
   with the progress bar and "Don't stop early" read aloud.
7. **Sign in as the pharmacist:** Dashboard shows Patients, Open alerts, Red flags, Entries to
   check, Interaction alerts, Courses completed %, and "Courses at risk" listing Musa Abdullahi.
8. **Verify:** Dashboard → "Check N entries" → Folake's entry shows photos, reader fields and
   her typed dose side by side → Approve. Her entry leaves the queue.
9. **Dispense with an interaction:** Dispense → Yusuf Ibrahim → Ibuprofen → red "Do not take
   with Warfarin" card → "Dispense and confirm" is refused until "I have reviewed this
   interaction" is ticked → saved.
10. **Reset:** sign in as the platform admin → "Reset demo data…" → done in under a minute →
    sign in as Folake again and confirm the entry from step 5 is gone and Home is the seed.

If any step fails, check Vercel → Deployments → Functions logs first (`[scan]`, `[speak]`,
`[verify]`, `[course]`, `[sms:not-configured]` prefixes), then the environment variables.
