-- Medisent AI demo seed data (BUILD_PLAN section 7). Stage 1.
-- All data is fictional and labelled "Demo". No real patient data. Phones are in the unassigned
-- +234 800 000 0xxx range; licence numbers are fake. Safe to run more than once.
--
-- Demo accounts sign in with the fixed demo OTP (123456) when NEXT_PUBLIC_DEMO_MODE=true.
-- Platform admin: phone +2348000000001. Staff: the roster phones. Patients: the registry phones.

begin;
set client_min_messages = warning;
select setseed(0.42);
-- Every date in this file is the Lagos calendar date (the app's lagosDate()), not the server's UTC date.
create or replace function pg_temp.lagos_today() returns date language sql stable as $ select (now() at time zone 'Africa/Lagos')::date $;

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
  -- Test-only pharmacist: scripts/stage1-flow-test.mjs signs her up (never seeded as an account).
  ('a0000000-0000-4000-8000-000000000001', 'AH-PH-003', 'Amara Test-Pharmacist', 'pharmacist', 'PCN', 'DEMO-PCN-2004', '+2348000000107', 'amara@adaeze.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-AD-001', 'Kelechi Nnaji', 'hospital_admin', null, null, '+2348000000201', 'admin@ikenga.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-DR-001', 'Dr Funmilayo Ade', 'doctor', 'MDCN', 'DEMO-MDCN-1003', '+2348000000202', 'funmi@ikenga.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-PH-001', 'Ibrahim Musa', 'pharmacist', 'PCN', 'DEMO-PCN-2003', '+2348000000203', 'ibrahim@ikenga.demo'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-NU-001', 'Grace Udeh', 'nurse', 'NMCN', 'DEMO-NMCN-3002', '+2348000000204', 'grace@ikenga.demo')
on conflict (hospital_id, staff_id) do nothing;

-- ---------- patient registry (Emeka Nwosu is in both, for the transfer demo) ----------
insert into patient_registry (hospital_id, hospital_number, full_name, age, sex, phone) values
  ('a0000000-0000-4000-8000-000000000001', 'AH-0001', 'Emeka Nwosu', 67, 'M', '+2348000000301'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0002', 'Nkechi Okeke', 72, 'F', '+2348000000302'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0003', 'Musa Abdullahi', 45, 'M', '+2348000000303'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0004', 'Folake Adebayo', 34, 'F', '+2348000000304'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0005', 'Chukwudi Agu', 52, 'M', '+2348000000305'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0006', 'Aisha Lawal', 29, 'F', '+2348000000306'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0007', 'Ifeoma Chukwu', 24, 'F', '+2348000000307'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0008', 'Yusuf Ibrahim', 60, 'M', '+2348000000308'),
  ('a0000000-0000-4000-8000-000000000001', 'AH-0009', 'Bisi Ogunleye', 40, 'F', '+2348000000309'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-0001', 'Emeka Nwosu', 67, 'M', '+2348000000301'),
  ('a0000000-0000-4000-8000-000000000002', 'IM-0002', 'Obioma Nnadi', 55, 'M', '+2348000000310')
on conflict (hospital_id, hospital_number) do nothing;

-- ---------- demo accounts (auth.users + profiles) ----------
-- Patients have no email, so Supabase Auth gets a synthetic one (<digits>@patients.medisent.local);
-- the app signs everyone in with our own OTP and a server-side magic-link token.
create temp table seed_people (
  id uuid, role role_t, hospital_id uuid, full_name text, phone text, email text,
  staff_id text, hospital_number text, licence_body licence_body_t, licence_no text, adherence text
) on commit drop;

insert into seed_people values
  ('d0000000-0000-4000-8000-000000000001', 'platform_admin', null, 'Medisent Platform Admin (Demo)', '+2348000000001', 'platform@medisent.demo', null, null, null, null, null),
  -- Adaeze staff
  ('b0000000-0000-4000-8000-000000000101', 'hospital_admin', 'a0000000-0000-4000-8000-000000000001', 'Ngozi Eze', '+2348000000101', 'admin@adaeze.demo', 'AH-AD-001', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000102', 'doctor', 'a0000000-0000-4000-8000-000000000001', 'Dr Obinna Ugwu', '+2348000000102', 'obinna@adaeze.demo', 'AH-DR-001', null, 'MDCN', 'DEMO-MDCN-1001', null),
  ('b0000000-0000-4000-8000-000000000103', 'doctor', 'a0000000-0000-4000-8000-000000000001', 'Dr Amina Bello', '+2348000000103', 'amina@adaeze.demo', 'AH-DR-002', null, 'MDCN', 'DEMO-MDCN-1002', null),
  ('b0000000-0000-4000-8000-000000000104', 'pharmacist', 'a0000000-0000-4000-8000-000000000001', 'Chidinma Okafor', '+2348000000104', 'chidinma@adaeze.demo', 'AH-PH-001', null, 'PCN', 'DEMO-PCN-2001', null),
  ('b0000000-0000-4000-8000-000000000105', 'pharmacist', 'a0000000-0000-4000-8000-000000000001', 'Tunde Adeyemi', '+2348000000105', 'tunde@adaeze.demo', 'AH-PH-002', null, 'PCN', 'DEMO-PCN-2002', null),
  ('b0000000-0000-4000-8000-000000000106', 'nurse', 'a0000000-0000-4000-8000-000000000001', 'Blessing Okoro', '+2348000000106', 'blessing@adaeze.demo', 'AH-NU-001', null, 'NMCN', 'DEMO-NMCN-3001', null),
  -- Ikenga staff
  ('b0000000-0000-4000-8000-000000000201', 'hospital_admin', 'a0000000-0000-4000-8000-000000000002', 'Kelechi Nnaji', '+2348000000201', 'admin@ikenga.demo', 'IM-AD-001', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000202', 'doctor', 'a0000000-0000-4000-8000-000000000002', 'Dr Funmilayo Ade', '+2348000000202', 'funmi@ikenga.demo', 'IM-DR-001', null, 'MDCN', 'DEMO-MDCN-1003', null),
  ('b0000000-0000-4000-8000-000000000203', 'pharmacist', 'a0000000-0000-4000-8000-000000000002', 'Ibrahim Musa', '+2348000000203', 'ibrahim@ikenga.demo', 'IM-PH-001', null, 'PCN', 'DEMO-PCN-2003', null),
  ('b0000000-0000-4000-8000-000000000204', 'nurse', 'a0000000-0000-4000-8000-000000000002', 'Grace Udeh', '+2348000000204', 'grace@ikenga.demo', 'IM-NU-001', null, 'NMCN', 'DEMO-NMCN-3002', null),
  -- Patients (Emeka belongs to Adaeze until the Stage 4 transfer)
  ('c0000000-0000-4000-8000-000000000301', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Emeka Nwosu', '+2348000000301', '2348000000301@patients.medisent.local', null, 'AH-0001', null, null, 'medium'),
  ('c0000000-0000-4000-8000-000000000302', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Nkechi Okeke', '+2348000000302', '2348000000302@patients.medisent.local', null, 'AH-0002', null, null, 'high_risk'),
  ('c0000000-0000-4000-8000-000000000303', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Musa Abdullahi', '+2348000000303', '2348000000303@patients.medisent.local', null, 'AH-0003', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000304', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Folake Adebayo', '+2348000000304', '2348000000304@patients.medisent.local', null, 'AH-0004', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000305', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Chukwudi Agu', '+2348000000305', '2348000000305@patients.medisent.local', null, 'AH-0005', null, null, 'high_risk'),
  ('c0000000-0000-4000-8000-000000000306', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Aisha Lawal', '+2348000000306', '2348000000306@patients.medisent.local', null, 'AH-0006', null, null, 'medium'),
  ('c0000000-0000-4000-8000-000000000307', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Ifeoma Chukwu', '+2348000000307', '2348000000307@patients.medisent.local', null, 'AH-0007', null, null, 'medium'),
  ('c0000000-0000-4000-8000-000000000308', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Yusuf Ibrahim', '+2348000000308', '2348000000308@patients.medisent.local', null, 'AH-0008', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000309', 'patient', 'a0000000-0000-4000-8000-000000000001', 'Bisi Ogunleye', '+2348000000309', '2348000000309@patients.medisent.local', null, 'AH-0009', null, null, 'good'),
  ('c0000000-0000-4000-8000-000000000310', 'patient', 'a0000000-0000-4000-8000-000000000002', 'Obioma Nnadi', '+2348000000310', '2348000000310@patients.medisent.local', null, 'IM-0002', null, null, 'good');

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

insert into profiles (id, role, hospital_id, full_name, phone, email, staff_id, hospital_number, licence_body, licence_no, verified_status, consent_at)
select id, role, hospital_id, full_name, phone, email, staff_id, hospital_number, licence_body, licence_no, 'verified', now()
from seed_people
on conflict (id) do nothing;

-- ---------- formulary / demo registration list (drugs): ~40 common Nigerian medicines ----------
insert into drugs (id, name, generic_name, strength, form, manufacturer, nafdac_no, barcode, nafdac_listed, is_demo) values
  ('e0000000-0000-4000-8000-000000000001', 'Amlodipine', 'amlodipine', '5 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0001', '6150000000019', true, true),
  ('e0000000-0000-4000-8000-000000000002', 'Metformin', 'metformin', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0002', '6150000000026', true, true),
  ('e0000000-0000-4000-8000-000000000003', 'Metformin', 'metformin', '1000 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0003', '6150000000033', true, true),
  ('e0000000-0000-4000-8000-000000000004', 'Lisinopril', 'lisinopril', '10 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0004', '6150000000040', true, true),
  ('e0000000-0000-4000-8000-000000000005', 'Artemether-lumefantrine', 'artemether/lumefantrine', '80/480 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0005', '6150000000057', true, true),
  ('e0000000-0000-4000-8000-000000000006', 'Omeprazole', 'omeprazole', '20 mg', 'capsule', 'Demo Pharma Ltd', 'DEMO-A4-0006', '6150000000064', true, true),
  ('e0000000-0000-4000-8000-000000000007', 'Losartan', 'losartan', '50 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0007', '6150000000071', true, true),
  ('e0000000-0000-4000-8000-000000000008', 'Budesonide', 'budesonide', '200 mcg/dose', 'inhaler', 'Demo Pharma Ltd', 'DEMO-A4-0008', '6150000000088', true, true),
  ('e0000000-0000-4000-8000-000000000009', 'Salbutamol', 'salbutamol', '100 mcg/dose', 'inhaler', 'Demo Pharma Ltd', 'DEMO-A4-0009', '6150000000095', true, true),
  ('e0000000-0000-4000-8000-000000000010', 'Sertraline', 'sertraline', '50 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0010', '6150000000101', true, true),
  ('e0000000-0000-4000-8000-000000000011', 'Glibenclamide', 'glibenclamide', '5 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0011', '6150000000118', true, true),
  ('e0000000-0000-4000-8000-000000000012', 'Ciprofloxacin', 'ciprofloxacin', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0012', '6150000000125', true, true),
  ('e0000000-0000-4000-8000-000000000013', 'Paracetamol', 'paracetamol', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0013', '6150000000132', true, true),
  ('e0000000-0000-4000-8000-000000000014', 'Ibuprofen', 'ibuprofen', '400 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0014', '6150000000149', true, true),
  ('e0000000-0000-4000-8000-000000000015', 'Amoxicillin', 'amoxicillin', '500 mg', 'capsule', 'Demo Pharma Ltd', 'DEMO-A4-0015', '6150000000156', true, true),
  ('e0000000-0000-4000-8000-000000000016', 'Amoxicillin-clavulanate', 'amoxicillin/clavulanic acid', '625 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0016', '6150000000163', true, true),
  ('e0000000-0000-4000-8000-000000000017', 'Azithromycin', 'azithromycin', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0017', '6150000000170', true, true),
  ('e0000000-0000-4000-8000-000000000018', 'Metronidazole', 'metronidazole', '400 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0018', '6150000000187', true, true),
  ('e0000000-0000-4000-8000-000000000019', 'Doxycycline', 'doxycycline', '100 mg', 'capsule', 'Demo Pharma Ltd', 'DEMO-A4-0019', '6150000000194', true, true),
  ('e0000000-0000-4000-8000-000000000020', 'Cefuroxime', 'cefuroxime', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0020', '6150000000200', true, true),
  ('e0000000-0000-4000-8000-000000000021', 'Artesunate-amodiaquine', 'artesunate/amodiaquine', '100/270 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0021', '6150000000217', true, true),
  ('e0000000-0000-4000-8000-000000000022', 'Sulfadoxine-pyrimethamine', 'sulfadoxine/pyrimethamine', '500/25 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0022', '6150000000224', true, true),
  ('e0000000-0000-4000-8000-000000000023', 'Nifedipine', 'nifedipine', '20 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0023', '6150000000231', true, true),
  ('e0000000-0000-4000-8000-000000000024', 'Hydrochlorothiazide', 'hydrochlorothiazide', '25 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0024', '6150000000248', true, true),
  ('e0000000-0000-4000-8000-000000000025', 'Atenolol', 'atenolol', '50 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0025', '6150000000255', true, true),
  ('e0000000-0000-4000-8000-000000000026', 'Methyldopa', 'methyldopa', '250 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0026', '6150000000262', true, true),
  ('e0000000-0000-4000-8000-000000000027', 'Atorvastatin', 'atorvastatin', '20 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0027', '6150000000279', true, true),
  ('e0000000-0000-4000-8000-000000000028', 'Aspirin', 'aspirin', '75 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0028', '6150000000286', true, true),
  ('e0000000-0000-4000-8000-000000000029', 'Gliclazide', 'gliclazide', '80 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0029', '6150000000293', true, true),
  ('e0000000-0000-4000-8000-000000000030', 'Insulin (mixtard 30/70)', 'insulin human', '100 IU/ml', 'injection', 'Demo Pharma Ltd', 'DEMO-A4-0030', '6150000000309', true, true),
  ('e0000000-0000-4000-8000-000000000031', 'Diclofenac', 'diclofenac', '50 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0031', '6150000000316', true, true),
  ('e0000000-0000-4000-8000-000000000032', 'Chlorpheniramine', 'chlorpheniramine', '4 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0032', '6150000000323', true, true),
  ('e0000000-0000-4000-8000-000000000033', 'Loratadine', 'loratadine', '10 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0033', '6150000000330', true, true),
  ('e0000000-0000-4000-8000-000000000034', 'Prednisolone', 'prednisolone', '5 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0034', '6150000000347', true, true),
  ('e0000000-0000-4000-8000-000000000035', 'Ferrous sulphate', 'ferrous sulphate', '200 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0035', '6150000000354', true, true),
  ('e0000000-0000-4000-8000-000000000036', 'Folic acid', 'folic acid', '5 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0036', '6150000000361', true, true),
  ('e0000000-0000-4000-8000-000000000037', 'Vitamin C', 'ascorbic acid', '100 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0037', '6150000000378', true, true),
  ('e0000000-0000-4000-8000-000000000038', 'Zinc', 'zinc sulphate', '20 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0038', '6150000000385', true, true),
  ('e0000000-0000-4000-8000-000000000039', 'Oral rehydration salts', 'ORS', '20.5 g/sachet', 'sachet', 'Demo Pharma Ltd', 'DEMO-A4-0039', '6150000000392', true, true),
  ('e0000000-0000-4000-8000-000000000040', 'Amitriptyline', 'amitriptyline', '25 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0040', '6150000000408', true, true),
  ('e0000000-0000-4000-8000-000000000041', 'Fluoxetine', 'fluoxetine', '20 mg', 'capsule', 'Demo Pharma Ltd', 'DEMO-A4-0041', '6150000000415', true, true),
  ('e0000000-0000-4000-8000-000000000042', 'Paracetamol', 'paracetamol', '1 g', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0042', '6150000000422', true, true),
  ('e0000000-0000-4000-8000-000000000043', 'Salbutamol', 'salbutamol', '2 mg/5 ml', 'syrup', 'Demo Pharma Ltd', 'DEMO-A4-0043', '6150000000439', true, true),
  ('e0000000-0000-4000-8000-000000000044', 'Amoxicillin', 'amoxicillin', '125 mg/5 ml', 'suspension', 'Demo Pharma Ltd', 'DEMO-A4-0044', '6150000000446', true, true),
  ('e0000000-0000-4000-8000-000000000045', 'Warfarin', 'warfarin', '5 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0045', '6150000000453', true, true),
  ('e0000000-0000-4000-8000-000000000046', 'Simvastatin', 'simvastatin', '40 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0046', '6150000000460', true, true),
  ('e0000000-0000-4000-8000-000000000047', 'Spironolactone', 'spironolactone', '25 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0047', '6150000000477', true, true),
  ('e0000000-0000-4000-8000-000000000048', 'Clarithromycin', 'clarithromycin', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0048', '6150000000484', true, true),
  ('e0000000-0000-4000-8000-000000000049', 'Magnesium trisilicate (antacid)', 'antacid', '500 mg', 'tablet', 'Demo Pharma Ltd', 'DEMO-A4-0049', '6150000000491', true, true)
on conflict (id) do update set barcode = excluded.barcode, generic_name = excluded.generic_name;
-- Courses that must be finished: antibiotics and antimalarials.
update drugs set course_required = true where generic_name in ('amoxicillin', 'amoxicillin/clavulanic acid', 'azithromycin', 'metronidazole', 'doxycycline', 'cefuroxime', 'ciprofloxacin', 'clarithromycin', 'artemether/lumefantrine', 'artesunate/amodiaquine', 'sulfadoxine/pyrimethamine');
-- DEMO-X9-9999 is deliberately NOT in the list: scanning it shows the "not found" warning.

-- ---------- interactions (the ONLY source of interaction rules; the AI never invents one) ----------
delete from interactions;
insert into interactions (drug_a_generic, drug_b_generic, severity, message, advice) values
  ('warfarin', 'aspirin', 'major', 'Warfarin and aspirin together raise the chance of serious bleeding.', 'Do not take them together unless your doctor has planned it. Ask your pharmacist before your next dose.'),
  ('warfarin', 'nsaid', 'major', 'A painkiller like ibuprofen or diclofenac with warfarin can cause bleeding in the stomach.', 'Use paracetamol for pain instead, and ask your pharmacist.'),
  ('warfarin', 'ciprofloxacin', 'major', 'Ciprofloxacin makes warfarin stronger and can cause bleeding.', 'Your doctor may need to check your blood (INR). Ask before your next dose.'),
  ('warfarin', 'metronidazole', 'major', 'Metronidazole makes warfarin stronger and can cause bleeding.', 'Your doctor may need to check your blood (INR). Ask before your next dose.'),
  ('warfarin', 'clarithromycin', 'major', 'Clarithromycin makes warfarin stronger and can cause bleeding.', 'Ask your pharmacist before your next dose.'),
  ('warfarin', 'sulfadoxine/pyrimethamine', 'moderate', 'This malaria medicine can make warfarin stronger.', 'Tell your pharmacist; your blood may need checking.'),
  ('ace_inhibitor', 'potassium_sparing_diuretic', 'major', 'This blood pressure medicine with spironolactone can push potassium too high, which can stop the heart.', 'Do not take both unless your doctor planned it and checks your blood.'),
  ('arb', 'potassium_sparing_diuretic', 'major', 'This blood pressure medicine with spironolactone can push potassium too high.', 'Do not take both unless your doctor planned it and checks your blood.'),
  ('ace_inhibitor', 'nsaid', 'moderate', 'A painkiller like ibuprofen or diclofenac can weaken this blood pressure medicine and strain the kidneys.', 'Use paracetamol for pain instead. Ask your pharmacist.'),
  ('arb', 'nsaid', 'moderate', 'A painkiller like ibuprofen or diclofenac can weaken this blood pressure medicine and strain the kidneys.', 'Use paracetamol for pain instead. Ask your pharmacist.'),
  ('ciprofloxacin', 'antacid', 'moderate', 'Antacids stop ciprofloxacin from being absorbed, so it may not work.', 'Take ciprofloxacin at least 2 hours before or after the antacid.'),
  ('ciprofloxacin', 'iron', 'moderate', 'Iron tablets stop ciprofloxacin from being absorbed, so it may not work.', 'Take ciprofloxacin at least 2 hours before or after the iron.'),
  ('doxycycline', 'antacid', 'moderate', 'Antacids stop doxycycline from being absorbed, so it may not work.', 'Take doxycycline at least 2 hours before or after the antacid.'),
  ('doxycycline', 'iron', 'moderate', 'Iron tablets stop doxycycline from being absorbed.', 'Take doxycycline at least 2 hours before or after the iron.'),
  ('artemether/lumefantrine', 'halofantrine', 'major', 'These two malaria medicines together can cause a dangerous heart rhythm.', 'Do not take them together. Ask your pharmacist.'),
  ('artemether/lumefantrine', 'clarithromycin', 'major', 'Clarithromycin with this malaria medicine can cause a dangerous heart rhythm.', 'Do not take them together. Ask your pharmacist.'),
  ('artemether/lumefantrine', 'fluoxetine', 'moderate', 'Fluoxetine can raise the level of this malaria medicine.', 'Tell your pharmacist; they may change the timing.'),
  ('azithromycin', 'amitriptyline', 'moderate', 'Azithromycin with amitriptyline can affect the heart rhythm.', 'Tell your pharmacist before you start.'),
  ('clarithromycin', 'simvastatin', 'major', 'Clarithromycin raises simvastatin to a level that can damage muscles.', 'Stop the statin while on clarithromycin, or ask your pharmacist for another antibiotic.'),
  ('clarithromycin', 'atorvastatin', 'moderate', 'Clarithromycin raises atorvastatin and can cause muscle pain.', 'Tell your pharmacist; the statin dose may need a pause.'),
  ('amlodipine', 'simvastatin', 'moderate', 'Amlodipine raises simvastatin; a high statin dose can damage muscles.', 'Keep simvastatin at 20 mg or less with amlodipine. Ask your pharmacist.'),
  ('metformin', 'alcohol', 'moderate', 'Alcohol with metformin can lower blood sugar too much and strain the body.', 'Keep alcohol to a minimum, and never drink on an empty stomach.'),
  ('sildenafil', 'nitrate', 'major', 'Sildenafil with a nitrate (such as GTN or isosorbide) can drop blood pressure to a dangerous level.', 'Never take them together. Ask your pharmacist.'),
  ('glibenclamide', 'ciprofloxacin', 'moderate', 'Ciprofloxacin can make glibenclamide drop your sugar too low.', 'Watch for shaking, sweating or dizziness; keep sugar nearby. Tell your pharmacist.'),
  ('gliclazide', 'ciprofloxacin', 'moderate', 'Ciprofloxacin can make gliclazide drop your sugar too low.', 'Watch for shaking, sweating or dizziness; keep sugar nearby. Tell your pharmacist.'),
  ('sertraline', 'nsaid', 'moderate', 'Sertraline with a painkiller like ibuprofen raises the chance of stomach bleeding.', 'Use paracetamol for pain instead. Ask your pharmacist.'),
  ('aspirin', 'ibuprofen', 'moderate', 'Ibuprofen can stop low-dose aspirin from protecting the heart and adds stomach risk.', 'Use paracetamol for pain instead, or take ibuprofen 8 hours before the aspirin.'),
  ('prednisolone', 'nsaid', 'moderate', 'Prednisolone with a painkiller like ibuprofen raises the chance of a stomach ulcer.', 'Use paracetamol for pain instead. Ask your pharmacist.'),
  ('clarithromycin', 'statin', 'moderate', 'Clarithromycin raises statin levels and can cause muscle pain.', 'Tell your pharmacist; the statin may need a pause.');

-- ---------- conditions and allergies ----------
insert into conditions (patient_id, hospital_id, name, noted_by, started_on)
select p.id, p.hospital_id, c.name, 'b0000000-0000-4000-8000-000000000102', pg_temp.lagos_today() - 365
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
insert into prescriptions (id, patient_id, hospital_id, drug_id, drug_name, strength, form, dose, frequency_per_day, duration_days, with_food, instructions, instructions_plain, pill_shape, pill_color, quantity_dispensed, source, status, verified_by, verified_at, confirmed_by_patient, created_by, started_on) values
  ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Amlodipine', '5 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'round', '#E05A5A', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 60),
  ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'Metformin', '500 mg', 'tablet', '1 tablet', 2, null, 'after', '1 tab b.d. p.c.', 'Take one tablet after breakfast and one after dinner.', 'round', '#F2F2F2', 60, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 25),
  ('f0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004', 'Lisinopril', '10 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'oval', '#F2C94C', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 28),
  ('f0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000303', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', 'Artemether-lumefantrine', '80/480 mg', 'tablet', '1 tablet', 2, 3, 'after', '1 tab b.d. x 3/7 p.c.', 'Take one tablet after food, morning and evening, for three days.', 'oval', '#F2C94C', 6, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '2 days', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 2),
  ('f0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000304', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000006', 'Omeprazole', '20 mg', 'capsule', '1 capsule', 1, null, 'before', '1 cap o.d. a.c.', 'Take one capsule before breakfast.', 'capsule', '#7B61FF', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000102', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000102', pg_temp.lagos_today() - 20),
  ('f0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000305', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000007', 'Losartan', '50 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'round', '#FFFFFF', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000103', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000103', pg_temp.lagos_today() - 40),
  ('f0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000306', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000008', 'Budesonide', '200 mcg', 'inhaler', '2 puffs', 2, null, 'any', '2 puffs b.d.', 'Two puffs in the morning and two at night.', 'inhaler', '#8B5E3C', 200, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000102', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000102', pg_temp.lagos_today() - 45),
  ('f0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000306', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000009', 'Salbutamol', '100 mcg', 'inhaler', '2 puffs when needed', 1, null, 'any', '2 puffs p.r.n.', 'Two puffs when you feel short of breath.', 'inhaler', '#2F80ED', 200, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000102', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000102', pg_temp.lagos_today() - 45),
  ('f0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000307', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000010', 'Sertraline', '50 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d.', 'Take one tablet every morning.', 'round', '#F2F2F2', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000102', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000102', pg_temp.lagos_today() - 30),
  ('f0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'Metformin', '1000 mg', 'tablet', '1 tablet', 2, null, 'after', '1 tab b.d. p.c.', 'Take one tablet after breakfast and one after dinner.', 'oval', '#F2F2F2', 60, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000103', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000103', pg_temp.lagos_today() - 15),
  ('f0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000011', 'Glibenclamide', '5 mg', 'tablet', '1 tablet', 1, null, 'before', '1 tab o.d. a.c.', 'Take one tablet before breakfast.', 'round', '#6FCF97', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000103', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000103', pg_temp.lagos_today() - 15),
  ('f0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000309', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000012', 'Ciprofloxacin', '500 mg', 'tablet', '1 tablet', 2, 7, 'any', '1 tab b.d. x 7/7', 'Take one tablet morning and evening for seven days. Keep milk two hours away.', 'oval', '#F2F2F2', 14, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000105', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000105', pg_temp.lagos_today() - 2),
  -- Aisha: Amoxicillin course, day 3 of 5, on track (every dose taken; see the dose-log fix-up below).
  ('f0000000-0000-4000-8000-000000000014', 'c0000000-0000-4000-8000-000000000306', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000015', 'Amoxicillin', '500 mg', 'capsule', '1 capsule', 3, 5, 'after', '1 cap t.d.s. x 5/7 p.c.', 'Take 1 capsule 3 times a day, after food, for 5 days, at 08:00, 14:00, 20:00.', 'capsule', '#E05A5A', 15, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '2 days', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 2),
  -- Yusuf: warfarin + aspirin, the major interaction for the demo (alert seeded below).
  ('f0000000-0000-4000-8000-000000000015', 'c0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000045', 'Warfarin', '5 mg', 'tablet', '1 tablet', 1, null, 'any', '1 tab o.d. nocte', 'Take 1 tablet once a day, at 20:00.', 'round', '#F2C94C', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000103', now() - interval '10 days', false, 'b0000000-0000-4000-8000-000000000103', pg_temp.lagos_today() - 10),
  ('f0000000-0000-4000-8000-000000000016', 'c0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000028', 'Aspirin', '75 mg', 'tablet', '1 tablet', 1, null, 'after', '1 tab o.d. p.c.', 'Take 1 tablet once a day, after food, at 08:00.', 'round', '#FFFFFF', 30, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000103', now() - interval '3 days', false, 'b0000000-0000-4000-8000-000000000103', pg_temp.lagos_today() - 3),
  -- Finished courses for the "courses completed" figure (8 finished, 6 completed → 75%; dose-log fix-ups below).
  ('f0000000-0000-4000-8000-000000000018', 'c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000015', 'Amoxicillin', '500 mg', 'capsule', '1 capsule', 3, 5, 'after', '1 cap t.d.s. x 5/7', 'Take 1 capsule 3 times a day, after food, for 5 days.', 'capsule', '#E05A5A', 15, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '20 days', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 20),
  ('f0000000-0000-4000-8000-000000000019', 'c0000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', 'Artemether-lumefantrine', '80/480 mg', 'tablet', '1 tablet', 2, 3, 'after', '1 tab b.d. x 3/7', 'Take 1 tablet twice a day, after food, for 3 days.', 'oval', '#F2C94C', 6, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '15 days', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 15),
  ('f0000000-0000-4000-8000-000000000020', 'c0000000-0000-4000-8000-000000000304', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000018', 'Metronidazole', '400 mg', 'tablet', '1 tablet', 2, 5, 'after', '1 tab b.d. x 5/7', 'Take 1 tablet twice a day, after food, for 5 days.', 'round', '#FFFFFF', 10, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000105', now() - interval '25 days', false, 'b0000000-0000-4000-8000-000000000105', pg_temp.lagos_today() - 25),
  ('f0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000305', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000012', 'Ciprofloxacin', '500 mg', 'tablet', '1 tablet', 2, 5, 'any', '1 tab b.d. x 5/7', 'Take 1 tablet twice a day, for 5 days.', 'oval', '#F2F2F2', 10, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '18 days', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 18),
  ('f0000000-0000-4000-8000-000000000022', 'c0000000-0000-4000-8000-000000000309', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000021', 'Artesunate-amodiaquine', '100/270 mg', 'tablet', '1 tablet', 1, 3, 'after', '1 tab o.d. x 3/7', 'Take 1 tablet once a day, after food, for 3 days.', 'oval', '#F2C94C', 3, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000105', now() - interval '12 days', false, 'b0000000-0000-4000-8000-000000000105', pg_temp.lagos_today() - 12),
  ('f0000000-0000-4000-8000-000000000023', 'c0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000019', 'Doxycycline', '100 mg', 'capsule', '1 capsule', 1, 7, 'after', '1 cap o.d. x 7/7', 'Take 1 capsule once a day, after food, for 7 days.', 'capsule', '#F2C94C', 7, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000103', now() - interval '27 days', false, 'b0000000-0000-4000-8000-000000000103', pg_temp.lagos_today() - 27),
  ('f0000000-0000-4000-8000-000000000024', 'c0000000-0000-4000-8000-000000000306', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000017', 'Azithromycin', '500 mg', 'tablet', '1 tablet', 1, 3, 'any', '1 tab o.d. x 3/7', 'Take 1 tablet once a day, for 3 days.', 'oval', '#F2F2F2', 3, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '10 days', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 10),
  -- Ifeoma: a finished Azithromycin course, completed (for the "courses completed" figure).
  ('f0000000-0000-4000-8000-000000000017', 'c0000000-0000-4000-8000-000000000307', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000017', 'Azithromycin', '500 mg', 'tablet', '1 tablet', 1, 3, 'any', '1 tab o.d. x 3/7', 'Take 1 tablet once a day, for 3 days, at 08:00.', 'oval', '#F2F2F2', 3, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000104', now() - interval '6 days', false, 'b0000000-0000-4000-8000-000000000104', pg_temp.lagos_today() - 6),
  ('f0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-000000000310', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000013', 'Paracetamol', '1 g', 'tablet', '2 tablets', 3, null, 'any', '1 g t.d.s. p.r.n.', 'Two tablets up to three times a day when the pain is bad.', 'round', '#FFFFFF', 60, 'hospital', 'verified', 'b0000000-0000-4000-8000-000000000203', now() - interval '1 day', false, 'b0000000-0000-4000-8000-000000000203', pg_temp.lagos_today() - 30)
on conflict (id) do nothing;

update prescriptions p set course_required = true from drugs d where d.id = p.drug_id and d.course_required and p.duration_days is not null and p.id::text like 'f0000000-%';
-- Finished courses leave the patient's active list.
update prescriptions set active = false where id in ('f0000000-0000-4000-8000-000000000017', 'f0000000-0000-4000-8000-000000000018', 'f0000000-0000-4000-8000-000000000019', 'f0000000-0000-4000-8000-000000000020', 'f0000000-0000-4000-8000-000000000021', 'f0000000-0000-4000-8000-000000000022', 'f0000000-0000-4000-8000-000000000023', 'f0000000-0000-4000-8000-000000000024');

-- Patient entries waiting for a pharmacist (BUILD_PLAN "Verification queue"): what the reader saw is kept in ai_prefill.
insert into prescriptions (id, patient_id, hospital_id, drug_id, drug_name, strength, form, dose, frequency_per_day, duration_days, with_food, instructions, instructions_plain, pill_shape, pill_color, quantity_dispensed, source, status, confirmed_by_patient, created_by, nafdac_no, manufacturer, check_result, expiry_date, batch_no, ai_prefill, started_on) values
  ('f0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000304', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000015', 'Amoxicillin', '500 mg', 'capsule', '1 capsule', 3, 5, 'after', 'Pharmacist said one capsule three times a day after food for five days', 'Take 1 capsule 3 times a day, after food, for 5 days, at 08:00, 14:00, 20:00.', 'capsule', '#E05A5A', 15, 'self', 'pending', true, 'c0000000-0000-4000-8000-000000000304', 'DEMO-A4-0015', 'Demo Pharma Ltd', 'registered', pg_temp.lagos_today() + 400, 'B2026-07',
   '{"pack":{"drug_name":{"value":"Amoxicillin","confidence":0.96},"strength":{"value":"500 mg","confidence":0.93},"form":{"value":"capsule","confidence":0.9},"nafdac_no":{"value":"DEMO-A4-0015","confidence":0.88},"manufacturer":{"value":"Demo Pharma Ltd","confidence":0.85},"batch_no":{"value":"B2026-07","confidence":0.8},"expiry_date":{"value":"2027-12-31","confidence":0.82},"barcode":{"value":"6150000000156","confidence":0.7},"dosage":null,"confidence":0.9},"read_at":"2026-11-20T08:00:00Z"}'::jsonb, pg_temp.lagos_today()),
  ('f0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000305', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000013', 'Paracetamol', '500 mg', 'tablet', '2 tablets', 3, null, 'any', 'Two tablets when the headache is bad', 'Take 2 tablets 3 times a day, at 08:00, 14:00, 20:00.', 'round', '#FFFFFF', 24, 'self', 'pending', true, 'c0000000-0000-4000-8000-000000000305', 'DEMO-A4-0013', 'Demo Pharma Ltd', 'registered', pg_temp.lagos_today() + 300, 'PCM-4411',
   '{"pack":{"drug_name":{"value":"Paracetamol","confidence":0.97},"strength":{"value":"500 mg","confidence":0.95},"form":{"value":"tablet","confidence":0.92},"nafdac_no":{"value":"DEMO-A4-0013","confidence":0.9},"manufacturer":{"value":"Demo Pharma Ltd","confidence":0.86},"batch_no":{"value":"PCM-4411","confidence":0.75},"expiry_date":{"value":"2027-08-31","confidence":0.8},"barcode":{"value":null,"confidence":0},"dosage":null,"confidence":0.91},"read_at":"2026-11-20T09:30:00Z"}'::jsonb, pg_temp.lagos_today() - 1),
  ('f0000000-0000-4000-8000-000000000103', 'c0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000027', 'Atorvastatin', '20 mg', 'tablet', '1 tablet', 1, null, 'any', 'Doctor said one at night', 'Take 1 tablet once a day, at 21:00.', 'oval', '#F2F2F2', 30, 'self', 'pending', true, 'c0000000-0000-4000-8000-000000000301', 'DEMO-A4-0027', 'Demo Pharma Ltd', 'registered', pg_temp.lagos_today() + 500, 'ATV-0912',
   '{"pack":{"drug_name":{"value":"Atorvastatin","confidence":0.94},"strength":{"value":"20 mg","confidence":0.9},"form":{"value":"tablet","confidence":0.88},"nafdac_no":{"value":"DEMO-A4-0027","confidence":0.84},"manufacturer":{"value":"Demo Pharma Ltd","confidence":0.8},"batch_no":{"value":"ATV-0912","confidence":0.7},"expiry_date":{"value":"2028-03-31","confidence":0.78},"barcode":{"value":"6150000000279","confidence":0.65},"dosage":null,"confidence":0.87},"read_at":"2026-11-20T10:15:00Z"}'::jsonb, pg_temp.lagos_today() - 2)
on conflict (id) do nothing;

update prescriptions set course_required = true where id = 'f0000000-0000-4000-8000-000000000101';

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
where p.id::text like 'f0000000-%' and p.id <> 'f0000000-0000-4000-8000-000000000103'
  and not exists (select 1 from reminders r where r.prescription_id = p.id and r.time_of_day = t.tod);
insert into reminders (prescription_id, patient_id, time_of_day, channel)
select 'f0000000-0000-4000-8000-000000000103', 'c0000000-0000-4000-8000-000000000301', '21:00'::time, 'app'
where not exists (select 1 from reminders r where r.prescription_id = 'f0000000-0000-4000-8000-000000000103');

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
     where p.status in ('verified', 'edited')
  loop
    for d in reverse 29..0 loop
      sched := ((pg_temp.lagos_today() - d)::timestamp + r.time_of_day) at time zone 'Africa/Lagos';
      continue when sched > now();
      continue when (pg_temp.lagos_today() - d) < r.started_on;
      continue when r.duration_days is not null and (pg_temp.lagos_today() - d) >= r.started_on + r.duration_days;
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
-- Finish-your-course demo. Completed = finished with at most 1 missed dose (6 of the 8 finished courses):
update dose_logs set status = 'taken', logged_at = scheduled_at + interval '10 minutes'
 where reminder_id in (select id from reminders where prescription_id in (
   'f0000000-0000-4000-8000-000000000014', 'f0000000-0000-4000-8000-000000000017', 'f0000000-0000-4000-8000-000000000018', 'f0000000-0000-4000-8000-000000000020',
   'f0000000-0000-4000-8000-000000000022', 'f0000000-0000-4000-8000-000000000023', 'f0000000-0000-4000-8000-000000000024', 'f0000000-0000-4000-8000-000000000019', 'f0000000-0000-4000-8000-000000000021'));
-- One missed dose still counts as completed (Bisi, Yusuf); three missed does not (Nkechi, Chukwudi).
update dose_logs set status = 'missed', logged_at = null where id in (select dl.id from dose_logs dl join reminders r on r.id = dl.reminder_id where r.prescription_id = 'f0000000-0000-4000-8000-000000000022' order by dl.scheduled_at limit 1);
update dose_logs set status = 'missed', logged_at = null where id in (select dl.id from dose_logs dl join reminders r on r.id = dl.reminder_id where r.prescription_id = 'f0000000-0000-4000-8000-000000000023' order by dl.scheduled_at limit 1);
update dose_logs set status = 'missed', logged_at = null where id in (select dl.id from dose_logs dl join reminders r on r.id = dl.reminder_id where r.prescription_id = 'f0000000-0000-4000-8000-000000000019' order by dl.scheduled_at limit 3);
update dose_logs set status = 'missed', logged_at = null where id in (select dl.id from dose_logs dl join reminders r on r.id = dl.reminder_id where r.prescription_id = 'f0000000-0000-4000-8000-000000000021' order by dl.scheduled_at limit 3);
-- Musa missed the first two of his malaria course (at risk).
update dose_logs set status = 'missed', logged_at = scheduled_at + interval '3 hours'
 where id in (select dl.id from dose_logs dl join reminders r on r.id = dl.reminder_id
               where r.prescription_id = 'f0000000-0000-4000-8000-000000000004' order by dl.scheduled_at limit 2);

-- ---------- check-ins ----------
delete from checkins where patient_id in (select id from seed_people where role = 'patient');
insert into checkins (patient_id, transcript, mood, side_effects, created_at)
select sp.id, 'I am fine today.', case when random() < 0.7 then 'good' else 'okay' end, '[]'::jsonb,
       (pg_temp.lagos_today() - g.d)::timestamp + time '19:30'
from seed_people sp, generate_series(0, 13, 2) as g(d)
where sp.role = 'patient';
-- Ifeoma: low mood on 5 of the last 7 days.
update checkins set mood = 'low', transcript = 'I did not feel like getting up today.'
 where patient_id = 'c0000000-0000-4000-8000-000000000307' and created_at >= pg_temp.lagos_today() - 6;
insert into checkins (patient_id, transcript, mood, side_effects, created_at)
select 'c0000000-0000-4000-8000-000000000307', 'Still feeling low.', 'low', '[]'::jsonb, (pg_temp.lagos_today() - d)::timestamp + time '19:30'
from unnest(array[1, 3, 5]) as d
where not exists (select 1 from checkins c where c.patient_id = 'c0000000-0000-4000-8000-000000000307' and c.created_at::date = pg_temp.lagos_today() - d);
-- Chukwudi: dizziness twice this week.
insert into checkins (patient_id, transcript, mood, side_effects, created_at) values
  ('c0000000-0000-4000-8000-000000000305', 'I have been feeling dizzy since morning.', 'okay', '["dizziness"]'::jsonb, (pg_temp.lagos_today() - 1)::timestamp + time '10:15'),
  ('c0000000-0000-4000-8000-000000000305', 'The dizziness came back a little.', 'okay', '["dizziness"]'::jsonb, (pg_temp.lagos_today() - 4)::timestamp + time '09:40');

-- ---------- alerts the dashboards show on day one ----------
insert into alerts (patient_id, hospital_id, type, detail)
select * from (values
  ('c0000000-0000-4000-8000-000000000305'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'side_effect'::alert_type_t, 'Chukwudi Agu reported dizziness twice this week (losartan).'),
  ('c0000000-0000-4000-8000-000000000302'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'missed_doses'::alert_type_t, 'Nkechi Okeke missed most lisinopril doses in the last 3 days.'),
  ('c0000000-0000-4000-8000-000000000302'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'high_risk'::alert_type_t, 'Adherence risk high (78).'),
  ('c0000000-0000-4000-8000-000000000305'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'high_risk'::alert_type_t, 'Adherence risk high (74).'),
  ('c0000000-0000-4000-8000-000000000308'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'interaction'::alert_type_t, 'Major interaction: Aspirin with Warfarin. Warfarin and aspirin together raise the chance of serious bleeding.'),
  ('c0000000-0000-4000-8000-000000000303'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'course_at_risk'::alert_type_t, 'Course at risk: Musa Abdullahi has missed 2 doses of Artemether-lumefantrine 80/480 mg (day 3 of 3).')
) as v(patient_id, hospital_id, type, detail)
where not exists (select 1 from alerts a where a.patient_id = v.patient_id and a.type = v.type);
update alerts set prescription_id = 'f0000000-0000-4000-8000-000000000016' where type = 'interaction' and patient_id = 'c0000000-0000-4000-8000-000000000308' and prescription_id is null;
update alerts set prescription_id = 'f0000000-0000-4000-8000-000000000004' where type = 'course_at_risk' and patient_id = 'c0000000-0000-4000-8000-000000000303' and prescription_id is null;

-- ---------- risk scores ----------
insert into risk_scores (patient_id, score, band)
select id,
       case adherence when 'good' then 14 when 'medium' then 46 else 78 end,
       case adherence when 'good' then 'low'::risk_band_t when 'medium' then 'medium' else 'high' end
from seed_people where role = 'patient'
on conflict (patient_id) do update set score = excluded.score, band = excluded.band, updated_at = now();

-- ---------- caregivers (phones are replaced by DEMO_TEST_PHONE when the app sends in demo mode) ----------
insert into caregivers (patient_id, full_name, relationship, phone, channel, notify_after_missed, consent_at)
select * from (values
  ('c0000000-0000-4000-8000-000000000302'::uuid, 'Adaeze Okeke', 'Daughter', '+2348000000902', 'sms'::caregiver_channel_t, 1, now()),
  ('c0000000-0000-4000-8000-000000000301'::uuid, 'Chinedu Nwosu', 'Son', '+2348000000901', 'sms'::caregiver_channel_t, 2, now()),
  ('c0000000-0000-4000-8000-000000000305'::uuid, 'Ngozi Agu', 'Wife', '+2348000000905', 'sms'::caregiver_channel_t, 1, now())
) as v(patient_id, full_name, relationship, phone, channel, notify_after_missed, consent_at)
where not exists (select 1 from caregivers c where c.patient_id = v.patient_id and c.full_name = v.full_name);

-- ---------- refills ----------
insert into refills (prescription_id, patient_id, quantity_dispensed, doses_per_day, units_per_dose, dispensed_on)
select p.id, p.patient_id, p.quantity_dispensed, p.frequency_per_day,
       case when p.dose like '2 %' then 2 else 1 end,
       case p.id
         when 'f0000000-0000-4000-8000-000000000003' then pg_temp.lagos_today() - 28   -- Nkechi lisinopril: 2 days left
         when 'f0000000-0000-4000-8000-000000000002' then pg_temp.lagos_today() - 25   -- Emeka metformin: 5 days left
         else greatest(p.started_on, pg_temp.lagos_today() - 10) end
from prescriptions p
where p.id::text like 'f0000000-%' and p.quantity_dispensed is not null and p.status <> 'rejected'
  and not exists (select 1 from refills r where r.prescription_id = p.id);

-- ---------- forum posts (verified clinicians; all demo) ----------
insert into forum_posts (id, author_id, hospital_id, category, title, body, drug_tags, is_demo) values
  ('90000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000001', 'medication', 'Finish your full antibiotic course', 'Even when you feel better, keep taking the antibiotic until the last tablet. Stopping early lets the infection come back stronger. If you get a rash or cannot breathe well, stop and call your clinic.', '{antibiotics,ciprofloxacin,amoxicillin}', true),
  ('90000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000001', 'medication', 'What to do if you miss a dose', 'Take it as soon as you remember. If the next dose is close, skip the missed one. Never take two doses together to catch up. Tell your pharmacist if you miss doses often; the timing may need to change.', '{}', true),
  ('90000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'diet', 'Metformin: eat with your meals', 'Metformin can upset your stomach when taken on an empty stomach. Take it with or right after food. Drink water, and keep alcohol to a minimum.', '{metformin}', true),
  ('90000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000203', 'a0000000-0000-4000-8000-000000000002', 'diet', 'Ciprofloxacin: keep milk and antacids 2 hours away', 'Milk, yoghurt and antacids stop ciprofloxacin from working well. Take the tablet two hours before or after them, with a full glass of water.', '{ciprofloxacin}', true),
  ('90000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'diet', 'Blood pressure medicines and salt', 'Your tablets work better with less salt. Use less seasoning cubes and salted fish, and eat more vegetables. Check your blood pressure at the clinic every visit.', '{amlodipine,lisinopril,losartan}', true),
  ('90000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000001', 'medication', 'Painkillers and blood pressure medicines', 'Ibuprofen and similar painkillers can push your blood pressure up and strain your kidneys when you take lisinopril or losartan. Ask your pharmacist for a safer painkiller, such as paracetamol.', '{ibuprofen,lisinopril,losartan}', true),
  ('90000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000002', 'mental_health', 'Feeling low is not weakness: when to talk to someone', 'Feeling low for more than two weeks, losing interest in things you enjoyed, or sleeping badly are signs to talk to your doctor. It is common and it is treatable. If you think of hurting yourself, call for help now.', '{sertraline}', true),
  ('90000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000001', 'mental_health', 'Sleep, stress and your medicines', 'Poor sleep and stress make it easy to forget doses. Keep your tablets where you see them each morning, set your reminder, and tell your nurse if worry keeps you awake.', '{}', true)
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
