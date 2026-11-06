# AutoRadar panel

Panel AutoRadar na GitHub Pages: https://666dynamic.github.io/autoradar-panel/

Podstrony: Start, Auto1, Dania (Auto Midt), Wycena, Moje auta, Ogłoszenia.

Dane z nocy czyta z repozytorium `autoradar-migawka` (`https://666dynamic.github.io/autoradar-migawka/`):
- `data.json` (Auto1, ok. 6 MB): tylko Start, Auto1, Moje auta i Ogłoszenia;
- `szczegoly.json`: zdjęcia i wyposażenie, przy pierwszym otwarciu okna auta;
- `dania.json` i `dania/<VIN>/`: krok Danii.

Skaner i noc są w repozytorium `AutoRadar` (`docs/STATE.md`).

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
