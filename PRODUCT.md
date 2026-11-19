# Product

<!-- impeccable:product-schema 1 -->

Medisent AI is a voice-first, offline-ready medication companion for Nigerian hospitals. Full build spec: `docs/BUILD_PLAN.md`.

## Platform

web

## Users

1. **Patients** (primary): many elderly or low-literacy, speaking Igbo, Yoruba, Hausa, Nigerian Pidgin or English, on cheap Android phones with weak or interrupted network. Some have only basic phones (SMS / voice call). Their job: take the right medicine at the right time, understand the instructions by listening in their own language, and get help fast in an emergency.
2. **Pharmacists, doctors and nurses**: verified hospital staff who check adherence, alerts, side-effect reports and interactions for their hospital's patients, and post guidance on the forum. Their job: see who is at risk and act.
3. **Hospital admins**: register the hospital, maintain the staff roster and patient registry, approve verifications and record transfers. Their job: make sure only real staff and real patients join.
4. **Caregivers** (no login): family members who get an SMS, in their language, when a dose is missed or a red flag fires.
5. **Competition judges** (current): evaluate the product through a one-tap guided demo with fictional data.

## Product Purpose

Patients scan a drug label or prescription and hear the instructions in their language. The product builds reminders, answers medication questions by voice, runs daily check-ins, catches red flags, checks interactions, scores adherence risk, alerts caregivers about missed doses, and warns before medicine runs out. Staff see adherence and alerts; records move between hospitals with patient consent.

Success: a 70-year-old Igbo speaker can confirm a dose in under 10 seconds.

## Positioning

Four claims together, none of which a generic reminder app can truthfully make:

- **Voice in Nigerian languages**: instructions and answers spoken in Igbo, Yoruba, Hausa, Pidgin and English.
- **Hospital-verified identity**: staff and patients are matched against the hospital's own staff roster and patient registry before they get in.
- **Works on basic phones**: offline-first app plus SMS and voice-call fallback.
- **Safety before AI**: red-flag words are checked before any AI call; the AI never diagnoses, prescribes, or changes or stops a dose.

## Operating Context

- Built now for a competition demo judged on a Friday (guided demo mode, demo script in BUILD_PLAN section 8), then a pilot with a real hospital.
- Patients: noisy clinics, bright sunlight, one hand, interrupted network, shared or borrowed phones.
- Staff: hospital desktops for dashboards; phones on the ward.
- Hospitals join by registering (CAC number, licence upload) and are approved by the platform admin. Staff licences: MDCN (doctors), PCN (pharmacists), NMCN (nurses).
- Drug registration checks against a NAFDAC-based list.

## Capabilities and Constraints

- Every piece of UI text is translated (en source; ig, yo, ha, pcm machine-drafted until a native speaker reviews). The brand name "Medisent AI" is never translated. Text expands in translation and must never clip.
- Every screen has a read-aloud button.
- Data is scoped per hospital with row-level security. Nigeria Data Protection Act 2023: explicit consent, download / delete my data, every AI answer logged.
- A drug is never called "fake": only "not found in our list — check with your pharmacist".
- The app name lives in one config file and may change to follow the final domain.

## Safety boundaries

The AI never diagnoses, prescribes, or changes or stops a dose. Red-flag words route to an emergency screen with a call button and nearest clinics; self-harm words route to a crisis helpline screen. Red is reserved for red-flag alerts.

## Brand Commitments

- Name: **Medisent AI**. Tagline: **Ọgwụ. Oògùn. Magani. Your medicine, in your language.**
- Personality: trustworthy, warm, calm, plain-spoken, Nigerian.
- The visual system in BUILD_PLAN section 3 (palette, Young Serif + Atkinson Hyperlegible, header rule, denim buttons) is fixed and binding. Design tools work inside it; proposed changes are listed for the owner, not applied.

## Evidence on Hand

None yet. There are no partner hospitals, pilot results, user quotes, endorsements or statistics. All hospitals, staff, patients and drug numbers are fictional and labelled "Demo". Never fabricate proof, logos or numbers.

## Product Principles

1. **Listening first.** Anything a patient must understand can be heard, in their language, without reading.
2. **Verified, not open.** Trust comes from the hospital's own records; nobody gets in on their word alone.
3. **Never stranded.** Weak network, basic phone or no data still gets the reminder through.
4. **Safe by construction.** Emergencies are caught before the model; the product guides and escalates, it never treats.
5. **Calm over clever.** Plain words a 10-year-old understands; warnings that inform without frightening.

## Accessibility & Inclusion

Elderly, low-literacy and low-vision users: body text 18px minimum, tap targets 48px minimum, never colour alone (icon + word), three text sizes, high-contrast mode, adjustable speech speed, works at 360px wide and 200% text. WCAG AA contrast (4.5:1) as the minimum.
