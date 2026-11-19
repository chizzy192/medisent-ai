-- Medisent AI demo seed data (BUILD_PLAN section 7). Stage 1.
-- All data is fictional and labelled "Demo". No real patient data. Phones are in the unassigned
-- +234 800 000 0xxx range; licence numbers are fake. Safe to run more than once.
--
-- Demo accounts sign in with the fixed demo OTP (123456) when NEXT_PUBLIC_DEMO_MODE=true.
-- Platform admin: phone +2348000000001. Staff: the roster phones. Patients: the registry phones.

begin;
set client_min_messages = warning;
select setseed(0.42);

-- ---------- hospitals ----------
insert into hospitals (id, slug, name, city, state, brand_color, status, is_demo, address, contact_name, contact_phone, contact_email, reviewed_at)
values
  ('a0000000-0000-4000-8000-000000000001', 'adaeze', 'Adaeze Specialist Hospital (Demo)', 'Nsukka', 'Enugu', '#1D4E89', 'approved', true, '12 University Road, Nsukka', 'Ngozi Eze', '+2348000000101', 'admin@adaeze.demo', now()),
  ('a0000000-0000-4000-8000-000000000002', 'ikenga', 'Ikenga Medical Centre (Demo)', 'Enugu', 'Enugu', '#1E6B52', 'approved', true, '4 Ogui Road, Enugu', 'Kelechi Nnaji', '+2348000000201', 'admin@ikenga.demo', now())
on conflict (id) do nothing;

-- ---------- staff roster ----------
insert into staff_roster (hospital_id, staff_id, full_name, role, licence_body, licence_no, phone, email) values
  ('a0000000-0000-4000-8000-000000000001', 'AH-AD-001', 'Ngozi Eze', 'hospital_admin', null, null, '+2348000000101', 'admin@adaeze.demo'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-DR-001', 'Dr Obinna Ugwu', 'doctor', 'MDCN', 'DEMO-MDCN-1001', '+2348000000102', 'obinna@adaeze.demo'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-DR-002', 'Dr Amina Bello', 'doctor', 'MDCN', 'DEMO-MDCN-1002', '+2348000000103', 'amina@adaeze.demo'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-PH-001', 'Chidinma Okafor', 'pharmacist', 'PCN', 'DEMO-PCN-2001', '+2348000000104', 'chidinma@adaeze.demo'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-PH-002', 'Tunde Adeyemi', 'pharmacist', 'PCN', 'DEMO-PCN-2002', '+2348000000105', 'tunde@adaeze.demo'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-NU-001', 'Blessing Okoro', 'nurse', 'NMCN', 'DEMO-NMCN-3001', '+2348000000106', 'blessing@adaeze.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-AD-001', 'Kelechi Nnaji', 'hospital_admin', null, null, '+2348000000201', 'admin@ikenga.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-DR-001', 'Dr Funmilayo Ade', 'doctor', 'MDCN', 'DEMO-MDCN-1003', '+2348000000202', 'funmi@ikenga.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-PH-001', 'Ibrahim Musa', 'pharmacist', 'PCN', 'DEMO-PCN-2003', '+2348000000203', 'ibrahim@ikenga.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-NU-001', 'Grace Udeh', 'nurse', 'NMCN', 'DEMO-NMCN-3002', '+2348000000204', 'grace@ikenga.demo')
on conflict (hospital_id, staff_id) do nothing;

-- ---------- patient registry (Emeka Nwosu is in both, for the transfer demo) ----------
insert into patient_registry (hospital_id, hospital_number, full_name, age, sex, language, phone) values
  ('a0000000-0000-4000-8000-000000000001', 'AH-0001', 'Emeka Nwosu', 67, 'M', 'ig', '+2348000000301'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0002', 'Nkechi Okeke', 72, 'F', 'ig', '+2348000000302'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0003', 'Musa Abdullahi', 45, 'M', 'ha', '+2348000000303'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0004', 'Folake Adebayo', 34, 'F', 'yo', '+2348000000304'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0005', 'Chukwudi Agu', 52, 'M', 'pcm', '+2348000000305'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0006', 'Aisha Lawal', 29, 'F', 'ha', '+2348000000306'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0007', 'Ifeoma Chukwu', 24, 'F', 'en', '+2348000000307'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0008', 'Yusuf Ibrahim', 60, 'M', 'ha', '+2348000000308'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0009', 'Bisi Ogunleye', 40, 'F', 'yo', '+2348000000309'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-0001', 'Emeka Nwosu', 67, 'M', 'ig', '+2348000000301'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-0002', 'Obioma Nnadi', 55, 'M', 'ig', '+2348000000310')
on conflict (hospital_id, hospital_number) do nothing;

-- ---------- demo accounts (auth.users + profiles) ----------
-- Patients have no email, so Supabase Auth gets a synthetic one (<digits>@patients.medisent.local);
-- the app signs everyone in with our own OTP and a server-side magic-link token.
create temp table seed_people (
  id uuid, role role_t, hospital_id uuid, full_name text, phone text, email text, language language_t,
  staff_id text, hospital_number text, licence_body licence_body_t, licence_no text, adherence text
) on commit drop;

insert into seed_people values
  ('d0000000-0000-4000-8000-000000000001', 'platform_admin', null, 'Medisent Platform Admin (Demo)', '+2348000000001', 'platform@medisent.demo', 'en', null, null, null, null, null),
  -- Adaeze staff
  ('b0000000-0000-4000-8000-000000000101', 'hospital_admin', 'a0000000-0000-4000-8000-000000000001', 'Ngozi Eze', '+2348000000101', 'admin@adaeze.demo', 'ig', 'AH-AD-001', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000102', 'doctor', 'a0000000-0000-4000-8000-000000000001', 'Dr Obinna Ugwu', '+2348000000102', 'obinna@adaeze.demo', 'en', 'AH-DR-001', null, 'MDCN', 'DEMO-MDCN-1001', null),
  ('b0000000-0000-4000-8000-000000000103', 'doctor', 'a0000000-0000-4000-8000-000000000001', 'Dr Amina Bello', '+2348000000103', 'amina@adaeze.demo', 'ha', 'AH-DR-002', null, 'MDCN', 'DEMO-MDCN-1002', null),
  ('b0000000-0000-4000-8000-000000000104', 'pharmacist', 'a0000000-0000-4000-8000-000000000001', 'Chidinma Okafor', '+2348000000104', 'chidinma@adaeze.demo', 'ig', 'AH-PH-001', null, 'PCN', 'DEMO-PCN-2001', null),
  ('b0000000-0000-4000-8000-000000000105', 'pharmacist', 'a0000000-0000-4000-8000-000000000001', 'Tunde Adeyemi', '+2348000000105', 'tunde@adaeze.demo', 'yo', 'AH-PH-002', null, 'PCN', 'DEMO-PCN-2002', null),
  ('b0000000-0000-4000-8000-000000000106', 'nurse', 'a0000000-0000-4000-8000-000000000001', 'Blessing Okoro', '+2348000000106', 'blessing@adaeze.demo', 'en', 'AH-NU-001', null, 'NMCN', 'DEMO-NMCN-3001', null),
  -- Ikenga staff
  ('b0000000-0000-4000-8000-000000000201', 'hospital_admin', 'a0000000-0000-4000-8000-000000000002', 'Kelechi Nnaji', '+2348000000201', 'admin@ikenga.demo', 'ig', 'IM-AD-001', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000202', 'doctor', 'a0000000-0000-4000-8000-000000000002', 'Dr Funmilayo Ade', '+2348000000202', 'funmi@ikenga.demo', 'yo', 'IM-DR-001', null, 'MDCN', 'DEMO-MDCN-1003', null),
  ('b0000000-0000-4000-8000-000000000203', 'pharmacist', 'a0000000-0000-4000-8000-000000000002', 'Ibrahim Musa', '+2348000000203', 'ibrahim@ikenga.demo', 'ha', 'IM-PH-001', null, 'PCN', 'DEMO-PCN-2003', null),
  ('b0000000-0000-4000-8000-000000000204', 'nurse', 'a0000000-0000-4000-8000-000000000002', 'Grace Udeh', '+2348000000204', 'grace@ikenga.demo', 'en', 'IM-NU-001', null, 'NMCN', 'DEMO-NMCN-3002', null),
  -- Patients (Emeka belongs to Adaeze until the Stage 4 transfer)
  ('c0000000-0000-4000-8000-000000000301', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Emeka Nwosu', '+2348000000301', '2348000000301@patients.medisent.local', 'ig', null, 'AH-0001', null, null, 'medium'),
  ('c0000000-0000-4000-8000-000000000302', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Nkechi Okeke', '+2348000000302', '2348000000302@patients.medisent.local', 'ig', null, 'AH-0002', null, null, 'high_risk'),
  ('c0000000-0000-4000-8000-000000000303', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Musa Abdullahi', '+2348000000303', '2348000000303@patients.medisent.local', 'ha', null, 'AH-0003', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000304', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Folake Adebayo', '+2348000000304', '2348000000304@patients.medisent.local', 'yo', null, 'AH-0004', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000305', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Chukwudi Agu', '+2348000000305', '2348000000305@patients.medisent.local', 'pcm', null, 'AH-0005', null, null, 'high_risk'),
  ('c0000000-0000-4000-8000-000000000306', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Aisha Lawal', '+2348000000306', '2348000000306@patients.medisent.local', 'ha', null, 'AH-0006', null, null, 'medium'),
  ('c0000000-0000-4000-8000-000000000307', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Ifeoma Chukwu', '+2348000000307', '2348000000307@patients.medisent.local', 'en', null, 'AH-0007', null, null, 'medium'),
  ('c0000000-0000-4000-8000-000000000308', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Yusuf Ibrahim', '+2348000000308', '2348000000308@patients.medisent.local', 'ha', null, 'AH-0008', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000309', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Bisi Ogunleye', '+2348000000309', '2348000000309@patients.medisent.local', 'yo', null, 'AH-0009', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000310', 'patient', 'a0000000-0000-4000-8000-000000000002', 'Obioma Nnadi', '+2348000000310', '2348000000310@patients.medisent.local', 'ig', null, 'IM-0002', null, null, 'good');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, is_sso_user
)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
       crypt(gen_random_uuid()::text, gen_salt('bf')), now(), phone, now(),
       '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', full_name, 'is_demo', true), now(), now(),
       '', '', '', '', '', '', '', '', false
from seed_people
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       now(), now(), now()
from seed_people
where not exists (select 1 from auth.identities i where i.user_id = seed_people.id and i.provider = 'email');

insert into profiles (id, role, hospital_id, full_name, phone, email, language, staff_id, hospital_number, licence_body, licence_no, verified_status, consent_at)
select id, role, hospital_id, full_name, phone, email, language, staff_id, hospital_number, licence_body, licence_no, 'verified', now()
from seed_people
on conflict (id) do nothing;

-- ---------- demo registration list (drugs) ----------
insert into drugs (id, name, generic_name, strength, form, manufacturer, nafdac_no, nafdac_listed, is_demo) values
  ('e0000000-0000-4000-8000-000000000001', 'Amlodipine', 'amlodipine', '5 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0001', true, true),
  ('e0000000-0000-4000-8000-000000000002', 'Metformin', 'metformin', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0002', true, true),
  ('e0000000-0000-4000-8000-000000000003', 'Metformin', 'metformin', '1000 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0003', true, true),
  ('e0000000-0000-4000-8000-000000000004', 'Lisinopril', 'lisinopril', '10 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0004', true, true),
  ('e0000000-0000-4000-8000-000000000005', 'Artemether-lumefantrine', 'artemether/lumefantrine', '80/480 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0005', true, true),
  ('e0000000-0000-4000-8000-000000000006', 'Omeprazole', 'omeprazole', '20 mg', 'capsule', 'Demo Pharma Ltd', 'DEMO-A4-0006', true, true),
  ('e0000000-0000-4000-8000-000000000007', 'Losartan', 'losartan', '50 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0007', true, true),
  ('e0000000-0000-4000-8000-000000000008', 'Budesonide', 'budesonide', '200 mcg/dose', 'inhaler', 'Demo Pharma Ltd', 'DEMO-A4-0008', true, true),
  ('e0000000-0000-4000-8000-000000000009', 'Salbutamol', 'salbutamol', '100 mcg/dose', 'inhaler', 'Demo Pharma Ltd', 'DEMO-A4-0009', true, true),
  ('e0000000-0000-4000-8000-000000000010', 'Sertraline', 'sertraline', '50 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0010', true, true),
  ('e0000000-0000-4000-8000-000000000011', 'Glibenclamide', 'glibenclamide', '5 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0011', true, true),
  ('e0000000-0000-4000-8000-000000000012', 'Ciprofloxacin', 'ciprofloxacin', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0012', true, true),
  ('e0000000-0000-4000-8000-000000000013', 'Paracetamol', 'paracetamol', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0013', true, true),
  ('e0000000-0000-4000-8000-000000000014', 'Ibuprofen', 'ibuprofen', '400 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0014', true, true)
on conflict (id) do nothing;
-- DEMO-X9-9999 is deliberately NOT in the list: scanning it shows the "not found" warning.

-- ---------- interactions ----------
insert into interactions (drug_a, drug_b, severity, note)
select * from (values
  ('ibuprofen', 'lisinopril', 'moderate', 'Ibuprofen can reduce the blood-pressure effect of lisinopril and strain the kidneys. Ask your pharmacist before taking them together.'),
  ('ibuprofen', 'losartan', 'moderate', 'Ibuprofen can reduce the blood-pressure effect of losartan and strain the kidneys. Ask your pharmacist first.'),
  ('ciprofloxacin', 'antacids', 'timing', 'Take ciprofloxacin at least 2 hours before or after antacids.'),
  ('ciprofloxacin', 'dairy', 'timing', 'Keep milk and other dairy 2 hours away from ciprofloxacin.'),
  ('metformin', 'alcohol', 'caution', 'Alcohol with metformin can lower blood sugar too much. Keep alcohol to a minimum.')
) as v(a, b, s, n)
where not exists (select 1 from interactions i where i.drug_a = v.a and i.drug_b = v.b);

-- ---------- conditions and allergies ----------
insert into conditions (patient_id, hospital_id, name, noted_by, started_on)
select p.id, p.hospital_id, c.name, 'b0000000-0000-4000-8000-000000000102', current_date - 365
from seed_people p
join (values
  ('AH-0001', 'Hypertension'), ('AH-0001', 'Type 2 diabetes'),
  ('AH-0002', 'Hypertension'),
  ('AH-0003', 'Malaria'),
  ('AH-0004', 'Peptic ulcer'),
  ('AH-0005', 'Hypertension'),
  ('AH-0006', 'Asthma'),
  ('AH-0007', 'Depression'),
  ('AH-0008', 'Type 2 diabetes'),
  ('AH-0009', 'Typhoid'),
  ('IM-0002', 'Osteoarthritis')
) as c(hospital_number, name) on c.hospital_number = p.hospital_number
where not exists (select 1 from conditions x where x.patient_id = p.id and x.name = c.name);

insert into allergies (patient_id, substance, reaction)
select 'c0000000-0000-4000-8000-000000000309', 'Penicillin', 'Rash'
where not exists (select 1 from allergies where patient_id = 'c0000000-0000-4000-8000-000000000309');

-- ---------- prescriptions ----------
insert into prescriptions (id, patient_id, hospital_id, drug_id, drug_name, strength, form, dose, frequency_per_day, duration_days, with_food, instructions, instructions_plain, pill_shape, pill_color, quantity_dispensed, source, confirmed_by_patient, created_by, started_on) values
  ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Amlodipine', '5 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'round', '#E05A5A', 30, 'staff', true, 'b0000000-0000-4000-8000-000000000104', current_date - 60),
  ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'Metformin', '500 mg', 'tablet', '1 tablet', 2, null, 'after', '1 tab b.d. p.c.', 'Take one tablet after breakfast and one after dinner.', 'round', '#F2F2F2', 60, 'staff', true, 'b0000000-0000-4000-8000-000000000104', current_date - 25),
  ('f0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004', 'Lisinopril', '10 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'oval', '#F2C94C', 30, 'staff', true, 'b0000000-0000-4000-8000-000000000104', current_date - 28),
  ('f0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000303', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', 'Artemether-lumefantrine', '80/480 mg', 'tablet', '1 tablet', 2, 3, 'after', '1 tab b.d. x 3/7 p.c.', 'Take one tablet after food, morning and evening, for three days.', 'oval', '#F2C94C', 6, 'staff', true, 'b0000000-0000-4000-8000-000000000104', current_date - 1),
  ('f0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000304', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000006', 'Omeprazole', '20 mg', 'capsule', '1 capsule', 1, null, 'before', '1 cap o.d. a.c.', 'Take one capsule before breakfast.', 'capsule', '#7B61FF', 30, 'staff', true, 'b0000000-0000-4000-8000-000000000102', current_date - 20),
  ('f0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000305', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000007', 'Losartan', '50 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'round', '#FFFFFF', 30, 'staff', true, 'b0000000-0000-4000-8000-000000000103', current_date - 40),
  ('f0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000306', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000008', 'Budesonide', '200 mcg', 'inhaler', '2 puffs', 2, null, 'any', '2 puffs b.d.', 'Two puffs in the morning and two at night.', 'inhaler', '#8B5E3C', 200, 'staff', true, 'b0000000-0000-4000-8000-000000000102', current_date - 45),
  ('f0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000306', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000009', 'Salbutamol', '100 mcg', 'inhaler', '2 puffs when needed', 1, null, 'any', '2 puffs p.r.n.', 'Two puffs when you feel short of breath.', 'inhaler', '#2F80ED', 200, 'staff', true, 'b0000000-0000-4000-8000-000000000102', current_date - 45),
  ('f0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000307', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000010', 'Sertraline', '50 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'round', '#F2F2F2', 30, 'staff', true, 'b0000000-0000-4000-8000-000000000102', current_date - 30),
  ('f0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'Metformin', '1000 mg', 'tablet', '1 tablet', 2, null, 'after', '1 tab b.d. p.c.', 'Take one tablet after breakfast and one after dinner.', 'oval', '#F2F2F2', 60, 'staff', true, 'b0000000-0000-4000-8000-000000000103', current_date - 15),
  ('f0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000011', 'Glibenclamide', '5 mg', 'tablet', '1 tablet', 1, null, 'before', '1 tab o.d. a.c.', 'Take one tablet before breakfast.', 'round', '#6FCF97', 30, 'staff', true, 'b0000000-0000-4000-8000-000000000103', current_date - 15),
  ('f0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000309', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000012', 'Ciprofloxacin', '500 mg', 'tablet', '1 tablet', 2, 7, 'any', '1 tab b.d. x 7/7', 'Take one tablet morning and evening for seven days. Keep milk two hours away.', 'oval', '#F2F2F2', 14, 'staff', true, 'b0000000-0000-4000-8000-000000000105', current_date - 2),
  ('f0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-000000000310', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000013', 'Paracetamol', '1 g', 'tablet', '2 tablets', 3, null, 'any', '1 g t.d.s. p.r.n.', 'Two tablets up to three times a day when the pain is bad.', 'round', '#FFFFFF', 60, 'staff', true, 'b0000000-0000-4000-8000-000000000203', current_date - 30)
on conflict (id) do nothing;

-- ---------- reminders: 1/day 08:00 · 2/day 08:00 + 20:00 · 3/day 08:00 + 14:00 + 20:00 ----------
insert into reminders (prescription_id, patient_id, time_of_day, channel)
select p.id, p.patient_id, t.tod, 'app'
from prescriptions p
join lateral (
  select unnest(case p.frequency_per_day
    when 1 then array['08:00'::time]
    when 2 then array['08:00'::time, '20:00'::time]
    else array['08:00'::time, '14:00'::time, '20:00'::time] end) as tod
) t on true
where p.id::text like 'f0000000-%'
  and not exists (select 1 from reminders r where r.prescription_id = p.id and r.time_of_day = t.tod);

-- ---------- 30 days of dose logs, by adherence profile ----------
-- good = 95% on time · medium = 80% taken, 10% late, 10% missed
-- high_risk = 60% taken, 15% late, 25% missed; last 3 days mostly missed.
delete from dose_logs where patient_id in (select id from seed_people where role = 'patient');
do $$
declare
  r record;
  d int;
  sched timestamptz;
  roll double precision;
  st dose_status_t;
begin
  for r in
    select rm.id as reminder_id, rm.patient_id, rm.time_of_day, p.started_on, p.duration_days, sp.adherence
      from reminders rm
      join prescriptions p on p.id = rm.prescription_id
      join seed_people sp on sp.id = rm.patient_id
  loop
    for d in reverse 29..0 loop
      sched := ((current_date - d)::timestamp + r.time_of_day) at time zone 'Africa/Lagos';
      continue when sched > now();
      continue when (current_date - d) < r.started_on;
      continue when r.duration_days is not null and (current_date - d) >= r.started_on + r.duration_days;
      roll := random();
      if r.adherence = 'good' then
        st := case when roll < 0.95 then 'taken' when roll < 0.98 then 'late' else 'missed' end;
      elsif r.adherence = 'medium' then
        st := case when roll < 0.80 then 'taken' when roll < 0.90 then 'late' else 'missed' end;
      else
        if d <= 2 then
          st := case when roll < 0.80 then 'missed' else 'late' end;
        else
          st := case when roll < 0.60 then 'taken' when roll < 0.75 then 'late' else 'missed' end;
        end if;
      end if;
      insert into dose_logs (reminder_id, patient_id, scheduled_at, status, logged_at)
      values (r.reminder_id, r.patient_id, sched, st,
              case st when 'taken' then sched + interval '12 minutes'
                      when 'late' then sched + interval '2 hours 40 minutes'
                      else null end);
    end loop;
  end loop;
end $$;

-- ---------- check-ins ----------
delete from checkins where patient_id in (select id from seed_people where role = 'patient');
insert into checkins (patient_id, transcript, language, mood, side_effects, created_at)
select sp.id, 'I am fine today.', sp.language, case when random() < 0.7 then 'good' else 'okay' end, '[]'::jsonb,
       (current_date - g.d)::timestamp + time '19:30'
from seed_people sp, generate_series(0, 13, 2) as g(d)
where sp.role = 'patient';
-- Ifeoma: low mood on 5 of the last 7 days.
update checkins set mood = 'low', transcript = 'I did not feel like getting up today.'
 where patient_id = 'c0000000-0000-4000-8000-000000000307' and created_at >= current_date - 6;
insert into checkins (patient_id, transcript, language, mood, side_effects, created_at)
select 'c0000000-0000-4000-8000-000000000307', 'Still feeling low.', 'en', 'low', '[]'::jsonb, (current_date - d)::timestamp + time '19:30'
from unnest(array[1, 3, 5]) as d
where not exists (select 1 from checkins c where c.patient_id = 'c0000000-0000-4000-8000-000000000307' and c.created_at::date = current_date - d);
-- Chukwudi: dizziness twice this week (Pidgin check-in).
insert into checkins (patient_id, transcript, language, mood, side_effects, created_at) values
  ('c0000000-0000-4000-8000-000000000305', 'I dey feel dizzy since morning.', 'pcm', 'okay', '["dizziness"]'::jsonb, (current_date - 1)::timestamp + time '10:15'),
  ('c0000000-0000-4000-8000-000000000305', 'The dizziness come back small.', 'pcm', 'okay', '["dizziness"]'::jsonb, (current_date - 4)::timestamp + time '09:40');

-- ---------- alerts the dashboards show on day one ----------
insert into alerts (patient_id, hospital_id, type, detail)
select * from (values
  ('c0000000-0000-4000-8000-000000000305'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'side_effect'::alert_type_t, 'Chukwudi Agu reported dizziness twice this week (losartan).'),
  ('c0000000-0000-4000-8000-000000000302'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'missed_doses'::alert_type_t, 'Nkechi Okeke missed most lisinopril doses in the last 3 days.'),
  ('c0000000-0000-4000-8000-000000000302'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'high_risk'::alert_type_t, 'Adherence risk high (78).'),
  ('c0000000-0000-4000-8000-000000000305'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'high_risk'::alert_type_t, 'Adherence risk high (74).')
) as v(patient_id, hospital_id, type, detail)
where not exists (select 1 from alerts a where a.patient_id = v.patient_id and a.type = v.type);

-- ---------- risk scores ----------
insert into risk_scores (patient_id, score, band)
select id,
       case adherence when 'good' then 14 when 'medium' then 46 else 78 end,
       case adherence when 'good' then 'low'::risk_band_t when 'medium' then 'medium' else 'high' end
from seed_people where role = 'patient'
on conflict (patient_id) do update set score = excluded.score, band = excluded.band, updated_at = now();

-- ---------- caregivers (phones are replaced by DEMO_TEST_PHONE when the app sends in demo mode) ----------
insert into caregivers (patient_id, full_name, relationship, phone, language, channel, notify_after_missed, consent_at)
select * from (values
  ('c0000000-0000-4000-8000-000000000302'::uuid, 'Adaeze Okeke', 'Daughter', '+2348000000902', 'ig'::language_t, 'sms'::caregiver_channel_t, 1, now()),
  ('c0000000-0000-4000-8000-000000000301'::uuid, 'Chinedu Nwosu', 'Son', '+2348000000901', 'ig'::language_t, 'sms'::caregiver_channel_t, 2, now()),
  ('c0000000-0000-4000-8000-000000000305'::uuid, 'Ngozi Agu', 'Wife', '+2348000000905', 'pcm'::language_t, 'sms'::caregiver_channel_t, 1, now())
) as v(patient_id, full_name, relationship, phone, language, channel, notify_after_missed, consent_at)
where not exists (select 1 from caregivers c where c.patient_id = v.patient_id and c.full_name = v.full_name);

-- ---------- refills ----------
insert into refills (prescription_id, patient_id, quantity_dispensed, doses_per_day, units_per_dose, dispensed_on)
select p.id, p.patient_id, p.quantity_dispensed, p.frequency_per_day,
       case when p.dose like '2 %' then 2 else 1 end,
       case p.id
         when 'f0000000-0000-4000-8000-000000000003' then current_date - 28   -- Nkechi lisinopril: 2 days left
         when 'f0000000-0000-4000-8000-000000000002' then current_date - 25   -- Emeka metformin: 5 days left
         else greatest(p.started_on, current_date - 10) end
from prescriptions p
where p.id::text like 'f0000000-%' and p.quantity_dispensed is not null
  and not exists (select 1 from refills r where r.prescription_id = p.id);

-- ---------- forum posts (verified clinicians; all demo) ----------
insert into forum_posts (id, author_id, hospital_id, category, title, body, drug_tags, language, is_demo) values
  ('90000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000001', 'medication', 'Finish your full antibiotic course', 'Even when you feel better, keep taking the antibiotic until the last tablet. Stopping early lets the infection come back stronger. If you get a rash or cannot breathe well, stop and call your clinic.', '{antibiotics,ciprofloxacin,amoxicillin}', 'en', true),
  ('90000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000001', 'medication', 'What to do if you miss a dose', 'Take it as soon as you remember. If the next dose is close, skip the missed one. Never take two doses together to catch up. Tell your pharmacist if you miss doses often; the timing may need to change.', '{}', 'en', true),
  ('90000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'diet', 'Metformin: eat with your meals', 'Metformin can upset your stomach when taken on an empty stomach. Take it with or right after food. Drink water, and keep alcohol to a minimum.', '{metformin}', 'en', true),
  ('90000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000203', 'a0000000-0000-4000-8000-000000000002', 'diet', 'Ciprofloxacin: keep milk and antacids 2 hours away', 'Milk, yoghurt and antacids stop ciprofloxacin from working well. Take the tablet two hours before or after them, with a full glass of water.', '{ciprofloxacin}', 'en', true),
  ('90000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'diet', 'Blood pressure medicines and salt', 'Your tablets work better with less salt. Use less seasoning cubes and salted fish, and eat more vegetables. Check your blood pressure at the clinic every visit.', '{amlodipine,lisinopril,losartan}', 'en', true),
  ('90000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000001', 'medication', 'Painkillers and blood pressure medicines', 'Ibuprofen and similar painkillers can push your blood pressure up and strain your kidneys when you take lisinopril or losartan. Ask your pharmacist for a safer painkiller, such as paracetamol.', '{ibuprofen,lisinopril,losartan}', 'en', true),
  ('90000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000002', 'mental_health', 'Feeling low is not weakness: when to talk to someone', 'Feeling low for more than two weeks, losing interest in things you enjoyed, or sleeping badly are signs to talk to your doctor. It is common and it is treatable. If you think of hurting yourself, call for help now.', '{sertraline}', 'en', true),
  ('90000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000001', 'mental_health', 'Sleep, stress and your medicines', 'Poor sleep and stress make it easy to forget doses. Keep your tablets where you see them each morning, set your reminder, and tell your nurse if worry keeps you awake.', '{}', 'en', true)
on conflict (id) do nothing;

-- ---------- clinics (both hospitals + three invented demo clinics) ----------
insert into clinics (id, name, address, lat, lng, phone, hours, is_demo) values
  ('91000000-0000-4000-8000-000000000001', 'Adaeze Specialist Hospital (Demo)', '12 University Road, Nsukka', 6.8567, 7.3958, '+2348000000100', '24 hours', true),
  ('91000000-0000-4000-8000-000000000002', 'Ikenga Medical Centre (Demo)', '4 Ogui Road, Enugu', 6.4402, 7.4940, '+2348000000200', '24 hours', true),
  ('91000000-0000-4000-8000-000000000003', 'Demo clinic — Nsukka Town', '3 Enugu Road, Nsukka', 6.8600, 7.3900, '+2348000000401', '08:00–18:00', true),
  ('91000000-0000-4000-8000-000000000004', 'Demo clinic — Obollo Road', '21 Obollo Road, Nsukka', 6.8650, 7.4010, '+2348000000402', '08:00–20:00', true),
  ('91000000-0000-4000-8000-000000000005', 'Demo clinic — New Haven, Enugu', '15 New Haven Avenue, Enugu', 6.4530, 7.5050, '+2348000000403', '24 hours', true)
on conflict (id) do nothing;

commit;
