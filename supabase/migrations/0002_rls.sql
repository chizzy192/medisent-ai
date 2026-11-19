-- Medisent AI — Row Level Security (BUILD_PLAN section 4, "RLS"). Stage 1.
-- Server actions that must cross hospitals (signup matching, OTP, platform approval) use the
-- service role and check authorization in code; everything a signed-in browser can reach
-- goes through these policies.

-- ---------- helpers (security definer so they can read profiles without recursion) ----------
create or replace function auth_role() returns role_t
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_hospital_id() returns uuid
language sql stable security definer set search_path = public as $$
  select hospital_id from profiles where id = auth.uid()
$$;

create or replace function auth_is_verified() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select verified_status = 'verified' from profiles where id = auth.uid()), false)
$$;

-- Verified staff (doctor / pharmacist / nurse) or admin of the given hospital.
create or replace function auth_is_staff_of(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select verified_status = 'verified'
       and hospital_id = h
       and role in ('hospital_admin', 'doctor', 'pharmacist', 'nurse')
    from profiles where id = auth.uid()), false)
$$;

create or replace function auth_is_admin_of(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select verified_status = 'verified' and hospital_id = h and role = 'hospital_admin'
    from profiles where id = auth.uid()), false)
$$;

create or replace function auth_is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'platform_admin' from profiles where id = auth.uid()), false)
$$;

-- ---------- enable RLS everywhere ----------
alter table hospitals enable row level security;
alter table staff_roster enable row level security;
alter table patient_registry enable row level security;
alter table profiles enable row level security;
alter table verification_attempts enable row level security;
alter table signup_sessions enable row level security;
alter table otp_codes enable row level security;
alter table audit_log enable row level security;
alter table drugs enable row level security;
alter table interactions enable row level security;
alter table clinics enable row level security;
alter table prescriptions enable row level security;
alter table reminders enable row level security;
alter table dose_logs enable row level security;
alter table conditions enable row level security;
alter table allergies enable row level security;
alter table checkins enable row level security;
alter table alerts enable row level security;
alter table assistant_messages enable row level security;
alter table forum_posts enable row level security;
alter table transfers enable row level security;
alter table caregivers enable row level security;
alter table caregiver_alerts enable row level security;
alter table refills enable row level security;
alter table drug_checks enable row level security;
alter table risk_scores enable row level security;

-- ---------- hospitals ----------
-- Anyone (even signed out) can list approved hospitals: the signup dropdown needs them.
create policy hospitals_public_read on hospitals for select
  using (status = 'approved' or auth_is_platform_admin() or id = auth_hospital_id());
create policy hospitals_platform_write on hospitals for update
  using (auth_is_platform_admin()) with check (auth_is_platform_admin());
create policy hospitals_admin_update on hospitals for update
  using (auth_is_admin_of(id)) with check (auth_is_admin_of(id));

-- ---------- roster and registry: hospital admin manages; staff may read ----------
create policy roster_admin_all on staff_roster for all
  using (auth_is_admin_of(hospital_id)) with check (auth_is_admin_of(hospital_id));
create policy roster_staff_read on staff_roster for select
  using (auth_is_staff_of(hospital_id));
create policy registry_admin_all on patient_registry for all
  using (auth_is_admin_of(hospital_id)) with check (auth_is_admin_of(hospital_id));
create policy registry_staff_read on patient_registry for select
  using (auth_is_staff_of(hospital_id));

-- ---------- profiles ----------
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
-- Staff see the patients and colleagues of their hospital; admins see everyone there.
create policy profiles_hospital_read on profiles for select
  using (hospital_id is not null and auth_is_staff_of(hospital_id));
create policy profiles_admin_update on profiles for update
  using (hospital_id is not null and auth_is_admin_of(hospital_id))
  with check (hospital_id is not null and auth_is_admin_of(hospital_id));
create policy profiles_platform_read on profiles for select using (auth_is_platform_admin());

-- ---------- verification plumbing: service role only, except admins reading their blocks ----------
create policy attempts_admin_read on verification_attempts for select
  using (hospital_id is not null and auth_is_admin_of(hospital_id));
create policy attempts_admin_reset on verification_attempts for update
  using (hospital_id is not null and auth_is_admin_of(hospital_id))
  with check (hospital_id is not null and auth_is_admin_of(hospital_id));
-- signup_sessions and otp_codes: no browser policies (service role only).
create policy audit_admin_read on audit_log for select
  using (auth_is_platform_admin());

-- ---------- reference data: readable by every signed-in user ----------
create policy drugs_read on drugs for select using (auth.uid() is not null);
create policy interactions_read on interactions for select using (auth.uid() is not null);
create policy clinics_read on clinics for select using (true);

-- ---------- patient-owned rows; staff of the patient's hospital may read ----------
create policy prescriptions_patient on prescriptions for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy prescriptions_staff on prescriptions for all
  using (hospital_id is not null and auth_is_staff_of(hospital_id))
  with check (hospital_id is not null and auth_is_staff_of(hospital_id));

create policy reminders_patient on reminders for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy reminders_staff_read on reminders for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));

create policy dose_logs_patient on dose_logs for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy dose_logs_staff_read on dose_logs for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));

create policy conditions_patient_read on conditions for select using (patient_id = auth.uid());
create policy conditions_staff on conditions for all
  using (hospital_id is not null and auth_is_staff_of(hospital_id))
  with check (hospital_id is not null and auth_is_staff_of(hospital_id));

create policy allergies_patient on allergies for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy allergies_staff_read on allergies for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));

create policy checkins_patient on checkins for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy checkins_staff_read on checkins for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));

create policy alerts_patient_read on alerts for select using (patient_id = auth.uid());
create policy alerts_staff on alerts for all
  using (hospital_id is not null and auth_is_staff_of(hospital_id))
  with check (hospital_id is not null and auth_is_staff_of(hospital_id));

create policy assistant_patient on assistant_messages for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy assistant_staff_read on assistant_messages for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));

-- ---------- forum: anyone reads published; only verified clinicians write ----------
create policy forum_read_published on forum_posts for select
  using (status = 'published' or author_id = auth.uid());
create policy forum_clinician_insert on forum_posts for insert
  with check (
    author_id = auth.uid()
    and auth_is_verified()
    and auth_role() in ('doctor', 'pharmacist', 'nurse')
  );
create policy forum_author_update on forum_posts for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ---------- transfers: the patient and admins of both hospitals ----------
create policy transfers_patient on transfers for select using (patient_id = auth.uid());
create policy transfers_patient_insert on transfers for insert with check (patient_id = auth.uid());
create policy transfers_admins on transfers for all
  using (auth_is_admin_of(from_hospital_id) or auth_is_admin_of(to_hospital_id))
  with check (auth_is_admin_of(from_hospital_id) or auth_is_admin_of(to_hospital_id));

-- ---------- caregivers: managed by the patient; staff may view ----------
create policy caregivers_patient on caregivers for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy caregivers_staff_read on caregivers for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));
create policy caregiver_alerts_patient_read on caregiver_alerts for select using (patient_id = auth.uid());

create policy refills_patient on refills for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy refills_staff_read on refills for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));

create policy drug_checks_patient on drug_checks for all
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy risk_patient_read on risk_scores for select using (patient_id = auth.uid());
create policy risk_staff_read on risk_scores for select
  using (exists (select 1 from profiles p where p.id = patient_id and p.hospital_id is not null and auth_is_staff_of(p.hospital_id)));
