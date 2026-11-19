-- Medisent AI — atomic OTP checks (Stage 1 hardening).
-- The attempt counter and the "used" flag move in single statements so two concurrent
-- confirmations cannot both pass or both burn a code. Service role only.

-- Count one attempt on the newest live code for this owner and return it (or nothing).
create or replace function otp_attempt(p_profile_id uuid, p_session_id uuid, p_purpose otp_purpose_t)
returns otp_codes
language plpgsql security definer set search_path = public as $$
declare v otp_codes;
begin
  update otp_codes o
     set attempts = o.attempts + 1
   where o.id = (
     select id from otp_codes
      where purpose = p_purpose
        and used_at is null
        and ((p_profile_id is not null and profile_id = p_profile_id)
          or (p_session_id is not null and signup_session_id = p_session_id))
      order by created_at desc
      limit 1)
     and o.used_at is null
     and o.attempts < 5
     and o.expires_at > now()
  returning o.* into v;
  return v;
end $$;

-- Mark a code used exactly once; returns true only for the caller that got it.
create or replace function otp_consume(p_id uuid) returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update otp_codes set used_at = now()
     where id = p_id and used_at is null
    returning id
  ) select exists (select 1 from u)
$$;

revoke all on function otp_attempt(uuid, uuid, otp_purpose_t) from public, anon, authenticated;
revoke all on function otp_consume(uuid) from public, anon, authenticated;
