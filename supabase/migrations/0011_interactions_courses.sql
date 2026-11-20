-- Medisent AI — drug interaction warnings and finish-your-course tracking (2026-11-20).

-- ---------- interactions: rules come from this table only; the AI never invents one ----------
-- Rebuilt: generic-name pairs, major | moderate, a plain-English message and the advice.
delete from interactions;
alter table interactions drop constraint if exists interactions_severity_check;
alter table interactions rename column drug_a to drug_a_generic;
alter table interactions rename column drug_b to drug_b_generic;
alter table interactions rename column note to message;
alter table interactions add column if not exists advice text not null default '';
alter table interactions add constraint interactions_severity_check check (severity in ('major', 'moderate'));
create unique index if not exists interactions_pair_idx on interactions (lower(drug_a_generic), lower(drug_b_generic));

-- ---------- formulary: which medicines are a course that must be finished ----------
alter table drugs add column if not exists course_required boolean not null default false;

-- ---------- prescriptions: course flag copied at save time, interaction review, stopped early ----------
alter table prescriptions
  add column if not exists course_required boolean not null default false,
  add column if not exists interaction_reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists interaction_reviewed_at timestamptz,
  add column if not exists stopped_early_at timestamptz;

update prescriptions p set course_required = true
  from drugs d where d.id = p.drug_id and d.course_required and p.duration_days is not null;

-- ---------- alerts ----------
alter table alerts add column if not exists prescription_id uuid references prescriptions(id) on delete set null;
alter type alert_type_t add value if not exists 'course_at_risk';
alter type alert_type_t add value if not exists 'course_stopped';
create index if not exists alerts_open_type_idx on alerts (hospital_id, type) where status = 'open';
