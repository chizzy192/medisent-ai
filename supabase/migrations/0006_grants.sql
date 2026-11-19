-- Medisent AI — table privileges for the API roles.
-- The project's tables were created without the usual Supabase default grants (the REST API
-- answered "permission denied for table hospitals" even for service_role). RLS (0002) still
-- decides which rows anon/authenticated can see; these grants only let the roles reach the
-- tables at all. Run after 0001–0005 and again if you add tables by hand.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- Keep the sensitive functions service-role only (0003 and 0005 revoke them; re-apply after the blanket grant).
revoke all on function verify_identity(uuid, role_t, text, text, text) from public, anon, authenticated;
revoke all on function otp_attempt(uuid, uuid, otp_purpose_t) from public, anon, authenticated;
revoke all on function otp_consume(uuid) from public, anon, authenticated;
revoke all on function expire_signup_sessions() from public, anon, authenticated;
revoke all on function reset_verification_block(uuid) from public, anon;

-- Browser roles never touch these tables directly (no RLS policies exist for them).
revoke all on table otp_codes, signup_sessions from anon, authenticated;

-- normalize_phone() gained the 10-digit form ("8031234567") after 0001 was first run; re-apply it.
create or replace function normalize_phone(p text) returns text language sql immutable as $$
  select case
    when p is null then null
    when regexp_replace(p, '\D', '', 'g') = '' then null
    when regexp_replace(p, '\D', '', 'g') ~ '^0\d{10}$' then '+234' || substr(regexp_replace(p, '\D', '', 'g'), 2)
    when regexp_replace(p, '\D', '', 'g') ~ '^[789]\d{9}$' then '+234' || regexp_replace(p, '\D', '', 'g')
    when regexp_replace(p, '\D', '', 'g') ~ '^234\d{10}$' then '+' || regexp_replace(p, '\D', '', 'g')
    else '+' || regexp_replace(p, '\D', '', 'g')
  end
$$;
