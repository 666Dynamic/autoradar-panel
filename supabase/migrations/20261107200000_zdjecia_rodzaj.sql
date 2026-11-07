-- Zdjęcia w trzech grupach: od sprzedawcy, moje, szkody (zamiast jednego znacznika „szkoda”).
alter table public.zdjecia add column rodzaj text not null default 'moje' check (rodzaj in ('sprzedawca','moje','szkoda'));
update public.zdjecia set rodzaj = 'szkoda' where szkoda;
