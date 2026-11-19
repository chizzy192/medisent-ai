# Medisent AI — Build Plan for the AI Coding Agent

Read this whole file before writing any code. Build ONE stage at a time, in order.
After each stage, stop and wait for me. I review and commit everything myself.

---

## 0. Rules for you (the agent)

### Git
- Do NOT run `git add`, `git commit`, `git push`, create branches, or change git config.
- After each stage: list every file you created or changed, tell me how to test it, and suggest a short commit message. Then stop.

### Always
- Every table is scoped by `hospital_id` and protected by Row Level Security (RLS).
- The AI never diagnoses, prescribes, or changes or stops a dose.
- Red-flag keywords are checked BEFORE any AI model call.
- No real patient data. All seed data is fictional and labelled "Demo".
- API keys only in env vars, never in client code. `.env.local` stays in `.gitignore`.
- Body text 18px minimum; tap targets 48px minimum.
- Never use colour alone for meaning: always icon + word (✓ Taken, ⏰ Due, ⚠ Alert).
- Every screen has a speaker button that reads it aloud.
- If something is ambiguous, pick the simpler option, note it, and keep going.

### Design skill: Impeccable
- Use the **impeccable** skill for every UI task. Full workflow in section 10.
- Section 3 (design system) is FIXED. Impeccable must work inside it: never replace the palette, fonts, header rule or button colours. If Impeccable suggests a change to section 3, list it for me instead of applying it.
- Before writing any UI code in a session, load Impeccable's context (it reads PRODUCT.md and DESIGN.md).
- Never use Impeccable `live` mode unless I ask (it can launch an agent CLI with approvals disabled).

---

## 1. What Medisent AI is

A voice-first, offline-ready medication companion for Nigerian hospitals.

- Hospitals register; staff (doctors, pharmacists, nurses) and patients join a hospital and are verified against the hospital's staff roster or patient registry.
- Patients scan a drug label or prescription and hear the instructions in Igbo, Yoruba, Hausa, Pidgin or English.
- AI builds reminders, answers medication questions by voice, runs daily check-ins, catches red flags, checks interactions, and scores adherence risk.
- Verified professionals post on a forum about medication, diet and mental health.
- Records move between hospitals with patient consent.
- Works offline, with SMS / voice-call fallback for basic phones.
- Caregiver mode: a family member is alerted when a dose is missed.
- Refill alerts before medicine runs out.
- Adherence progress charts for patients and staff.
- Drug registration check: flags drugs whose NAFDAC number is not in our list.
- One-tap guided demo mode for judges.

Name: **Medisent AI**  
Tagline: **Ọgwụ. Oògùn. Magani. Your medicine, in your language.**

### App name and languages
- The app name lives in ONE config file, `src/config/brand.ts`, so it can change in one line (the final name may follow the domain).
- The brand name **Medisent AI** stays the same in every language (brand names are not translated). The tagline and all other text are translated:

| Locale | Code | Tagline line shown under the name |
| --- | --- | --- |
| English | `en` | Your medicine, in your language. |
| Igbo | `ig` | Ọgwụ gị, n'asụsụ gị. |
| Yoruba | `yo` | Oògùn rẹ, ní èdè rẹ. |
| Hausa | `ha` | Maganinka, a harshenka. |
| Nigerian Pidgin | `pcm` | Your medicine, for your own language. |

Native speakers must check every non-English word and tone mark before the demo.

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS, `src/` folder, npm |
| PWA / offline | Serwist (`@serwist/next`) + Dexie.js (IndexedDB) |
| Backend | Next.js route handlers + server actions |
| Database | Supabase Postgres + RLS |
| Auth | Supabase Auth: phone OTP (patients), email + OTP (staff) |
| Storage | Supabase Storage: label photos, cached audio, logos, licence uploads |
| Vision + assistant | Gemini (current Flash model), JSON output |
| Speech ig / yo / ha / en | Spitch (TTS + STT) |
| Speech Pidgin | 9jaLingo (TTS) |
| SMS / voice / USSD | Africa's Talking |
| Drug names | Seeded list based on the NAFDAC Greenbook |
| Interactions | Curated table of common pairs + AI; pharmacist confirms |
| Risk score | Weighted score in TypeScript (weights in section 5) |
| Clinic finder | Seeded clinics + Leaflet / OpenStreetMap |
| UI translation | next-intl, one JSON file per locale in `messages/` (en, ig, yo, ha, pcm) |
| Hosting | Vercel + Supabase cloud; custom domain added later (section 9) |

### Repo layout

```
src/
  app/
    (public)/      landing, register-hospital, signup, login
    (patient)/     home, scan, meds, assistant, checkin, forum, records
    (staff)/       dashboard, patients, alerts, forum/new
    (admin)/       roster, verifications, transfers      (hospital admin)
    (platform)/    approve hospitals                      (platform admin)
    api/
      scan/        label image -> structured prescription
      speak/       text -> audio
      listen/      audio -> text
      assistant/   Q&A with safety rules
      checkin/     parse check-in, flag side effects + red flags
      sms/         Africa's Talking inbound + outbound
      transfer/    records transfer between hospitals
  config/
    brand.ts       app name per locale, tagline, domain
  lib/
    ai/            prompts, safety filters, red-flag lists per language
    db/            supabase clients, generated types
    offline/       dexie schema, sync queue
    fhir/          record -> FHIR JSON mapper
supabase/
  migrations/      schema + RLS policies
  seed.sql         demo data (section 7)
messages/          en.json, ig.json, yo.json, ha.json, pcm.json
public/            manifest.json, icons
docs/              this file
```

### Env vars (`.env.example`)
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
DEMO_TEST_PHONE=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
SPITCH_API_KEY=
NAIJALINGO_API_KEY=
AFRICASTALKING_USERNAME=
AFRICASTALKING_API_KEY=
AFRICASTALKING_SENDER_ID=
```

---

## 3. Design system — "Clinical precision" (v2, replaces the brown palette)

Direction: technical, precise and calm, like a well-made medical instrument. Cool neutrals, one cobalt accent, monospaced numbers for times, doses and IDs. Works for every age: plain labels, big targets, high contrast, nothing decorative.

Visual target: `docs/mockups/medisent-patient-screens-v3.png` (patient, latest), `docs/mockups/medisent-staff-screens.png` (staff). The v3 patient image replaces the older patient image wherever they differ.

| Token | Hex | Use |
| --- | --- | --- |
| bg | `#F6F8FA` | App background |
| surface | `#FFFFFF` | Cards, header, bottom bar, inputs |
| surface-2 | `#EEF2F6` | Meter tracks, neutral chips, table row dividers |
| border | `#D9E0E8` | Card and input borders (1px) |
| ink | `#0E1726` | Main text |
| ink-2 | `#44546A` | Secondary text |
| ink-3 | `#5E6E84` | Labels, hints, inactive nav |
| primary | `#1F4FD8` | Buttons (white text), links, active nav, charts, logo mark |
| primary-tint | `#E6EDFC` | Active nav pill, info panels, citation blocks, AI badge |
| success | `#12805C` on `#E3F4EC` | Taken, registered, verified, low risk |
| warning | `#9A4B05` text, `#D97706` dot/bar, `#FDF1DC` fill | Late, overdue, refill soon, medium risk, drug not found |
| danger | `#C81E1E` on `#FDECEC`; solid `#C81E1E` banner | Red flags and high risk only |
| hospital bar | hospital `brand_color` (default `#1D4E89`) | 3px line under the header only |

Dark mode: bg `#0B1220`, surface `#111A2B`, surface-2 `#1A2538`, border `#26344A`, ink `#E6EBF2`, ink-2 `#AEB9C8`, ink-3 `#8A97AA`, primary `#6E95FF` (text on it `#0B1220`), primary-tint `#1B2A4D`.

Fonts:
- **IBM Plex Sans** (UI text, 400 / 500 / 600) with Noto Sans fallback for ẹ ọ ị ụ ṅ and tone marks.
- **IBM Plex Mono** (500) for times (`08:00`), doses, counts, percentages, IDs (`AH-0002`, NAFDAC numbers) and small uppercase section labels. Use `font-variant-numeric: tabular-nums` only on columns of numbers, not inside single times.
- Load with `next/font/google`.

Type scale: page title 22–26px / 600; card title (medicine name) 19px / 600; body 16–18px; time on medicine card 22px mono; section label 12px mono uppercase, letter-spacing 0.04em; never below 12px.

Shape and spacing: 4px base (8 / 12 / 16 / 24 / 32); cards 12px radius, 14–16px padding, 1px border, no shadows; buttons 10px radius, 48px min height; chips fully rounded with a coloured dot.

Logo: cobalt rounded square with a white plus, then "Medisent" in Plex Sans 600, then a small mono "AI" badge on primary-tint. Never a red cross.

Status chips: dot + word, always (● Taken, ● 20 min late, ● Upcoming, ● High 78). Colour is never the only signal.

Header: white, logo left, language picker right (`IG ▾`), hospital name under the logo, 3px hospital-colour bar at the bottom.

Rules:
- One primary (cobalt) button per card; secondary actions are outlined cobalt.
- Red only for red-flag alerts and high risk.
- Numbers, times and IDs always in Plex Mono.
- Charts: cobalt line, dashed grey target line, mono axis labels, text summary for screen readers.
- Large-text mode (Me → Accessibility) scales everything 125% / 150% without breaking layouts.
- High-contrast mode: ink `#000`, borders `#5E6E84`, primary `#1A3FB0`.
- No gradients, no glassmorphism, no purple, no emoji in UI, no centred-hero-plus-three-cards layout.

### Translation (whole app)
- Every piece of UI text comes from `messages/<locale>.json` through next-intl. No hard-coded strings in components.
- Locale is chosen at signup and changeable from the header language switcher; stored in `profiles.language` and a cookie.
- `en.json` is the source. Generate first drafts of `ig`, `yo`, `ha`, `pcm` with a script `scripts/translate-messages.ts` that calls Gemini, then mark every machine-drafted file with `"_status": "machine-draft"` until a native speaker reviews it.
- Dynamic content (prescription instructions, assistant answers, forum posts) is translated at runtime by the AI routes and labelled "machine-translated" where shown.
- Dates, times and numbers formatted with `Intl` for the locale.
- Text expands in other languages: no fixed-width buttons; allow wrapping.

Also: three text sizes; adjustable speech speed.

### Signature UI elements (what makes it interesting)
1. **Today ring (Home):** a progress ring showing doses taken today (`1/3 TAKEN` in mono), next to the greeting in the patient's language ("Ndewo, Emeka") and the next dose. The card has a faint dot-grid background (`radial-gradient` 1px dots, 14px spacing, `#D3DBE6`) — the only decorative texture in the app, used on hero cards only.
2. **Day timeline (Home):** today's doses as a vertical timeline. Node colours: success = taken, primary with a soft halo = now, border-grey = later, warning = late. The "now" card has a 2px primary border and the big "✓ I took it" button.
3. **Pill icons in the medicine's real colour and shape:** each medicine gets a small icon (round tablet, capsule, inhaler, liquid, injection) in the colour the patient sees in real life. Chosen on the confirm-scan screen ("What does your tablet look like?") or suggested by the scanner. Stored as `prescriptions.pill_shape` and `prescriptions.pill_color`. Helps elderly and low-literacy patients match the screen to the pack. Medicine name + strength (strength in mono, ink-2) stay on one line; time and dose on the line below.
4. **Live scan viewfinder:** dark viewfinder with four rounded primary corner brackets, a sweeping scan line, and a live status chip ("Reading label… 82%"). Below it, a "Found so far" card fills in field by field (Drug, Strength, NAFDAC) as the scanner reads them; missing fields show a warning chip ("Turn the pack").
5. **Voice waveform:** while listening, animated bars (primary) react to the microphone level; the live transcript appears under it in quotes; "Try asking" suggestion chips below; the mic button has two soft halo rings while recording ("Release to send").
6. **Streak + weekly bars (Progress):** a streak card ("2 days in a row — every dose on time since Wednesday") and a 7-day bar chart of doses taken per day (success = all, warning = some, danger never used here). Supply bars per medicine with days left.

Motion (all respect `prefers-reduced-motion`: replace with instant changes):
- Ring fills from 0 on first load (600 ms ease-out).
- "I took it": button turns success with a check, card collapses into the timeline node (250 ms), ring advances.
- Scan line sweeps every 1.8 s while reading; fields fade in as found.
- Waveform bars follow mic input level (Web Audio `AnalyserNode`).
- Nothing loops when idle; no confetti; no bouncing.

### Bottom navigation bar (mobile app style)
- On phones and tablets (< 1024px) every signed-in screen has a **bottom navigation bar**, like a native mobile app. On desktop (≥ 1024px) staff and admins get a left sidebar instead; patients keep the bottom bar centred at max 480px wide.
- **Patient tabs (5):** Home · Scan · Ask · Forum · Me
    - Scan is the centre tab, shown as a raised cobalt rounded square with a scan icon (the main action).
    - "Me" holds My progress, Caregivers, Refills, Records, Language, Accessibility, Privacy.
- **Pharmacist / doctor / nurse tabs (5):** Dashboard · Patients · Alerts · Forum · Me
- **Hospital admin tabs (4):** Dashboard · Staff · Patients · Me (transfers and verifications inside Dashboard)
- Spec:
    - Fixed to the bottom, white (surface) background, 1px border-colour top border, height 64px plus `env(safe-area-inset-bottom)` for phones with gesture bars.
    - Every tab = icon (24px, outline) + text label (13px minimum, always visible, translated). Never icon-only.
    - Active tab: primary icon and label, primary-tint pill behind the icon, `aria-current="page"`. Inactive: ink-3.
    - Each tab is at least 48×48px touch area.
    - Badges: danger count only for open red-flag alerts; primary count for waiting questions; warning dot on Home when a dose is overdue.
    - Does not hide on scroll (elderly users lose it). Hides only while the on-screen keyboard is open.
    - Page content gets bottom padding equal to the bar height so nothing is covered.
    - Works offline (no data needed to render it) and is part of the cached app shell.
    - Implemented once as `BottomNav` in the role layouts (`(patient)/layout.tsx`, `(staff)/layout.tsx`, `(admin)/layout.tsx`), tabs defined in `src/config/nav.ts`.

Core components: BottomNav, HospitalHeader, MedicineCard (drug, dose, next time, play button), ReminderSheet (big Taken / Snooze / Missed), MicButton (hold to talk + transcript), AlertBanner (full width, call button), ForumPostCard (primary tag, green verified badge, listen button), VerificationPill (pending / verified / rejected / blocked), OfflineBanner ("Offline — last synced 10:42").

---

## 4. Data model

| Table | Key columns |
| --- | --- |
| hospitals | id, name, slug, logo_url, brand_color, address, city, state, cac_no, licence_url, status (pending / approved / rejected) |
| staff_roster | id, hospital_id, staff_id, full_name, role, phone, email, licence_body, licence_no |
| patient_registry | id, hospital_id, hospital_number, full_name, phone, age, sex, language |
| profiles | id (= auth user), role (platform_admin / hospital_admin / doctor / pharmacist / nurse / patient), hospital_id (nullable for independent patients), full_name, phone, language (ig / yo / ha / pcm / en), licence_no, licence_body (MDCN / PCN / NMCN), verified_status (pending / verified / rejected / blocked), failed_attempts |
| prescriptions | id, patient_id, hospital_id, quantity_dispensed, drug_id, pill_shape (round / capsule / oval / inhaler / liquid / injection), pill_color (hex), drug_name, strength, form, dose, frequency_per_day, duration_days, with_food, instructions, instructions_plain, source (scan / staff), image_url, confirmed_by_patient, created_by, active |
| reminders | id, prescription_id, patient_id, time_of_day, days, channel (app / sms / voice), active |
| dose_logs | id, reminder_id, patient_id, scheduled_at, status (taken / missed / snoozed / late), logged_at, synced |
| conditions | id, patient_id, hospital_id, name, noted_by, started_on |
| allergies | id, patient_id, substance, reaction |
| checkins | id, patient_id, transcript, language, mood, side_effects (jsonb), red_flag (bool), created_at |
| alerts | id, patient_id, hospital_id, type (red_flag / side_effect / missed_doses / high_risk / interaction / question), detail, status (open / handled), handled_by |
| assistant_messages | id, patient_id, question, answer, language, escalated (bool), cited_post_id |
| forum_posts | id, author_id, hospital_id, category (medication / diet / mental_health), title, body, audio_url, drug_tags (text[]), language, status (published / hidden), is_demo |
| transfers | id, patient_id, from_hospital_id, to_hospital_id, scope (jsonb), consent_at, status (requested / accepted / completed / declined), summary |
| audit_log | id, actor_id, action, target_table, target_id, created_at |
| clinics | id, name, address, lat, lng, phone, hours, is_demo |
| drugs | id, name, generic_name, strength, form, manufacturer, nafdac_no, nafdac_listed (bool), is_demo |
| caregivers | id, patient_id, full_name, relationship, phone, language, channel (sms / whatsapp / app), notify_after_missed (int, default 1), consent_at, active |
| caregiver_alerts | id, caregiver_id, patient_id, dose_log_id, sent_at, channel, status (sent / failed) |
| refills | id, prescription_id, patient_id, quantity_dispensed, doses_per_day, units_per_dose, dispensed_on, runs_out_on (computed), alert_days_before (default 3), alerted_at, refilled (bool) |
| drug_checks | id, patient_id, scanned_name, nafdac_no, result (registered / not_found / mismatch / unreadable), checked_at |
| interactions | id, drug_a, drug_b, severity, note |
| risk_scores | patient_id, score, band (low / medium / high), updated_at |

### RLS
- Patients read/write only their own rows.
- Staff read rows where `hospital_id` = their own AND `verified_status = 'verified'`.
- Hospital admins manage `staff_roster`, `patient_registry` and verifications for their hospital.
- Forum: anyone reads `published`; only verified doctors, pharmacists and nurses insert.
- Transfers: visible to the patient and admins of both hospitals.
- Platform admin can read/approve hospitals.
- Caregivers: managed only by the patient (and their hospital's staff can view). Caregivers do not log in; they only receive alerts.

### Verification (database function called at signup)
1. Staff: match `staff_id` + `role` + `full_name` (case-insensitive) in `staff_roster` for the chosen hospital → send OTP to the roster's phone or email.
2. Patient: match `hospital_number` + `phone` in `patient_registry` → send OTP to that phone.
3. Match + correct OTP → `verified`. No match → `rejected`, signup cancelled, `failed_attempts + 1`.
4. Three failures → `blocked` + alert to hospital admin.
5. Every attempt is written to `audit_log`.

---

## 5. AI and safety

| Job | Route | Input → output |
| --- | --- | --- |
| Label / prescription reader | `/api/scan` | photo → prescription JSON + confidence |
| Instruction builder + speech | `/api/speak` | prescription + language → plain sentence → audio |
| Voice assistant | `/api/assistant` | question + patient context → answer + audio, or escalation |
| Check-in parser | `/api/checkin` | transcript → mood, side effects, red flag |
| Interaction checker | inside `/api/scan` | new drug + current meds + allergies → pharmacist alert |
| Adherence risk score | after each dose log | dose logs + check-ins → 0–100 + band |
| Transfer summary / weekly insight | `/api/transfer`, cron | records → one-page summary / insight card |

### Scanner JSON schema (Gemini structured output)
```json
{
  "drug_name": "Amoxicillin",
  "strength": "500 mg",
  "form": "capsule",
  "dose": "1 capsule",
  "frequency_per_day": 3,
  "duration_days": 5,
  "with_food": "after",
  "instructions_raw": "1 cap tds x 5/7 p.c.",
  "warnings_on_label": ["Complete the full course"],
  "confidence": 0.86,
  "missing_fields": []
}
```
Confidence < 0.75 or any missing field → ask for another photo ("Turn the pack so I can see the dose"). Patient must confirm before saving.

### Assistant system prompt rules
1. Answer only from the patient's prescriptions, label text, allergies and approved forum posts passed in context.
2. Never diagnose, prescribe, or change/stop a dose: "I can't advise that — please ask your pharmacist."
3. Reply in the patient's language, short sentences a 10-year-old understands.
4. Cite the forum post or label line used.
5. If unsure, say so and escalate to the pharmacist (create an alert).
6. Send no names or phone numbers to the model.

### Red-flag layer (runs BEFORE the model)
- Keyword lists per language in `src/lib/ai/redflags.ts`: chest pain, can't breathe, fainting, seizure, swelling of face or throat, heavy bleeding, suicidal thoughts. English + Pidgin first; leave clearly marked TODO slots for Igbo, Yoruba, Hausa terms (to be checked by native speakers).
- Match → skip the model, show red-flag screen, create alert.
- Model also returns `red_flag: true/false` as a second check.
- Self-harm / suicide words → crisis helpline screen (numbers in a config file marked "verify before demo") + urgent staff alert.

### Adherence risk score
```
risk = 40 × missed_rate_last_7_days
     + 20 × late_rate_last_7_days            (taken > 2 h after time)
     + 15 × (side_effect_reported_last_7_days ? 1 : 0)
     + 10 × (low_mood_checkins_last_7_days / 7)
     + 10 × (daily_doses >= 3 ? 1 : 0)
     +  5 × (no_checkin_last_3_days ? 1 : 0)
band: 0–39 low · 40–69 medium · 70–100 high → alert
```

### Privacy (Nigeria Data Protection Act 2023)
Explicit consent at signup; encryption at rest; "download / delete my data" in settings; every AI answer logged.

---

## 6. Build stages

Finish each stage's **Done when** test before the next. After each stage: list files, how to test, suggested commit message, then STOP.

### Stage 0 — Setup
- Scaffold Next.js App Router project `medisent-ai` (TypeScript, Tailwind, ESLint, `src/`, npm).
- Create the repo layout in section 2 (placeholder pages / route files).
- Tailwind theme: every token in section 3 + dark mode; fonts via `next/font/google`.
- `.env.example` (section 2); `.env.local` in `.gitignore`.
- Install `@supabase/supabase-js @supabase/ssr dexie serwist @serwist/next next-intl`.
- `src/config/brand.ts` with the app name "Medisent AI" and the tagline per locale (section 1).
- next-intl set up with locales en, ig, yo, ha, pcm; `messages/en.json` holding every landing-page string; the other four files drafted by `scripts/translate-messages.ts`.
- Language switcher in the header; brand name stays "Medisent AI", tagline and text change with the language.
- Landing page `/` — follow `docs/mockups/medisent-landing.png` (replaces the plain version). Sections, top to bottom:
    1. **Top bar:** logo, links (How it works · For hospitals · Safety · Languages), language picker, "Sign in" (outline), "Try the demo" (primary).
    2. **Hero on dot-grid background:** mono kicker chip ("Medication companion · 5 Nigerian languages"); headline "Your medicine, explained in *your language*, on time, every time." (64px, 600, "your language" in primary); one-line lead; buttons "Try the demo →" and "Register your hospital".
    3. **Live preview console** (the interesting part): a wide card with language tabs EN · IG · YO · HA · PCM. Three cells: (1) scanned label in mono with "Registered" and "Confidence" chips; (2) the instruction spoken in the selected language with a play button and waveform, English gloss under it; (3) a today ring + reminder time + refill chip. Switching tabs swaps the spoken sentence and plays its audio (pre-generated files in `public/audio/landing/`). Works without JS (shows English).
    4. **How it works:** 4 numbered steps on a connecting line — 01 Scan · 02 Hear · 03 Remember · 04 Get help.
    5. **One platform, three views:** a spec-sheet table (rows Sees / Does / Verified by; columns Patients / Pharmacists & doctors / Hospitals), verification methods in mono.
    6. **Works on any phone:** text panel + a drawn basic feature phone (keypad, green LCD) showing the SMS reminder "Reply 1 if taken". Must look like a basic phone, not a smartphone.
    7. **Safe by design:** 4 cards — Never diagnoses · Red flags first · NDPA 2023 · Verified voices.
    8. **Final CTA band** (dark ink background): "See it work in under a minute." + "Try the demo →" + "Register your hospital", with "Demo mode · fictional data" label.
    9. **Footer:** logo, "Built for AIESEC Hackathon 2026", language list in mono.
    - Mobile: sections stack; console cells stack vertically; steps become a vertical timeline; spec table becomes three cards.
    - The brand name appears in the top bar only (not repeated as a page heading).
    - Dev-only letter-check line ("ẹ ọ ṣ ị ụ ṅ") in a small footer row, hidden in production.
- **Impeccable (Stage 0):** after I install Impeccable (section 10, step 1), write `DESIGN.md` from section 3 and `PRODUCT.md` from section 1 using the templates in section 10.3, then run `/impeccable init` to confirm and complete PRODUCT.md. Build the landing page with `/impeccable shape landing page` first, then build it, then `/impeccable critique landing page` and `/impeccable audit landing page`; fix all P0 and P1 findings.
- **Done when:** `npm run dev` and `npm run build` pass; landing page shows the right fonts and colours; switching to Igbo keeps "Medisent AI" in the header and shows the Igbo tagline and landing text.

### Stage 1 — Hospitals, accounts, verification
- Supabase migrations for every table in section 4, plus RLS policies and the verification function.
- Hospital registration form (details, logo, brand colour, CAC number, licence upload) → `pending`.
- Platform admin page: approve / reject hospitals.
- Hospital admin: upload staff roster CSV and patient registry CSV with preview before saving.
- Signup: hospital dropdown (approved only) → role dropdown → role-specific fields (staff ID + licence for staff; hospital number + phone for patients).
- OTP step; three-strike block; admin alert.
- Rejected screen ("We couldn't match you — contact the records desk") and blocked screen.
- Independent patient signup (no hospital).
- Branded shell after login: "Welcome to [Hospital]", logo, brand colour bar, role-based **BottomNav** on mobile and sidebar on staff desktop (section 3).
- `supabase/seed.sql` from section 7, including 30 days of generated dose logs.
- **Impeccable (Stage 1):** `/impeccable shape signup and verification flow` before coding. After building: `/impeccable harden signup` (errors, OTP failure, rejected and blocked states, long names, i18n overflow), `/impeccable clarify signup` (labels, error messages, rejected-screen copy), `/impeccable critique hospital registration`, `/impeccable audit admin roster upload`, `/impeccable shape bottom navigation`, `/impeccable adapt bottom navigation` (360px, 200% text, gesture-bar phones), `/impeccable audit bottom navigation` (labels, touch size, aria-current). Fix P0 and P1.
- **Done when:** each role sees its own bottom bar on a phone-sized screen; pharmacist Chidinma Okafor verifies with staff ID AH-PH-001; a fake staff ID is rejected; both land on the right screens.

### Stage 2 — Scan, speak, remind
- Camera capture (getUserMedia) with file-picker fallback.
- `/api/scan` with Gemini + schema above; low-confidence retry; NAFDAC name match; unknown-drug flag.
- Confirm screen before saving, including "What does your medicine look like?" (shape + colour picker, scanner suggests a default).
- Signature elements 1–4 from section 3: Today ring, day timeline, pill icons, live scan viewfinder with "Found so far".
- Plain-language instruction builder ("Take 1 tablet 3 times a day after food, for 5 days").
- `/api/speak`: Spitch (ig, yo, ha, en), 9jaLingo (pcm); cache audio in Storage + IndexedDB; English Web Speech fallback if keys are missing.
- Reminder generator (3× daily → 08:00, 14:00, 20:00; editable).
- Reminder screen: plays the voice note; Taken / Snooze / Missed → `dose_logs`.
- Staff can add a prescription for a patient.
- **Refills:** when a prescription is saved, store quantity dispensed (from the scan or asked: "How many tablets did you get?"), compute `runs_out_on`, show "X days left" on the MedicineCard; a daily job alerts the patient (app + SMS) and their pharmacist 3 days before; "I got a refill" button resets the count.
- **Drug registration check:**
    - Scanner also extracts `nafdac_no` (format like `A4-1234`) and manufacturer if visible; patient can also type the number.
    - Look up in the `drugs` table. Results: **Registered** (green: name, strength and manufacturer match) · **Not found** (warning: "We couldn't find this NAFDAC number in our list. Show this pack to your pharmacist before taking it.") · **Mismatch** (warning: number belongs to a different drug) · **Unreadable** (ask for another photo or typing).
    - Never say a drug is "fake". Wording is always "not found in our list — check with your pharmacist". Log every check in `drug_checks`; "not found" and "mismatch" create a pharmacist alert.
    - Add a link "Report to NAFDAC" pointing to NAFDAC's official site (no data sent automatically).
- Accessibility settings: three text sizes, high contrast, speech speed.
- **Impeccable (Stage 2):** `/impeccable shape scan and reminder flow` first. After building: `/impeccable critique scan flow`, `/impeccable harden scan` (camera denied, blurry photo, low confidence, unknown drug, no network), `/impeccable typeset medicine card` (dose and time must be the most readable text on screen), `/impeccable adapt reminder screen` (small Android screens, large text size setting), `/impeccable audit patient home`, `/impeccable clarify drug check result` (warning must be calm, not scary), `/impeccable critique refill banner`. Fix P0 and P1.
- **Done when:** scanning a real drug pack gives a confirmed prescription, spoken in Igbo, with reminders scheduled; the card shows "days left"; a seeded "not found" NAFDAC number shows the check-with-pharmacist warning and creates an alert.

### Stage 3 — Assistant, check-ins, red flags, risk
- `/api/listen` (Spitch STT).
- `/api/assistant` with the rules in section 5; reply as text + audio; saved to `assistant_messages`.
- Red-flag layer before the model; escalation alerts.
- Daily check-in voice flow; parser extracts mood, side effects, red flag.
- Signature element 5: live voice waveform, transcript, "Try asking" chips, recording halo.
- Red-flag screen: AlertBanner, call button, nearest seeded clinics on a Leaflet map; staff alert.
- Interaction check on each new prescription vs current meds + allergies → pharmacist alert.
- Risk score recalculated after every dose log; high → alert.
- **Caregiver mode:**
    - Patient settings → "Add a caregiver": name, relationship, phone, language, channel (SMS / WhatsApp later / app), alert after 1 or 2 missed doses. Patient must tick consent.
    - Caregiver gets a one-time SMS asking them to reply YES to accept; only then are alerts sent.
    - When a dose is marked missed (or not confirmed 60 min after the reminder), and the threshold is reached, send the caregiver an SMS in their language: "Medisent AI: Mama Nkechi has not taken her 8:00 am Lisinopril. Please check on her." Log in `caregiver_alerts`.
    - Red-flag alerts also notify the caregiver immediately.
    - Patient can pause or remove a caregiver at any time.
- **Impeccable (Stage 3):** `/impeccable shape voice assistant and red-flag screen` first. After building: `/impeccable critique voice assistant` (mic state, listening, thinking, answer, escalation must each be obvious), `/impeccable harden voice assistant` (mic denied, no speech detected, API failure, very long answer), `/impeccable clarify red-flag screen` (short, calm, direct wording), `/impeccable audit red-flag screen` (contrast of white on alert red, call button size). Do NOT run bolder, overdrive or delight on the red-flag screen. `/impeccable shape caregiver setup`, then `/impeccable clarify caregiver setup` (consent wording) and `/impeccable harden caregiver setup` (invalid phone, caregiver never replies, SMS failure).
- **Done when:** Nkechi Okeke's missed dose sends her caregiver an SMS; a spoken question gets a spoken answer in the same language; "chest pain" triggers the red-flag flow; dashboard data shows risk scores for all 10 patients.

### Stage 4 — Forum and record transfers
- Forum feed: Medication, Diet, Mental health; posts tagged with the patient's drugs first.
- Post editor for verified staff (text, optional voice note, drug tags); verified badge with licence body.
- "Listen in my language": translate + TTS, labelled "machine-translated", link to original.
- Anonymous questions to professionals; crisis keywords → helpline screen.
- Report button + admin hide.
- Transfer flow: verify at new hospital → "Transfer my records" → choose scope → new hospital accepts → records COPIED (never deleted).
- AI transfer summary for the new doctor; FHIR JSON export (Patient, MedicationRequest, Condition, AllergyIntolerance); audit log.
- **Impeccable (Stage 4):** `/impeccable shape forum feed and post editor` and `/impeccable shape records transfer flow` first. After building: `/impeccable critique forum feed`, `/impeccable layout forum post card`, `/impeccable harden post editor` (empty post, long titles, failed audio upload), `/impeccable clarify transfer consent screen` (patient must understand exactly what is shared), `/impeccable audit transfer flow`.
- **Done when:** a pharmacist's post plays in Yoruba; Emeka Nwosu moves from Adaeze to Ikenga with meds and reminders intact.

### Stage 5 — Offline, SMS, dashboards
- Serwist service worker: app shell, routes, audio.
- Dexie mirror: prescriptions, reminders, dose_logs, checkins, saved posts.
- Sync queue: write to IndexedDB first, push on reconnect, last-write-wins by timestamp; OfflineBanner with last-synced time.
- Local notifications for reminders while offline.
- Africa's Talking: SMS reminders; replies 1 = taken, 2 = missed; inbound webhook updates `dose_logs`; voice-call reminder playing cached audio.
- Pharmacist / doctor dashboard: stat cards (open alerts, high-risk patients, doses taken today, questions waiting), patients by risk table, alerts panel, weekly AI insight card.
- Hospital admin dashboard: staff, patients, verifications, transfers, usage stats.
- Signature element 6: streak card and weekly bars on the patient Progress screen.
- **Adherence progress charts:**
    - Patient "My progress" screen: last 7 days as a simple row of day circles (✓ all taken / ½ some / ✗ missed) plus "You took 18 of 21 doses this week". Big, plain, no complex chart.
    - Staff patient detail: 30-day line chart of daily % doses taken, with markers for side-effect reports and red flags; per-medicine breakdown.
    - Dashboard: hospital-wide 30-day adherence line and "doses taken today" stat.
    - Use a light chart library (Recharts) with section 3 colours: primary line, green for taken, warning for missed, never red except red-flag markers. Every chart has a text summary for screen readers.
- **Impeccable (Stage 5):** `/impeccable shape pharmacist dashboard` first (use docs/mockups/medisent-staff-screens.png if present as the visual target). After building: `/impeccable layout pharmacist dashboard` (scan order: alerts → high risk → table), `/impeccable critique pharmacist dashboard`, `/impeccable audit hospital admin dashboard`, `/impeccable harden offline banner and sync` (stale data, sync conflict, failed SMS), `/impeccable optimize patient home` (fast on low-end phones and 3G), `/impeccable critique my progress screen`, `/impeccable typeset adherence chart` (labels readable at 18px), `/impeccable audit adherence chart` (contrast, screen-reader summary).
- **Done when:** charts show 30 days of seeded data for all patients; in airplane mode a reminder fires and "Taken" logs, then syncs on reconnect; an SMS reply updates the dashboard.

### Stage 6 — Polish
- **Guided demo mode:**
    - Landing page button "Try the demo" → role picker: Patient (Emeka Nwosu), Pharmacist (Chidinma Okafor), Hospital admin (Ngozi Eze).
    - Logs in to a seeded demo account with no OTP (demo accounts only, flagged `is_demo`; disabled when `NEXT_PUBLIC_DEMO_MODE=false`).
    - A dismissible "Demo tour" card walks through 5 steps for the chosen role (e.g. patient: Today's medicines → Scan → Ask → Progress → Caregiver) using a lightweight step overlay; "Skip tour" always visible.
    - A permanent "Demo mode — fictional data" ribbon on every screen.
    - Demo actions that would send real SMS go to the configured test phone only.
    - `/demo/reset` restores the seeded state after each judge.
- Every screen's strings in all five message files; run the translate script for new keys; list keys still marked machine-draft.
- `/demo/reset` (platform admin only) wipes and reloads seed data.
- Empty, loading and error states in all five languages.
- Contrast check against section 3; fix any pair under 4.5:1.
- Test on a small Android screen size and throttled 3G.
- List anything still broken.
- **Impeccable (Stage 6, full pass):**
    0. `/impeccable shape demo tour`, then `/impeccable clarify demo tour` and `/impeccable critique demo role picker`.
    1. `/impeccable onboard patient home` and `/impeccable onboard pharmacist dashboard` (first-run and empty states).
    2. `/impeccable critique` on every main screen; list scores.
    3. `/impeccable audit` on every main screen; fix every P0 and P1, list P2 and P3.
    4. `/impeccable harden` on every form.
    5. `/impeccable adapt` on every patient screen (360px wide, 200% text).
    6. `npx impeccable detect http://localhost:3000` on each main route (rendered scan catches contrast and tiny text).
    7. `/impeccable polish` on every main screen, last.
- **Done when:** the full demo (section 8) runs twice in a row without a fix.

---

## 7. Demo seed data (fictional, all marked Demo)

Phones use the unassigned +234 800 000 0xxx range. Licence numbers are fake.

### Hospitals
```csv
slug,name,city,state,brand_color,status
adaeze,Adaeze Specialist Hospital (Demo),Nsukka,Enugu,#1D4E89,approved
ikenga,Ikenga Medical Centre (Demo),Enugu,Enugu,#1E6B52,approved
```

### Staff roster
```csv
hospital,staff_id,full_name,role,licence_body,licence_no,phone,email
adaeze,AH-AD-001,Ngozi Eze,hospital_admin,,,+2348000000101,admin@adaeze.demo
adaeze,AH-DR-001,Dr Obinna Ugwu,doctor,MDCN,DEMO-MDCN-1001,+2348000000102,obinna@adaeze.demo
adaeze,AH-DR-002,Dr Amina Bello,doctor,MDCN,DEMO-MDCN-1002,+2348000000103,amina@adaeze.demo
adaeze,AH-PH-001,Chidinma Okafor,pharmacist,PCN,DEMO-PCN-2001,+2348000000104,chidinma@adaeze.demo
adaeze,AH-PH-002,Tunde Adeyemi,pharmacist,PCN,DEMO-PCN-2002,+2348000000105,tunde@adaeze.demo
adaeze,AH-NU-001,Blessing Okoro,nurse,NMCN,DEMO-NMCN-3001,+2348000000106,blessing@adaeze.demo
ikenga,IM-AD-001,Kelechi Nnaji,hospital_admin,,,+2348000000201,admin@ikenga.demo
ikenga,IM-DR-001,Dr Funmilayo Ade,doctor,MDCN,DEMO-MDCN-1003,+2348000000202,funmi@ikenga.demo
ikenga,IM-PH-001,Ibrahim Musa,pharmacist,PCN,DEMO-PCN-2003,+2348000000203,ibrahim@ikenga.demo
ikenga,IM-NU-001,Grace Udeh,nurse,NMCN,DEMO-NMCN-3002,+2348000000204,grace@ikenga.demo
```

### Patient registry (Emeka Nwosu is in both, for the transfer demo)
```csv
hospital,hospital_number,full_name,age,sex,language,phone,adherence_profile
adaeze,AH-0001,Emeka Nwosu,67,M,ig,+2348000000301,medium
adaeze,AH-0002,Nkechi Okeke,72,F,ig,+2348000000302,high_risk
adaeze,AH-0003,Musa Abdullahi,45,M,ha,+2348000000303,good
adaeze,AH-0004,Folake Adebayo,34,F,yo,+2348000000304,good
adaeze,AH-0005,Chukwudi Agu,52,M,pcm,+2348000000305,high_risk
adaeze,AH-0006,Aisha Lawal,29,F,ha,+2348000000306,medium
adaeze,AH-0007,Ifeoma Chukwu,24,F,en,+2348000000307,medium
adaeze,AH-0008,Yusuf Ibrahim,60,M,ha,+2348000000308,good
adaeze,AH-0009,Bisi Ogunleye,40,F,yo,+2348000000309,good
ikenga,IM-0001,Emeka Nwosu,67,M,ig,+2348000000301,medium
ikenga,IM-0002,Obioma Nnadi,55,M,ig,+2348000000310,good
```

### Conditions, allergies, prescriptions
| Patient | Conditions | Allergies | Prescriptions | Demo role |
| --- | --- | --- | --- | --- |
| Emeka Nwosu | Hypertension, type 2 diabetes | None | Amlodipine 5 mg once daily; metformin 500 mg twice daily after food | Transfer Adaeze → Ikenga |
| Nkechi Okeke | Hypertension | None | Lisinopril 10 mg once daily | Scanning ibuprofen triggers interaction alert |
| Musa Abdullahi | Malaria | None | Artemether-lumefantrine 80/480 mg twice daily for 3 days | Hausa voice |
| Folake Adebayo | Peptic ulcer | None | Omeprazole 20 mg once daily before breakfast | Yoruba question "Can I take this after food?" |
| Chukwudi Agu | Hypertension | None | Losartan 50 mg once daily | Pidgin check-in "I dey feel dizzy", then "chest pain" |
| Aisha Lawal | Asthma | None | Budesonide inhaler twice daily; salbutamol inhaler when needed | Missed-dose pattern |
| Ifeoma Chukwu | Depression | None | Sertraline 50 mg once daily | Low-mood check-ins; mental health posts |
| Yusuf Ibrahim | Type 2 diabetes | None | Metformin 1000 mg twice daily; glibenclamide 5 mg once daily before breakfast | Diabetes diet posts |
| Bisi Ogunleye | Typhoid | Penicillin | Ciprofloxacin 500 mg twice daily for 7 days | Milk/antacid timing post |
| Obioma Nnadi | Osteoarthritis | None | Paracetamol 1 g up to three times daily | Ikenga patient |

### Dose logs (generate in seed)
- 30 days back from today for every active prescription.
- good = 95% taken on time; medium = 80% taken, 10% late; high_risk = 60% taken, 15% late, last 3 days mostly missed.
- Check-ins every 1–2 days; Ifeoma low mood on 5 of the last 7 days; Chukwudi dizziness twice this week.

### Caregivers
| Patient | Caregiver | Relationship | Channel | Alert after |
| --- | --- | --- | --- | --- |
| Nkechi Okeke | Adaeze Okeke | Daughter | SMS | 1 missed dose |
| Emeka Nwosu | Chinedu Nwosu | Son | SMS | 2 missed doses |
| Chukwudi Agu | Ngozi Agu | Wife | SMS | 1 missed dose |
All caregiver phones = `DEMO_TEST_PHONE` during the demo.

### Refills (quantity dispensed)
- Nkechi Okeke lisinopril: 30 tablets, dispensed 28 days ago → runs out in 2 days (triggers refill alert).
- Emeka Nwosu metformin: 60 tablets, dispensed 25 days ago → 5 days left.
- Everyone else: enough for 10+ days.

### Drug registration list (`drugs`, all `is_demo = true`)
- Seed one row per prescribed drug with a fictional demo NAFDAC number (e.g. `DEMO-A4-0001` …) and manufacturer.
- Add one fictional "not found" test number `DEMO-X9-9999` printed on a demo pack image, for the warning demo.
- Real NAFDAC data is not used in the demo; label the list "Demo registration list".

### Interactions table (seed at least)
- ibuprofen + lisinopril (moderate: reduces BP effect, kidney risk)
- ibuprofen + losartan (moderate)
- ciprofloxacin + antacids / dairy (timing: separate by 2 hours)
- metformin + alcohol (caution)

### Forum posts (8, `is_demo = true`)
1. Medication — "Finish your full antibiotic course" (Chidinma Okafor, PCN)
2. Medication — "What to do if you miss a dose" (Tunde Adeyemi, PCN)
3. Diet — "Metformin: eat with your meals" (Dr Obinna Ugwu, MDCN), tags metformin
4. Diet — "Ciprofloxacin: keep milk and antacids 2 hours away" (Ibrahim Musa, PCN), tags ciprofloxacin
5. Diet — "Blood pressure medicines and salt" (Dr Amina Bello, MDCN), tags amlodipine, lisinopril, losartan
6. Medication — "Painkillers and blood pressure medicines" (Chidinma Okafor, PCN), tags ibuprofen, lisinopril
7. Mental health — "Feeling low is not weakness: when to talk to someone" (Dr Funmilayo Ade, MDCN)
8. Mental health — "Sleep, stress and your medicines" (Blessing Okoro, NMCN)

### Clinics
Both demo hospitals plus 3 invented "Demo clinic" entries in Nsukka and Enugu with map pins.

---

## 8. Demo script (what must work on Friday)

0. Judge taps "Try the demo" → picks Patient → guided tour starts.

1. Hospital A approved; pharmacist verifies with real staff ID; fake ID rejected.
2. Patient login: "Welcome to Adaeze Specialist Hospital (Demo)", meds and conditions.
3. Scan a real drug pack → hear instructions in Igbo → reminders appear → card shows "days left"; registration check shows Registered.
3b. Type `DEMO-X9-9999` → "not found in our list — check with your pharmacist" warning → pharmacist alert.
4. Ask by voice in Yoruba: "Can I take this after food?" → spoken answer with linked forum post.
5. "I dey feel dizzy" logs side effect; "chest pain" opens red-flag alert with nearest clinic.
6. Airplane mode: reminder fires, "Taken" logs, syncs on reconnect.
7. Basic phone gets SMS reminder and replies 1.
7b. Nkechi misses a dose → her caregiver's (test) phone gets an SMS; refill alert shows "2 days left".
8. Pharmacist dashboard (with 30-day adherence charts): risk scores, missed doses, dizziness report, red-flag alert, interaction warning.
9. Emeka transfers to Hospital B; meds, reminders and AI summary arrive.

---

## 9. Domain and deployment (later)

- Build and test on the free Vercel address (`<project>.vercel.app`) first. Do not hard-code any domain; use `NEXT_PUBLIC_APP_URL`.
- When the domain is bought: Vercel project → Settings → Domains → add it, then set the DNS records Vercel shows at the domain registrar.
- Then update `NEXT_PUBLIC_APP_URL`, the Supabase Auth Site URL and redirect URLs, and the Africa's Talking webhook URL to the new domain.
- If the domain name changes the app name, edit only `src/config/brand.ts`.

---

## 10. Impeccable design workflow (detailed)

Impeccable is a community design skill (not made by Anthropic): https://github.com/pbakaus/impeccable · https://impeccable.style
It gives the agent a shared design vocabulary of 24 commands, a reviewer (critique, audit), and a detector of 62 deterministic rules that catch generic "AI-looking" UI.

### 10.1 Install (I do this myself, then commit)
1. From the project root (after Stage 0 scaffolding exists): `npx impeccable install`
   - Choose: tool = Claude Code; scope = **project** (so it lives in the repo).
   - When it offers the design hook: **yes** (it scans every UI file the agent edits and reports findings before the agent says it's done).
2. Optional: `npx impeccable telemetry off`
3. Reload the coding tool.
4. Alternative install (Claude Code plugin): `/plugin marketplace add pbakaus/impeccable`, then install from `/plugin`.
5. Update later with `npx impeccable update`.
6. I read `skills/impeccable/SKILL.md` before first use and commit the installed files myself.

### 10.2 Session start (agent, every session)
1. Load Impeccable context once per session (the skill tells you how; it reads PRODUCT.md and DESIGN.md). Do not rerun it in the same session.
2. If context loading fails, tell me before your next tool call, then read PRODUCT.md and DESIGN.md directly.
3. Read Impeccable's craft-floor reference before any UI edit, even a small one.

### 10.3 Project context files (agent writes these in Stage 0)

**DESIGN.md** — write it from section 3, not from `/impeccable document` (there is no UI code yet). Must contain:
- Direction: "Clinical precision" — technical, precise and calm; cool neutrals, white cards, one cobalt accent, monospaced numbers. Built for every age, including elderly, low-literacy and low-vision users on low-end Android phones.
- The full token table from section 3, dark-mode values, fonts, header rule, button rule.
- Type scale: body 18px minimum; medicine name and dose are the largest text on patient screens; line-height 1.5 for body.
- Spacing: 4px base, 8 / 12 / 16 / 24 / 32 steps; cards 14–16px padding, 12px radius; buttons 10px radius, 48px minimum height.
- Components list from section 3.
- Hard rules: primary buttons with white text; red only for red-flag alerts; never colour alone (icon + word); no gradients, no glassmorphism, no purple; every screen has a read-aloud button; text must not be clipped when translated.
- Anti-goals: generic SaaS landing (centered hero + three feature cards), purple-pink gradients, tiny grey text, icon-only buttons on patient screens.

**PRODUCT.md** — write a draft from section 1, then run `/impeccable init` to check and complete it. Must contain:
- Product: Medisent AI — voice-first, offline-ready medication companion for Nigerian hospitals.
- Users: (1) patients, many elderly or low-literacy, speaking Igbo, Yoruba, Hausa, Pidgin or English, on cheap Android phones with weak network; (2) pharmacists and doctors checking adherence and alerts; (3) hospital admins managing staff and patients.
- Jobs: take the right medicine at the right time; understand instructions in my language; get help fast in an emergency; (staff) see who is at risk and act.
- Brand personality: trustworthy, warm, calm, plain-spoken, Nigerian.
- Context of use: noisy clinics, bright sunlight, one hand, interrupted network.
- Platform: responsive web app / PWA, mobile-first for patients, desktop-first for staff dashboards.
- Success: a 70-year-old Igbo speaker can confirm a dose in under 10 seconds.

### 10.4 Command guide for this project

| Command | Use it for | Where in Medisent AI |
| --- | --- | --- |
| `shape [feature]` | Plan UX/UI before writing code | Before every new screen or flow |
| `init` | Capture product context in PRODUCT.md | Once, Stage 0 |
| `document` | Generate DESIGN.md from existing code | Only if DESIGN.md drifts from the code later |
| `extract [target]` | Pull repeated patterns into the design system | After Stage 2 (MedicineCard, ReminderSheet) and Stage 5 (dashboard cards) |
| `critique [target]` | Scored UX review, ranked fixes | After every screen is built |
| `audit [target]` | Accessibility, performance, theming, responsive; findings P0–P3 | After every screen; fix P0 + P1 before moving on |
| `polish [target]` | Final pre-ship pass | Stage 6, every main screen, last |
| `harden [target]` | Errors, i18n, overflow, edge cases | Every form, scan flow, voice flow, offline sync |
| `clarify [target]` | UX copy, labels, error messages | Signup, rejected screen, red-flag screen, transfer consent |
| `adapt [target]` | Screen sizes and devices | Every patient screen (360px, large text) |
| `optimize [target]` | UI performance | Patient home, scan, forum feed |
| `onboard [target]` | First-run flows, empty states | Stage 6 |
| `typeset [target]` | Typography hierarchy | Medicine card, dashboard table |
| `layout [target]` | Spacing, rhythm, hierarchy | Dashboard, forum card |
| `distill [target]` | Strip to essentials | Any patient screen that feels busy |
| `quieter [target]` | Tone down loud designs | If any screen feels too intense |
| `animate [target]` | Purposeful motion | Only: mic listening pulse, dose "Taken" confirmation; respect reduced-motion |
| `bolder`, `colorize`, `delight`, `overdrive` | Amplify / add colour / personality | **Do not use** — they would fight the fixed palette and the calm medical tone. Landing page only, and only if I ask |
| `generate [n] [action] [element]` | Variants of one element | Optional, e.g. 3 variants of the landing hero |
| `live` | Browser element picking | **Do not use** unless I ask |

Every command takes a target. Keep targets narrow: one screen or one component at a time (e.g. `/impeccable critique medicine card`, not `/impeccable critique app`).

### 10.5 Loop for every screen
1. `/impeccable shape <screen>` → agree the plan.
2. Build the screen using section 3 tokens and the components list.
3. Design hook findings → fix before reporting done.
4. `/impeccable critique <screen>` → fix the top 3 issues.
5. `/impeccable audit <screen>` → fix all P0 (blocking) and P1; list P2/P3 for Stage 6.
6. Stage-specific extras (harden / clarify / adapt / typeset) as listed in each stage.
7. Report: what changed, remaining P2/P3, files touched, suggested commit message. Stop.

### 10.6 Detector (CLI)
- Scan source: `npx impeccable detect src/`
- Scan a rendered page (needed for contrast and tiny-text rules): `npx impeccable detect http://localhost:3000` and each main route, e.g. `/home`, `/scan`, `/assistant`, `/forum`, `/dashboard`.
- Machine-readable: `npx impeccable detect --json .`
- List rules: `npx impeccable detect --list-rules`
- Exit code 2 = findings, 1 = could not scan.
- If a rule conflicts with section 3 on purpose (e.g. a font rule flags IBM Plex Sans), allow it with a reason instead of changing the design:
  `npx impeccable ignores add-value <rule> <value> --reason "Fixed brand choice, see BUILD_PLAN section 3"`
- Hook control: `impeccable hooks status | on | off`.

### 10.7 What I check after each Impeccable pass
- Palette and fonts unchanged (compare with section 3).
- Patient screens still readable at 200% text and 360px wide.
- No new dependency added without telling me.
- P0 count = 0 before I commit the stage.
