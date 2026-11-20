-- Medisent AI — Stage 3: assistant, red flags, check-ins, risk score, caregivers (2026-11-20).

-- Assistant: every answer logged with whether the red-flag layer fired and whether it escalated.
alter table assistant_messages
  add column if not exists red_flag boolean not null default false,
  add column if not exists unsure boolean not null default false;

-- Check-ins: the three answers as typed/spoken, the problems question, and what the parser found.
alter table checkins
  add column if not exists answers jsonb,
  add column if not exists problems text;

-- Caregivers: invitation → YES reply → active; the patient can pause or remove.
alter table caregivers
  add column if not exists status text not null default 'pending' check (status in ('pending', 'accepted', 'paused')),
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists paused_at timestamptz;
-- Caregivers seeded with consent are treated as accepted.
update caregivers set status = 'accepted', accepted_at = coalesce(accepted_at, consent_at) where consent_at is not null and status = 'pending';

-- Caregiver alerts: why it was sent and which dose slot, so one slot never sends twice.
alter table caregiver_alerts
  add column if not exists reason text not null default 'missed_dose' check (reason in ('missed_dose', 'red_flag', 'invite')),
  add column if not exists detail text,
  add column if not exists slot_key text;
create unique index if not exists caregiver_alerts_slot_idx on caregiver_alerts (caregiver_id, slot_key) where slot_key is not null;

-- Risk score: the parts behind the number (shown to staff).
alter table risk_scores add column if not exists detail jsonb;

-- Alerts raised for a red flag carry the words that matched (for the pharmacist), never the model.
alter table alerts add column if not exists source text;

-- Inbound SMS (Africa's Talking webhook): kept raw for the audit trail.
create table if not exists inbound_sms (
  id uuid primary key default gen_random_uuid(),
  from_phone text not null,
  text text not null,
  handled text,
  received_at timestamptz not null default now()
);
alter table inbound_sms enable row level security;
grant all on inbound_sms to service_role;
