-- Medisent AI — verification function (BUILD_PLAN section 4, "Verification"). Stage 1.
-- Called by the signup server action with the service role. Every attempt is audited.
--
-- Staff:   staff_id + role + full_name (case-insensitive) must match staff_roster.
-- Patient: hospital_number + phone must match patient_registry.
-- Match  -> 'matched' with the phone on file (the OTP goes there, never to a typed number).
-- Miss   -> 'rejected', failed_attempts + 1. Third miss -> 'blocked' + alert for the admin.

create or replace function verify_identity(
  p_hospital_id uuid,
  p_role role_t,
  p_identifier text,      -- staff_id or hospital_number
  p_full_name text,       -- staff only
  p_phone text            -- patient only
) returns jsonb
language plpgsql security definer set search_path = public as $$
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
        'language', v_registry.language,
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
end $$;

revoke all on function verify_identity(uuid, role_t, text, text, text) from public, anon, authenticated;

-- Hospital admin: lift a block (after checking the person at the records desk).
create or replace function reset_verification_block(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_hospital uuid;
begin
  select hospital_id into v_hospital from verification_attempts where id = p_attempt_id;
  if v_hospital is null or not auth_is_admin_of(v_hospital) then
    raise exception 'not allowed';
  end if;
  update verification_attempts set failed_attempts = 0, blocked_at = null where id = p_attempt_id;
  insert into audit_log (actor_id, action, target_table, target_id)
  values (auth.uid(), 'verification_unblocked', 'verification_attempts', p_attempt_id::text);
end $$;

-- Housekeeping: expire stale signup sessions and codes (call from a cron later).
create or replace function expire_signup_sessions() returns int
language sql security definer set search_path = public as $$
  with e as (
    update signup_sessions set status = 'expired'
     where status = 'pending_otp' and expires_at < now()
    returning 1
  ) select count(*)::int from e
$$;

revoke all on function reset_verification_block(uuid) from public, anon;
revoke all on function expire_signup_sessions() from public, anon, authenticated;
