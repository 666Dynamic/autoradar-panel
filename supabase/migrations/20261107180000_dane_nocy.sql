-- Dane nocnego skanu (data.json.gz, szczegoly.json.gz, dania.json.gz, dania/<VIN>/*.jpg) w prywatnym schowku.
-- Wgrywa je tylko serwer kluczem serwisowym; zalogowany panel może je wyłącznie czytać.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dane', 'dane', false, 52428800, array['application/gzip', 'image/jpeg', 'application/octet-stream']);
create policy "zalogowani czytaja dane" on storage.objects for select to authenticated using (bucket_id = 'dane');
