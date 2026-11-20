-- Medisent AI — medication intake (owner change of approach, 2026-11-20).
-- The AI never decides a dose. A prescription is either dispensed by hospital staff
-- (source 'hospital', verified at once) or added by the patient from the pack photo
-- (source 'self', pending until a pharmacist or doctor approves, edits or rejects it).
-- The scanner reads printed fields only and matches them against verified prescriptions.

-- ---------- formulary ----------
alter table drugs add column if not exists barcode text;
create index if not exists drugs_name_idx on drugs (lower(name));
create index if not exists drugs_barcode_idx on drugs (barcode) where barcode is not null;

-- ---------- prescriptions: source, review status, photos, what the AI read ----------
create type prescription_status_t as enum ('pending', 'verified', 'edited', 'rejected');

-- source becomes plain text ('hospital' | 'self'); the old enum values are mapped.
alter table prescriptions alter column source drop default;
alter table prescriptions alter column source type text using (case source::text when 'staff' then 'hospital' when 'scan' then 'self' else source::text end);
alter table prescriptions alter column source set default 'hospital';
alter table prescriptions add constraint prescriptions_source_check check (source in ('hospital', 'self'));
drop type if exists prescription_source_t;

alter table prescriptions
  add column if not exists status prescription_status_t not null default 'pending',
  add column if not exists verified_by uuid references profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists pack_photo_path text,
  add column if not exists rx_photo_path text,
  add column if not exists ai_prefill jsonb,
  add column if not exists expiry_date date,
  add column if not exists batch_no text,
  add column if not exists patient_notified_at timestamptz;

-- Everything entered by staff so far was verified at entry.
update prescriptions set status = 'verified', verified_by = coalesce(verified_by, created_by), verified_at = coalesce(verified_at, created_at)
 where source = 'hospital' and status = 'pending';
-- Scans saved under the old flow are patient entries that nobody has checked yet: they stay 'pending'.

create index if not exists prescriptions_review_idx on prescriptions (hospital_id, status) where source = 'self';

-- ---------- who may verify: pharmacists and doctors of the patient's hospital ----------
create or replace function auth_is_prescriber_of(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select verified_status = 'verified'
       and hospital_id = h
       and role in ('doctor', 'pharmacist')
    from profiles where id = auth.uid()), false)
$$;

-- ---------- pack / prescription photos: private bucket, path = <patient_id>/<file> ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('med-photos', 'med-photos', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Uploads happen from server actions with the service role. Reads: the patient, and the
-- pharmacists / doctors of the patient's hospital (for the verification queue).
create policy med_photos_patient_read on storage.objects for select
  using (bucket_id = 'med-photos' and split_part(name, '/', 1) = auth.uid()::text);
create policy med_photos_prescriber_read on storage.objects for select
  using (bucket_id = 'med-photos' and exists (
    select 1 from profiles p
     where p.id::text = split_part(name, '/', 1) and p.hospital_id is not null and auth_is_prescriber_of(p.hospital_id)));

-- ---------- grants for the new objects ----------
grant execute on function auth_is_prescriber_of(uuid) to anon, authenticated, service_role;
