-- Medisent AI — Stage 2: scan, speak, remind, refills, drug check.

-- What the scanner read, kept with the prescription.
alter table prescriptions
  add column if not exists nafdac_no text,
  add column if not exists manufacturer text,
  add column if not exists check_result drug_check_result_t,
  add column if not exists warnings text[] not null default '{}',
  add column if not exists instructions_audio_key text;

-- One log per reminder per scheduled time (taken / snoozed / missed upsert on it).
create unique index if not exists dose_logs_unique_slot on dose_logs (reminder_id, scheduled_at) where reminder_id is not null;
alter table dose_logs add column if not exists snoozed_until timestamptz;

-- Refill and drug-check alerts for the pharmacist.
alter type alert_type_t add value if not exists 'refill';

-- Spoken instructions cached in Storage (bucket audio-cache) so each sentence is synthesised once.
create table if not exists audio_cache (
  key text primary key,
  path text not null,
  provider text not null,
  language language_t not null,
  mime text not null default 'audio/mpeg',
  created_at timestamptz not null default now()
);
alter table audio_cache enable row level security;
create policy audio_cache_read on audio_cache for select using (auth.uid() is not null);
grant select on audio_cache to authenticated, service_role;
grant all on audio_cache to service_role;

-- drug_checks: link to the prescription that triggered the check.
alter table drug_checks add column if not exists prescription_id uuid references prescriptions(id) on delete set null;
alter table drug_checks add column if not exists drug_id uuid references drugs(id) on delete set null;

-- Accessibility settings (Me → Accessibility): text size, high contrast, speech speed.
alter table profiles add column if not exists high_contrast boolean not null default false;
