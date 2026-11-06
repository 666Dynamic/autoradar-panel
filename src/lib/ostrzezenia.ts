import type { Auto } from "@/lib/dane"

// Wynik, któremu nie warto ufać bez sprawdzenia (audyt 06.11): kwalifikujące się auto ze średnią z jednej oferty Otomoto
// (np. hybryda plug-in z mocą samego silnika spalinowego) albo auto z Danii, którego skrzynia jest przyjęta z domysłu.
export const OPIS_OSTRZEZEN: Record<string, string> = {
  "1 oferta": "średnia z jednej oferty Otomoto: sprawdź ręcznie, czy to ten sam rynek (np. moc hybrydy)",
  "skrzynia?": "wersja nie podaje skrzyni, przyjęto manualną: sprawdź u dostawcy",
}

export function ostrzezenie(r: Auto): string | null {
  if (r.d_eur === null) return null
  if (r.dania?.skrzyniaZDomyslu) return "skrzynia?"
  return r.ok && r.compared === 1 ? "1 oferta" : null
}
