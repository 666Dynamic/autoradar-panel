-- Moje auta według makiety „Dodaj auto” (3 kroki: Dane, Stan, Zdjęcia), zatwierdzonej przez właściciela 10.11.2026.
-- Nowe pola auta; jedna waluta na całe auto (zakup_waluta); szkody i lakier w aucie; zdjęcia w grupach Sprzedawca / Moje / Inne.
alter table public.moje_auta
  add column marka text,
  add column model text,
  add column rej_miesiac int check (rej_miesiac between 1 and 12),
  add column rej_rok int,
  add column paliwo text,
  add column skrzynia text,
  add column moc_km int,
  add column wlasciciele text,
  add column transport_kwota numeric(12,2),
  add column ogloszenie text,
  add column lakier text not null default '',
  add column szkody jsonb not null default '[]'::jsonb;

-- Skąd auto: Auto1, inna aukcja, handlarz / komis, prywatnie, inne (dania zostaje dla aut z Danii).
alter table public.moje_auta drop constraint moje_auta_zrodlo_check;
alter table public.moje_auta add constraint moje_auta_zrodlo_check
  check (zrodlo in ('auto1','inna_aukcja','handlarz','prywatnie','inne','dania'));

-- Koszty z poprzedniej wersji: transport do pola „Transport”, reszta jako szkody (opis + kwota).
-- Liczone tylko w walucie auta; tabela koszty zostaje bez zmian jako zapis historyczny.
update public.moje_auta a set transport_kwota = k.suma
from (select auto_id, sum(kwota) suma from public.koszty k join public.moje_auta m on m.id = k.auto_id
      where k.kategoria = 'transport' and k.waluta = m.zakup_waluta group by auto_id) k
where a.id = k.auto_id;
update public.moje_auta a set szkody = k.lista
from (select auto_id, jsonb_agg(jsonb_build_object('opis', trim(both ' ' from k.kategoria || case when k.opis <> '' then ': ' || k.opis else '' end), 'kwota', k.kwota) order by k.utworzono) lista
      from public.koszty k join public.moje_auta m on m.id = k.auto_id
      where k.kategoria <> 'transport' and k.waluta = m.zakup_waluta group by auto_id) k
where a.id = k.auto_id;
update public.moje_auta set sprzedaz_waluta = zakup_waluta where sprzedaz_waluta <> zakup_waluta and wystawienie_kwota is null and sprzedaz_kwota is null;

-- Zdjęcia: grupa „Szkody” staje się „Inne”.
alter table public.zdjecia drop constraint zdjecia_rodzaj_check;
update public.zdjecia set rodzaj = 'inne' where rodzaj = 'szkoda';
alter table public.zdjecia add constraint zdjecia_rodzaj_check check (rodzaj in ('sprzedawca','moje','inne'));
