-- Medisent AI — English only (owner decision, 2026-11-19).
-- Drops every language / locale column, the translation cache and the language enum, and
-- clears the audio cache (old clips were made in other languages and voices).

alter table profiles drop column if exists language;
alter table patient_registry drop column if exists language;
alter table signup_sessions drop column if exists language;
alter table checkins drop column if exists language;
alter table assistant_messages drop column if exists language;
alter table forum_posts drop column if exists language;
alter table caregivers drop column if exists language;
alter table audio_cache drop column if exists language;

drop table if exists translations;

-- verify_identity() returned the registry language; same function without it (0003 otherwise unchanged).
create or replace function verify_identity(
  p_hospital_id uuid,
  p_role role_t,
  p_identifier text,      -- staff_id or hospital_number
  p_full_name text,       -- staff only
  p_phone text            -- patient only
) returns jsonb
language plpgsql security definer set search_path = public as $
declare
  v_identifier text := lower(trim(coalesce(p_identifier, '')));
  v_attempt verification_attempts%rowtype;
  v_roster staff_roster%rowtype;
  v_registry patient_registry%rowtype;
  v_failed int;
  v_existing uuid;
begin
  if p_hospital_id is null or v_identifier = '' then
    return jsonb_build_object('result', 'rejected', 'failed_attempts', 0, 'reason', 'missing');
  end if;

  select * into v_attempt from verification_attempts
   where hospital_id = p_hospital_id and identifier = v_identifier and role = p_role;

  if found and v_attempt.blocked_at is not null then
    insert into audit_log (action, target_table, target_id, detail)
    values ('verification_blocked_retry', 'verification_attempts', v_attempt.id::text,
            jsonb_build_object('hospital_id', p_hospital_id, 'role', p_role, 'identifier', v_identifier));
    return jsonb_build_object('result', 'blocked', 'failed_attempts', v_attempt.failed_attempts);
  end if;

  if p_role = 'patient' then
    select * into v_registry from patient_registry
     where hospital_id = p_hospital_id
       and lower(hospital_number) = v_identifier
       and normalize_phone(phone) = normalize_phone(p_phone);
    if found then
      -- Already signed up with this registry row? Tell the caller so it can send them to login.
      select id into v_existing from profiles
       where hospital_id = p_hospital_id and role = 'patient' and lower(hospital_number) = v_identifier;
      insert into audit_log (action, target_table, target_id, detail)
      values ('verification_matched', 'patient_registry', v_registry.id::text,
              jsonb_build_object('hospital_id', p_hospital_id, 'role', p_role));
      return jsonb_build_object(
        'result', 'matched',
        'phone', normalize_phone(v_registry.phone),
        'full_name', v_registry.full_name,
        'registry_id', v_registry.id,
        'existing_profile_id', v_existing
      );
    end if;
  else
    select * into v_roster from staff_roster
     where hospital_id = p_hospital_id
       and lower(staff_id) = v_identifier
       and role = p_role
       and lower(trim(full_name)) = lower(trim(coalesce(p_full_name, '')));
    if found then
      select id into v_existing from profiles
       where hospital_id = p_hospital_id and lower(staff_id) = v_identifier;
      insert into audit_log (action, target_table, target_id, detail)
      values ('verification_matched', 'staff_roster', v_roster.id::text,
              jsonb_build_object('hospital_id', p_hospital_id, 'role', p_role));
      return jsonb_build_object(
        'result', 'matched',
        'phone', normalize_phone(v_roster.phone),
        'email', v_roster.email,
        'full_name', v_roster.full_name,
        'licence_body', v_roster.licence_body,
        'licence_no', v_roster.licence_no,
        'roster_id', v_roster.id,
        'existing_profile_id', v_existing
      );
    end if;
  end if;

  -- No match: count the failure.
  insert into verification_attempts (hospital_id, identifier, role, failed_attempts, last_attempt_at)
  values (p_hospital_id, v_identifier, p_role, 1, now())
  on conflict (hospital_id, identifier, role) do update
    set failed_attempts = verification_attempts.failed_attempts + 1, last_attempt_at = now()
  returning failed_attempts, id into v_failed, v_attempt.id;

  insert into audit_log (action, target_table, target_id, detail)
  values ('verification_rejected', 'verification_attempts', v_attempt.id::text,
          jsonb_build_object('hospital_id', p_hospital_id, 'role', p_role, 'identifier', v_identifier, 'failed_attempts', v_failed));

  if v_failed >= 3 then
    update verification_attempts set blocked_at = now() where id = v_attempt.id;
    insert into alerts (hospital_id, type, detail)
    values (p_hospital_id, 'verification_blocked',
            format('%s signup blocked after 3 failed matches for "%s"', p_role, v_identifier));
    insert into audit_log (action, target_table, target_id, detail)
    values ('verification_blocked', 'verification_attempts', v_attempt.id::text,
            jsonb_build_object('hospital_id', p_hospital_id, 'role', p_role, 'identifier', v_identifier));
    return jsonb_build_object('result', 'blocked', 'failed_attempts', v_failed);
  end if;

  return jsonb_build_object('result', 'rejected', 'failed_attempts', v_failed);
end $;


delete from audio_cache;

drop type if exists language_t;
