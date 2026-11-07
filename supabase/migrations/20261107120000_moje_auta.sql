-- Moje auta: teczka każdego kupionego auta. Dostęp tylko po zalogowaniu (wspólne konto panelu).
create table public.moje_auta (
  id uuid primary key default gen_random_uuid(),
  utworzono timestamptz not null default now(),
  zmieniono timestamptz not null default now(),
  status text not null default 'kupione' check (status in ('kupione','w_drodze','przygotowanie','na_sprzedaz','zarezerwowane','sprzedane')),
  nazwa text not null,
  rok int,
  vin text,
  przebieg_km int,
  zrodlo text not null default 'inne' check (zrodlo in ('auto1','dania','inne')),
  zrodlo_id text,
  link text,
  zakup_kwota numeric(12,2),
  zakup_waluta text not null default 'EUR' check (zakup_waluta in ('EUR','PLN')),
  zakup_data date,
  przyjazd_data date,
  wystawienie_kwota numeric(12,2),
  min_zysk_kwota numeric(12,2),
  sprzedaz_waluta text not null default 'PLN' check (sprzedaz_waluta in ('EUR','PLN')),
  sprzedaz_kwota numeric(12,2),
  sprzedaz_data date,
  notatka text not null default '',
  lista jsonb not null default '{}'::jsonb
);

create table public.koszty (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid not null references public.moje_auta(id) on delete cascade,
  utworzono timestamptz not null default now(),
  kategoria text not null check (kategoria in ('transport','naprawa','serwis','przygotowanie','przeglad','oplaty','inne')),
  opis text not null default '',
  kwota numeric(12,2) not null check (kwota >= 0),
  waluta text not null default 'PLN' check (waluta in ('EUR','PLN')),
  data date
);

create table public.zdjecia (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid not null references public.moje_auta(id) on delete cascade,
  utworzono timestamptz not null default now(),
  sciezka text not null unique,
  szkoda boolean not null default false,
  opis text not null default '',
  kolejnosc int not null default 0
);

create index on public.koszty (auto_id);
create index on public.zdjecia (auto_id);

create function public.ustaw_zmieniono() returns trigger language plpgsql as $$
begin new.zmieniono = now(); return new; end $$;
create trigger moje_auta_zmieniono before update on public.moje_auta for each row execute function public.ustaw_zmieniono();

alter table public.moje_auta enable row level security;
alter table public.koszty enable row level security;
alter table public.zdjecia enable row level security;
create policy "zalogowani" on public.moje_auta for all to authenticated using (true) with check (true);
create policy "zalogowani" on public.koszty for all to authenticated using (true) with check (true);
create policy "zalogowani" on public.zdjecia for all to authenticated using (true) with check (true);

-- Prywatny schowek na zdjęcia aut i szkód (do 10 MB na plik).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moje-auta', 'moje-auta', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']);
create policy "zalogowani czytaja" on storage.objects for select to authenticated using (bucket_id = 'moje-auta');
create policy "zalogowani wgrywaja" on storage.objects for insert to authenticated with check (bucket_id = 'moje-auta');
create policy "zalogowani zmieniaja" on storage.objects for update to authenticated using (bucket_id = 'moje-auta');
create policy "zalogowani usuwaja" on storage.objects for delete to authenticated using (bucket_id = 'moje-auta');
