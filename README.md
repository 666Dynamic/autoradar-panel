# AutoRadar panel

Panel AutoRadar na GitHub Pages: https://666dynamic.github.io/autoradar-panel/

Podstrony: Start, Auto1, Dania (Auto Midt), Wycena, Moje auta, Ogłoszenia.

Dane z nocy czyta z repozytorium `autoradar-migawka` (`https://666dynamic.github.io/autoradar-migawka/`):
- `data.json` (Auto1, ok. 6 MB): tylko Start, Auto1, Moje auta i Ogłoszenia;
- `szczegoly.json`: zdjęcia i wyposażenie, przy pierwszym otwarciu okna auta;
- `dania.json` i `dania/<VIN>/`: krok Danii.

Skaner i noc są w repozytorium `AutoRadar` (`docs/STATE.md`).

## Logowanie i Moje auta (Supabase)

Cały panel jest za jednym wspólnym hasłem (konto `panel@autoradar.app` w projekcie Supabase `autoradar`, Frankfurt, darmowy plan).
- Hasło ustawia albo zmienia właściciel: `sh skrypty/ustaw-haslo.sh` (wpisuje je w terminalu, nikt inny go nie widzi). Zakładanie nowych kont jest wyłączone.
- Moje auta: tabele `moje_auta` (z szkodami i transportem), `zdjecia` (oraz stara `koszty` tylko do odczytu historii) i prywatny schowek `moje-auta` (zdjęcia zmniejszane w przeglądarce do 2000 px). Schemat: `supabase/migrations/`. Bez zalogowania baza nic nie zwraca (RLS).
- Klucz w `src/lib/supabase.ts` jest publiczny z założenia; klucz serwisowy i hasło bazy nigdy nie trafiają do repo.
- Dane nocy (`autoradar-migawka`) są na razie publiczne; przeniesienie ich za hasło to następny krok.
- Darmowy projekt usypia się po 7 dniach bez ruchu: `.github/workflows/supabase-ping.yml` pinguje go codziennie.
- Kopia na T7: `python3 skrypty/kopia-moje-auta.py <folder>` (wołana przez `tools/kopia-na-t7.sh` w repo AutoRadar).
- Zmiana schematu: nowy plik w `supabase/migrations/`, potem `npx supabase db push`.

## Praca

```bash
npm ci
npm run dev    # podgląd na http://localhost:5179/autoradar-panel/
npm test       # testy funkcji z src/lib i test na dzisiejszych danych
npm run lint
npm run build
```

Podgląd czyta lokalną kopię danych z `public/test-dane/` (`.env.local`: `VITE_DANE=http://localhost:5179/autoradar-panel/test-dane/data.json`). Kopię odśwież z migawki: `data.json`, `szczegoly.json`, `dania.json`. Katalog jest wyłączony z gita.

Test „prawdziwe dane” bierze `public/test-dane/`, a gdy jej nie ma (GitHub Actions), pobiera pliki z migawki. Test sprawdza:
- polskie nazwy paliw, skrzyń i aukcji;
- różnicę = Otomoto − cena;
- powód braku porównania;
- link mobile.de dla każdego porównanego auta z Danii.

Nowy kod z nocy bez tłumaczenia zatrzymuje publikację.

## Publikacja

Push na `main` uruchamia `.github/workflows/pages.yml`: lint → testy → build → GitHub Pages. Przed pushem sprawdź zmianę w podglądzie na komputerze i telefonie.

## Kod

Dodanie podstrony:
1. plik w `src/pages/`;
2. wpis w `src/components/app-sidebar.tsx` (`STRONY`);
3. leniwy import i warunek w `src/App.tsx`.

Dania używa tej samej tabeli i okna co Auto1 (`src/pages/auto1.tsx`, `src/components/okno-auta.tsx`): bez osobnych komponentów.

| Plik | Co zawiera |
| --- | --- |
| `src/lib/auta.ts` | etykiety (paliwo, skrzynia, aukcje, kolory, powody), wyszukiwanie, sortowanie |
| `src/lib/dania.ts` | `dania.json` → ten sam kształt co Auto1 |
| `src/lib/mobile.ts` | link mobile.de; numery modeli z `mobile-modele.json` i `DODATKOWE` (`www.mobile.de/consumer/next/api/model-options/<marka>`) |
| `src/lib/ostrzezenia.ts` | „1 oferta”, „skrzynia?” |
| `src/lib/paczka.ts` | ZIP ze zdjęciami i Excel |
| `src/lib/ogloszenia.ts` | wzory postów |

### Moje auta: jak działa okno auta (od 10.11, makieta zatwierdzona przez właściciela)
Plik `src/components/okno-mojego-auta.tsx`. Jedno okno na „Dodaj auto” i na edycję, w trzech krokach. „Zapisz” jest na każdym kroku; zamknięcie z niezapisanymi zmianami pyta „Zapisać zmiany?”.
- **1. Dane:**
  - Skąd auto: Auto1 / Inna aukcja / Handlarz / komis / Prywatnie / Inne. Przy Auto1 pole „Numer Auto1” wypełnia dane z nocnego skanu.
  - VIN rozpoznawany za darmo, bez serwisów (`src/lib/vin.ts`): marka zawsze, model i rocznik dla grupy VW, model dla Mercedesa. Gdy kod pasuje do dwóch modeli, są przyciski wyboru.
  - Marka i model z listy z wyszukiwaniem (`src/lib/marki.ts`), reszta z list. Moc i przebieg wpisuje się cyframi, kropki dochodzą same.
  - Daty: wpis „8.11” albo kalendarz z wyborem miesiąca i roku.
  - Ceny w jednej walucie auta (przełącznik €/zł), z groszami: zakup, transport, razem, Rynek (średnia najtańszych ofert ze skanu i link do Otomoto), cena, za którą chcę sprzedać, link do ogłoszenia.
- **2. Stan:** szkody (opis, kwota, opcjonalne zdjęcie), lakier, notatki.
- **3. Zdjęcia:** grupy Sprzedawca / Moje / Inne, dowolna liczba. Kliknięcie powiększa. „Edytuj”: przeciąganie zmienia kolejność, × usuwa, lista pod zdjęciem zmienia grupę. Nowe auto zapisuje się samo przy pierwszym zdjęciu.
- **Kosz** w stopce usuwa auto ze zdjęciami (z potwierdzeniem).
- Okno ofert otwarte z „Rynku” nie ma „Kupiłem” (`bezZakupu`), żeby nie dodać auta drugi raz.
- Migracja `20261110120000_dodaj_auto_3_kroki.sql`: stare koszty przeszły do „Transport” i do szkód (tylko w walucie auta); tabela `koszty` zostaje jako zapis historyczny.
