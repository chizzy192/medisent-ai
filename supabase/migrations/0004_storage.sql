-- Medisent AI — storage buckets (BUILD_PLAN section 2). Stage 1 uses the first two.
-- Uploads happen from server actions with the service role; public read for logos only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('hospital-logos', 'hospital-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('hospital-licences', 'hospital-licences', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg']),
  ('label-photos', 'label-photos', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('audio-cache', 'audio-cache', false, 10485760, array['audio/mpeg', 'audio/wav', 'audio/ogg'])
on conflict (id) do nothing;

-- Logos: anyone can view (they sit in the header), nobody writes from the browser.
create policy logos_public_read on storage.objects for select
  using (bucket_id = 'hospital-logos');

-- Licences: platform admins review them; hospital admins may see their own (path = <hospital_id>/…).
create policy licences_platform_read on storage.objects for select
  using (bucket_id = 'hospital-licences' and auth_is_platform_admin());
create policy licences_admin_read on storage.objects for select
  using (bucket_id = 'hospital-licences' and auth_is_admin_of((split_part(name, '/', 1))::uuid));
