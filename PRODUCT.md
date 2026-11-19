# Medisent AI — Product

Draft from `docs/BUILD_PLAN.md` section 1. To be checked and completed with `/impeccable init`.

## Product

Medisent AI is a voice-first, offline-ready medication companion for Nigerian hospitals.

Tagline: **Ọgwụ. Oògùn. Magani. Your medicine, in your language.** The brand name is never translated; the tagline and all other text are (Igbo, Yoruba, Hausa, Nigerian Pidgin, English).

## Users

1. **Patients**: many elderly or low-literacy, speaking Igbo, Yoruba, Hausa, Pidgin or English, on cheap Android phones with weak network. Some use basic phones (SMS / voice call only).
2. **Pharmacists, doctors and nurses**: checking adherence, alerts, side effects and interactions for their hospital's patients.
3. **Hospital admins**: managing the staff roster, patient registry, verifications and record transfers.
4. **Caregivers** (no login): family members who receive an SMS when a dose is missed.

## Jobs to be done

- Take the right medicine at the right time.
- Understand my instructions in my own language, by listening.
- Get help fast in an emergency.
- (Staff) See who is at risk and act.
- (Admin) Make sure only real staff and real patients join my hospital.

## Brand personality

Trustworthy, warm, calm, plain-spoken, Nigerian.

## Context of use

Noisy clinics, bright sunlight, one hand, interrupted network, shared or borrowed phones.

## Platform

Responsive web app / PWA. Mobile-first for patients; desktop-first for staff dashboards.

## Safety boundaries

The AI never diagnoses, prescribes, or changes or stops a dose. Red-flag words are checked before any AI call and route to an emergency screen. Drugs are never called "fake": only "not found in our list — check with your pharmacist".

## Success

A 70-year-old Igbo speaker can confirm a dose in under 10 seconds.
