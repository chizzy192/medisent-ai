-- Medisent AI — schema (BUILD_PLAN section 4). Stage 1.
-- Every clinical table is scoped by hospital_id and protected by RLS (0002_rls.sql).
-- Run in the Supabase SQL editor in order: 0001, 0002, 0003, 0004, then seed.sql.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type role_t as enum ('platform_admin', 'hospital_admin', 'doctor', 'pharmacist', 'nurse', 'patient');
create type hospital_status_t as enum ('pending', 'approved', 'rejected');
create type verified_status_t as enum ('pending', 'verified', 'rejected', 'blocked');
create type language_t as enum ('en', 'ig', 'yo', 'ha', 'pcm');
create type licence_body_t as enum ('MDCN', 'PCN', 'NMCN');
create type pill_shape_t as enum ('round', 'capsule', 'oval', 'inhaler', 'liquid', 'injection');
create type with_food_t as enum ('before', 'after', 'with', 'any');
create type prescription_source_t as enum ('scan', 'staff');
create type reminder_channel_t as enum ('app', 'sms', 'voice');
create type dose_status_t as enum ('taken', 'missed', 'snoozed', 'late');
create type alert_type_t as enum ('red_flag', 'side_effect', 'missed_doses', 'high_risk', 'interaction', 'question', 'verification_blocked', 'drug_not_found');
create type alert_status_t as enum ('open', 'handled');
create type forum_category_t as enum ('medication', 'diet', 'mental_health');
create type forum_status_t as enum ('published', 'hidden');
create type transfer_status_t as enum ('requested', 'accepted', 'completed', 'declined');
create type caregiver_channel_t as enum ('sms', 'whatsapp', 'app');
create type caregiver_alert_status_t as enum ('sent', 'failed');
create type drug_check_result_t as enum ('registered', 'not_found', 'mismatch', 'unreadable');
create type risk_band_t as enum ('low', 'medium', 'high');
create type otp_purpose_t as enum ('signup', 'login');
create type signup_status_t as enum ('pending_otp', 'completed', 'expired');

-- ---------- helpers ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Nigerian phone numbers in E.164 (+234…). "0803 000 0001" -> "+2348030000001".
create or replace function normalize_phone(p text) returns text language sql immutable as $$
  select case
    when p is null then null
    when regexp_replace(p, '\D', '', 'g') = '' then null
    when regexp_replace(p, '\D', '', 'g') ~ '^0\d{10}$' then '+234' || substr(regexp_replace(p, '\D', '', 'g'), 2)
    when regexp_replace(p, '\D', '', 'g') ~ '^[789]\d{9}
    else '+' || regexp_replace(p, '\D', '', 'g')
  end
$$;

-- ---------- hospitals and the people in them ----------
create table hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  brand_color text not null default '#1D4E89' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  address text,
  city text,
  state text,
  cac_no text,
  licence_url text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status hospital_status_t not null default 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger hospitals_updated before update on hospitals for each row execute function set_updated_at();

create table staff_roster (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  staff_id text not null,
  full_name text not null,
  role role_t not null check (role in ('hospital_admin', 'doctor', 'pharmacist', 'nurse')),
  phone text,
  email text,
  licence_body licence_body_t,
  licence_no text,
  created_at timestamptz not null default now(),
  unique (hospital_id, staff_id)
);
create index staff_roster_lookup on staff_roster (hospital_id, lower(staff_id));

create table patient_registry (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  hospital_number text not null,
  full_name text not null,
  phone text not null,
  age int check (age between 0 and 130),
  sex text check (sex in ('M', 'F', 'other')),
  language language_t not null default 'en',
  created_at timestamptz not null default now(),
  unique (hospital_id, hospital_number)
);
create index patient_registry_lookup on patient_registry (hospital_id, lower(hospital_number));

-- One row per auth user. hospital_id is null for independent patients and the platform admin.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_t not null,
  hospital_id uuid references hospitals(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  language language_t not null default 'en',
  licence_no text,
  licence_body licence_body_t,
  staff_id text,
  hospital_number text,
  verified_status verified_status_t not null default 'pending',
  failed_attempts int not null default 0,
  consent_at timestamptz,
  text_size text not null default 'normal' check (text_size in ('normal', 'large', 'larger')),
  speech_rate numeric not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_phone on profiles (phone) where phone is not null;
create unique index profiles_email on profiles (lower(email)) where email is not null;
create index profiles_hospital on profiles (hospital_id, role);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- ---------- Stage 1 verification plumbing ----------
-- Failed match attempts per (hospital, identifier). Three failures block the identifier
-- and raise an alert for the hospital admin (section 4, "Verification").
create table verification_attempts (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references hospitals(id) on delete cascade,
  identifier text not null,
  role role_t not null,
  failed_attempts int not null default 0,
  blocked_at timestamptz,
  last_attempt_at timestamptz not null default now(),
  unique (hospital_id, identifier, role)
);

-- A signup that matched the roster/registry and is waiting for its OTP.
create table signup_sessions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references hospitals(id) on delete cascade,
  role role_t not null,
  full_name text not null,
  phone text not null,
  email text,
  language language_t not null default 'en',
  staff_id text,
  hospital_number text,
  licence_body licence_body_t,
  licence_no text,
  roster_id uuid,
  registry_id uuid,
  consent_at timestamptz,
  status signup_status_t not null default 'pending_otp',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

-- One-time codes we send ourselves (SMS via Africa's Talking; fixed demo code in demo mode).
create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  purpose otp_purpose_t not null,
  code_hash text not null,
  signup_session_id uuid references signup_sessions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  attempts int not null default 0,
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_codes_target on otp_codes (target, purpose, created_at desc);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_table text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_target on audit_log (target_table, target_id);

-- ---------- reference data ----------
create table drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  strength text,
  form text,
  manufacturer text,
  nafdac_no text,
  nafdac_listed boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index drugs_nafdac on drugs (upper(nafdac_no));
create index drugs_name on drugs (lower(name));

create table interactions (
  id uuid primary key default gen_random_uuid(),
  drug_a text not null,
  drug_b text not null,
  severity text not null check (severity in ('minor', 'moderate', 'major', 'timing', 'caution')),
  note text not null
);

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  hours text,
  is_demo boolean not null default false
);

-- ---------- clinical records (all scoped by hospital_id) ----------
create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete set null,
  drug_id uuid references drugs(id),
  drug_name text not null,
  strength text,
  form text,
  dose text,
  frequency_per_day int not null default 1 check (frequency_per_day between 1 and 12),
  duration_days int,
  with_food with_food_t not null default 'any',
  instructions text,
  instructions_plain text,
  pill_shape pill_shape_t not null default 'round',
  pill_color text not null default '#FFFFFF',
  quantity_dispensed int,
  source prescription_source_t not null default 'staff',
  image_url text,
  confirmed_by_patient boolean not null default false,
  created_by uuid references profiles(id),
  active boolean not null default true,
  started_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prescriptions_patient on prescriptions (patient_id, active);
create index prescriptions_hospital on prescriptions (hospital_id);
create trigger prescriptions_updated before update on prescriptions for each row execute function set_updated_at();

create table reminders (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  time_of_day time not null,
  days int[] not null default '{0,1,2,3,4,5,6}',
  channel reminder_channel_t not null default 'app',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index reminders_patient on reminders (patient_id, active);

create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  status dose_status_t not null,
  logged_at timestamptz,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);
create index dose_logs_patient_time on dose_logs (patient_id, scheduled_at desc);

create table conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete set null,
  name text not null,
  noted_by uuid references profiles(id),
  started_on date
);
create index conditions_patient on conditions (patient_id);

create table allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  substance text not null,
  reaction text
);
create index allergies_patient on allergies (patient_id);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  transcript text,
  language language_t not null default 'en',
  mood text check (mood in ('good', 'okay', 'low')),
  side_effects jsonb not null default '[]'::jsonb,
  red_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index checkins_patient on checkins (patient_id, created_at desc);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete cascade,
  type alert_type_t not null,
  detail text,
  status alert_status_t not null default 'open',
  handled_by uuid references profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_hospital_open on alerts (hospital_id, status, created_at desc);

create table assistant_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  question text not null,
  answer text,
  language language_t not null default 'en',
  escalated boolean not null default false,
  cited_post_id uuid,
  created_at timestamptz not null default now()
);

create table forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  hospital_id uuid references hospitals(id) on delete set null,
  category forum_category_t not null,
  title text not null,
  body text not null,
  audio_url text,
  drug_tags text[] not null default '{}',
  language language_t not null default 'en',
  status forum_status_t not null default 'published',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index forum_posts_published on forum_posts (status, created_at desc);
alter table assistant_messages add constraint assistant_messages_post foreign key (cited_post_id) references forum_posts(id) on delete set null;

create table transfers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  from_hospital_id uuid not null references hospitals(id),
  to_hospital_id uuid not null references hospitals(id),
  scope jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  status transfer_status_t not null default 'requested',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger transfers_updated before update on transfers for each row execute function set_updated_at();

create table caregivers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text not null,
  language language_t not null default 'en',
  channel caregiver_channel_t not null default 'sms',
  notify_after_missed int not null default 1,
  consent_at timestamptz,
  active boolean not null default true
);
create index caregivers_patient on caregivers (patient_id);

create table caregiver_alerts (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references caregivers(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  dose_log_id uuid references dose_logs(id) on delete set null,
  sent_at timestamptz not null default now(),
  channel caregiver_channel_t not null default 'sms',
  status caregiver_alert_status_t not null default 'sent'
);

create table refills (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  quantity_dispensed int not null,
  doses_per_day int not null,
  units_per_dose numeric not null default 1,
  dispensed_on date not null default current_date,
  runs_out_on date generated always as (dispensed_on + floor(quantity_dispensed / (doses_per_day * units_per_dose))::int) stored,
  alert_days_before int not null default 3,
  alerted_at timestamptz,
  refilled boolean not null default false
);
create index refills_patient on refills (patient_id);

create table drug_checks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  scanned_name text,
  nafdac_no text,
  result drug_check_result_t not null,
  checked_at timestamptz not null default now()
);

create table risk_scores (
  patient_id uuid primary key references profiles(id) on delete cascade,
  score int not null check (score between 0 and 100),
  band risk_band_t not null,
  updated_at timestamptz not null default now()
);
 then '+234' || regexp_replace(p, '\D', '', 'g')
    when regexp_replace(p, '\D', '', 'g') ~ '^234\d{10}
    else '+' || regexp_replace(p, '\D', '', 'g')
  end
$$;

-- ---------- hospitals and the people in them ----------
create table hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  brand_color text not null default '#1D4E89' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  address text,
  city text,
  state text,
  cac_no text,
  licence_url text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status hospital_status_t not null default 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger hospitals_updated before update on hospitals for each row execute function set_updated_at();

create table staff_roster (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  staff_id text not null,
  full_name text not null,
  role role_t not null check (role in ('hospital_admin', 'doctor', 'pharmacist', 'nurse')),
  phone text,
  email text,
  licence_body licence_body_t,
  licence_no text,
  created_at timestamptz not null default now(),
  unique (hospital_id, staff_id)
);
create index staff_roster_lookup on staff_roster (hospital_id, lower(staff_id));

create table patient_registry (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  hospital_number text not null,
  full_name text not null,
  phone text not null,
  age int check (age between 0 and 130),
  sex text check (sex in ('M', 'F', 'other')),
  language language_t not null default 'en',
  created_at timestamptz not null default now(),
  unique (hospital_id, hospital_number)
);
create index patient_registry_lookup on patient_registry (hospital_id, lower(hospital_number));

-- One row per auth user. hospital_id is null for independent patients and the platform admin.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_t not null,
  hospital_id uuid references hospitals(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  language language_t not null default 'en',
  licence_no text,
  licence_body licence_body_t,
  staff_id text,
  hospital_number text,
  verified_status verified_status_t not null default 'pending',
  failed_attempts int not null default 0,
  consent_at timestamptz,
  text_size text not null default 'normal' check (text_size in ('normal', 'large', 'larger')),
  speech_rate numeric not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_phone on profiles (phone) where phone is not null;
create unique index profiles_email on profiles (lower(email)) where email is not null;
create index profiles_hospital on profiles (hospital_id, role);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- ---------- Stage 1 verification plumbing ----------
-- Failed match attempts per (hospital, identifier). Three failures block the identifier
-- and raise an alert for the hospital admin (section 4, "Verification").
create table verification_attempts (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references hospitals(id) on delete cascade,
  identifier text not null,
  role role_t not null,
  failed_attempts int not null default 0,
  blocked_at timestamptz,
  last_attempt_at timestamptz not null default now(),
  unique (hospital_id, identifier, role)
);

-- A signup that matched the roster/registry and is waiting for its OTP.
create table signup_sessions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references hospitals(id) on delete cascade,
  role role_t not null,
  full_name text not null,
  phone text not null,
  email text,
  language language_t not null default 'en',
  staff_id text,
  hospital_number text,
  licence_body licence_body_t,
  licence_no text,
  roster_id uuid,
  registry_id uuid,
  consent_at timestamptz,
  status signup_status_t not null default 'pending_otp',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

-- One-time codes we send ourselves (SMS via Africa's Talking; fixed demo code in demo mode).
create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  purpose otp_purpose_t not null,
  code_hash text not null,
  signup_session_id uuid references signup_sessions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  attempts int not null default 0,
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_codes_target on otp_codes (target, purpose, created_at desc);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_table text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_target on audit_log (target_table, target_id);

-- ---------- reference data ----------
create table drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  strength text,
  form text,
  manufacturer text,
  nafdac_no text,
  nafdac_listed boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index drugs_nafdac on drugs (upper(nafdac_no));
create index drugs_name on drugs (lower(name));

create table interactions (
  id uuid primary key default gen_random_uuid(),
  drug_a text not null,
  drug_b text not null,
  severity text not null check (severity in ('minor', 'moderate', 'major', 'timing', 'caution')),
  note text not null
);

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  hours text,
  is_demo boolean not null default false
);

-- ---------- clinical records (all scoped by hospital_id) ----------
create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete set null,
  drug_id uuid references drugs(id),
  drug_name text not null,
  strength text,
  form text,
  dose text,
  frequency_per_day int not null default 1 check (frequency_per_day between 1 and 12),
  duration_days int,
  with_food with_food_t not null default 'any',
  instructions text,
  instructions_plain text,
  pill_shape pill_shape_t not null default 'round',
  pill_color text not null default '#FFFFFF',
  quantity_dispensed int,
  source prescription_source_t not null default 'staff',
  image_url text,
  confirmed_by_patient boolean not null default false,
  created_by uuid references profiles(id),
  active boolean not null default true,
  started_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prescriptions_patient on prescriptions (patient_id, active);
create index prescriptions_hospital on prescriptions (hospital_id);
create trigger prescriptions_updated before update on prescriptions for each row execute function set_updated_at();

create table reminders (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  time_of_day time not null,
  days int[] not null default '{0,1,2,3,4,5,6}',
  channel reminder_channel_t not null default 'app',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index reminders_patient on reminders (patient_id, active);

create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  status dose_status_t not null,
  logged_at timestamptz,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);
create index dose_logs_patient_time on dose_logs (patient_id, scheduled_at desc);

create table conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete set null,
  name text not null,
  noted_by uuid references profiles(id),
  started_on date
);
create index conditions_patient on conditions (patient_id);

create table allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  substance text not null,
  reaction text
);
create index allergies_patient on allergies (patient_id);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  transcript text,
  language language_t not null default 'en',
  mood text check (mood in ('good', 'okay', 'low')),
  side_effects jsonb not null default '[]'::jsonb,
  red_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index checkins_patient on checkins (patient_id, created_at desc);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete cascade,
  type alert_type_t not null,
  detail text,
  status alert_status_t not null default 'open',
  handled_by uuid references profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_hospital_open on alerts (hospital_id, status, created_at desc);

create table assistant_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  question text not null,
  answer text,
  language language_t not null default 'en',
  escalated boolean not null default false,
  cited_post_id uuid,
  created_at timestamptz not null default now()
);

create table forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  hospital_id uuid references hospitals(id) on delete set null,
  category forum_category_t not null,
  title text not null,
  body text not null,
  audio_url text,
  drug_tags text[] not null default '{}',
  language language_t not null default 'en',
  status forum_status_t not null default 'published',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index forum_posts_published on forum_posts (status, created_at desc);
alter table assistant_messages add constraint assistant_messages_post foreign key (cited_post_id) references forum_posts(id) on delete set null;

create table transfers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  from_hospital_id uuid not null references hospitals(id),
  to_hospital_id uuid not null references hospitals(id),
  scope jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  status transfer_status_t not null default 'requested',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger transfers_updated before update on transfers for each row execute function set_updated_at();

create table caregivers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text not null,
  language language_t not null default 'en',
  channel caregiver_channel_t not null default 'sms',
  notify_after_missed int not null default 1,
  consent_at timestamptz,
  active boolean not null default true
);
create index caregivers_patient on caregivers (patient_id);

create table caregiver_alerts (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references caregivers(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  dose_log_id uuid references dose_logs(id) on delete set null,
  sent_at timestamptz not null default now(),
  channel caregiver_channel_t not null default 'sms',
  status caregiver_alert_status_t not null default 'sent'
);

create table refills (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  quantity_dispensed int not null,
  doses_per_day int not null,
  units_per_dose numeric not null default 1,
  dispensed_on date not null default current_date,
  runs_out_on date generated always as (dispensed_on + floor(quantity_dispensed / (doses_per_day * units_per_dose))::int) stored,
  alert_days_before int not null default 3,
  alerted_at timestamptz,
  refilled boolean not null default false
);
create index refills_patient on refills (patient_id);

create table drug_checks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  scanned_name text,
  nafdac_no text,
  result drug_check_result_t not null,
  checked_at timestamptz not null default now()
);

create table risk_scores (
  patient_id uuid primary key references profiles(id) on delete cascade,
  score int not null check (score between 0 and 100),
  band risk_band_t not null,
  updated_at timestamptz not null default now()
);
 then '+' || regexp_replace(p, '\D', '', 'g')
    else '+' || regexp_replace(p, '\D', '', 'g')
  end
$$;

-- ---------- hospitals and the people in them ----------
create table hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  brand_color text not null default '#1D4E89' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  address text,
  city text,
  state text,
  cac_no text,
  licence_url text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status hospital_status_t not null default 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger hospitals_updated before update on hospitals for each row execute function set_updated_at();

create table staff_roster (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  staff_id text not null,
  full_name text not null,
  role role_t not null check (role in ('hospital_admin', 'doctor', 'pharmacist', 'nurse')),
  phone text,
  email text,
  licence_body licence_body_t,
  licence_no text,
  created_at timestamptz not null default now(),
  unique (hospital_id, staff_id)
);
create index staff_roster_lookup on staff_roster (hospital_id, lower(staff_id));

create table patient_registry (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  hospital_number text not null,
  full_name text not null,
  phone text not null,
  age int check (age between 0 and 130),
  sex text check (sex in ('M', 'F', 'other')),
  language language_t not null default 'en',
  created_at timestamptz not null default now(),
  unique (hospital_id, hospital_number)
);
create index patient_registry_lookup on patient_registry (hospital_id, lower(hospital_number));

-- One row per auth user. hospital_id is null for independent patients and the platform admin.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_t not null,
  hospital_id uuid references hospitals(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  language language_t not null default 'en',
  licence_no text,
  licence_body licence_body_t,
  staff_id text,
  hospital_number text,
  verified_status verified_status_t not null default 'pending',
  failed_attempts int not null default 0,
  consent_at timestamptz,
  text_size text not null default 'normal' check (text_size in ('normal', 'large', 'larger')),
  speech_rate numeric not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_phone on profiles (phone) where phone is not null;
create unique index profiles_email on profiles (lower(email)) where email is not null;
create index profiles_hospital on profiles (hospital_id, role);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- ---------- Stage 1 verification plumbing ----------
-- Failed match attempts per (hospital, identifier). Three failures block the identifier
-- and raise an alert for the hospital admin (section 4, "Verification").
create table verification_attempts (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references hospitals(id) on delete cascade,
  identifier text not null,
  role role_t not null,
  failed_attempts int not null default 0,
  blocked_at timestamptz,
  last_attempt_at timestamptz not null default now(),
  unique (hospital_id, identifier, role)
);

-- A signup that matched the roster/registry and is waiting for its OTP.
create table signup_sessions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references hospitals(id) on delete cascade,
  role role_t not null,
  full_name text not null,
  phone text not null,
  email text,
  language language_t not null default 'en',
  staff_id text,
  hospital_number text,
  licence_body licence_body_t,
  licence_no text,
  roster_id uuid,
  registry_id uuid,
  consent_at timestamptz,
  status signup_status_t not null default 'pending_otp',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

-- One-time codes we send ourselves (SMS via Africa's Talking; fixed demo code in demo mode).
create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  purpose otp_purpose_t not null,
  code_hash text not null,
  signup_session_id uuid references signup_sessions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  attempts int not null default 0,
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_codes_target on otp_codes (target, purpose, created_at desc);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_table text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_target on audit_log (target_table, target_id);

-- ---------- reference data ----------
create table drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  strength text,
  form text,
  manufacturer text,
  nafdac_no text,
  nafdac_listed boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index drugs_nafdac on drugs (upper(nafdac_no));
create index drugs_name on drugs (lower(name));

create table interactions (
  id uuid primary key default gen_random_uuid(),
  drug_a text not null,
  drug_b text not null,
  severity text not null check (severity in ('minor', 'moderate', 'major', 'timing', 'caution')),
  note text not null
);

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  hours text,
  is_demo boolean not null default false
);

-- ---------- clinical records (all scoped by hospital_id) ----------
create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete set null,
  drug_id uuid references drugs(id),
  drug_name text not null,
  strength text,
  form text,
  dose text,
  frequency_per_day int not null default 1 check (frequency_per_day between 1 and 12),
  duration_days int,
  with_food with_food_t not null default 'any',
  instructions text,
  instructions_plain text,
  pill_shape pill_shape_t not null default 'round',
  pill_color text not null default '#FFFFFF',
  quantity_dispensed int,
  source prescription_source_t not null default 'staff',
  image_url text,
  confirmed_by_patient boolean not null default false,
  created_by uuid references profiles(id),
  active boolean not null default true,
  started_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prescriptions_patient on prescriptions (patient_id, active);
create index prescriptions_hospital on prescriptions (hospital_id);
create trigger prescriptions_updated before update on prescriptions for each row execute function set_updated_at();

create table reminders (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  time_of_day time not null,
  days int[] not null default '{0,1,2,3,4,5,6}',
  channel reminder_channel_t not null default 'app',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index reminders_patient on reminders (patient_id, active);

create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  status dose_status_t not null,
  logged_at timestamptz,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);
create index dose_logs_patient_time on dose_logs (patient_id, scheduled_at desc);

create table conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete set null,
  name text not null,
  noted_by uuid references profiles(id),
  started_on date
);
create index conditions_patient on conditions (patient_id);

create table allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  substance text not null,
  reaction text
);
create index allergies_patient on allergies (patient_id);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  transcript text,
  language language_t not null default 'en',
  mood text check (mood in ('good', 'okay', 'low')),
  side_effects jsonb not null default '[]'::jsonb,
  red_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index checkins_patient on checkins (patient_id, created_at desc);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete cascade,
  type alert_type_t not null,
  detail text,
  status alert_status_t not null default 'open',
  handled_by uuid references profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_hospital_open on alerts (hospital_id, status, created_at desc);

create table assistant_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  question text not null,
  answer text,
  language language_t not null default 'en',
  escalated boolean not null default false,
  cited_post_id uuid,
  created_at timestamptz not null default now()
);

create table forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  hospital_id uuid references hospitals(id) on delete set null,
  category forum_category_t not null,
  title text not null,
  body text not null,
  audio_url text,
  drug_tags text[] not null default '{}',
  language language_t not null default 'en',
  status forum_status_t not null default 'published',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index forum_posts_published on forum_posts (status, created_at desc);
alter table assistant_messages add constraint assistant_messages_post foreign key (cited_post_id) references forum_posts(id) on delete set null;

create table transfers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  from_hospital_id uuid not null references hospitals(id),
  to_hospital_id uuid not null references hospitals(id),
  scope jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  status transfer_status_t not null default 'requested',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger transfers_updated before update on transfers for each row execute function set_updated_at();

create table caregivers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text not null,
  language language_t not null default 'en',
  channel caregiver_channel_t not null default 'sms',
  notify_after_missed int not null default 1,
  consent_at timestamptz,
  active boolean not null default true
);
create index caregivers_patient on caregivers (patient_id);

create table caregiver_alerts (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references caregivers(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  dose_log_id uuid references dose_logs(id) on delete set null,
  sent_at timestamptz not null default now(),
  channel caregiver_channel_t not null default 'sms',
  status caregiver_alert_status_t not null default 'sent'
);

create table refills (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  patient_id uuid not null references profiles(id) on delete cascade,
  quantity_dispensed int not null,
  doses_per_day int not null,
  units_per_dose numeric not null default 1,
  dispensed_on date not null default current_date,
  runs_out_on date generated always as (dispensed_on + floor(quantity_dispensed / (doses_per_day * units_per_dose))::int) stored,
  alert_days_before int not null default 3,
  alerted_at timestamptz,
  refilled boolean not null default false
);
create index refills_patient on refills (patient_id);

create table drug_checks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references profiles(id) on delete cascade,
  scanned_name text,
  nafdac_no text,
  result drug_check_result_t not null,
  checked_at timestamptz not null default now()
);

create table risk_scores (
  patient_id uuid primary key references profiles(id) on delete cascade,
  score int not null check (score between 0 and 100),
  band risk_band_t not null,
  updated_at timestamptz not null default now()
);
