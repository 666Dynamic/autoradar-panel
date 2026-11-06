import type { Auto } from "@/lib/dane"
import MODELE from "@/lib/mobile-modele.json"

// Link do wyszukiwania mobile.de z tymi samymi zasadami co Otomoto: rok ±2, moc ±10 KM, przebieg 0…Auto1+40000,
// paliwo, skrzynia, bez uszkodzonych, od najtańszych. Otwiera go właściciel w swojej przeglądarce; noc mobile.de nie czyta.
// Modele (Auto1 marka|model → wybór mobile.de) z planu Codexa 05.11 (mobile-de-research, all-auto1-plan-20261105-v1).
const WYBOR = MODELE as Record<string, string[]>
// Audi Sportback i Limousine mobile.de trzyma w zwykłym modelu; link pokaże też inne nadwozia, ocena okiem.
const ALIASY: Record<string, string> = { "Audi|A1 Sportback": "Audi|A1", "Audi|A3 Sportback": "Audi|A3", "Audi|A3 Limousine": "Audi|A3", "Audi|A5 Sportback": "Audi|A5", "Audi|A7 Sportback": "Audi|A7" }
const PALIWO: Record<string, string> = { petrol: "PETROL", diesel: "DIESEL", electro: "ELECTRICITY", electric: "ELECTRICITY", hybrid: "HYBRID" }
const SKRZYNIA: Record<string, string> = { manual: "MANUAL_GEAR", automatic: "AUTOMATIC_GEAR", duplex: "AUTOMATIC_GEAR", "semi-automatic": "AUTOMATIC_GEAR" }
// Auta z Danii mają nazwy modeli dostawcy („Xc40”, „T-roc”, „CLA”). Najpierw szukamy w tabeli Auto1 bez wielkości liter,
// spacji i myślników, potem tu. Numery z formularza mobile.de (model-options), odczyt 06.11.2026.
const DODATKOWE: Record<string, string[]> = {
  "volkswagen|golf": ["25200;14"], "volkswagen|golfsportsvan": ["25200;40"], "volkswagen|passatvariant": ["25200;63"], "volkswagen|tcross": ["25200;75"],
  "volvo|ex30": ["25100;49"], "mazda|2": ["16800;3"], "mazda|cx60": ["16800;63"],
  "kia|ceed": ["13200;26"], "kia|proceed": ["13200;27"], "kia|niro": ["13200;34"], "kia|picanto": ["13200;15"],
  "toyota|yaris": ["24100;36"], "toyota|yariscross": ["24100;78"], "toyota|aygox": ["24100;5"], "toyota|chr": ["24100;48"], "toyota|corollacross": ["24100;88"],
  "audi|a4avant": ["1900;9"], "audi|a3sportback": ["1900;8"], "audi|etron": ["1900;50"],
  "suzuki|scross": ["23600;12"], "suzuki|across": ["23600;342"], "hyundai|ioniq": ["11600;40"],
  "mercedesbenz|cla": ["17200;;45"], "mercedesbenz|gla": ["17200;;54"], "mercedesbenz|glb": ["17200;;66"], "mercedesbenz|glc": ["17200;;59"], "mercedesbenz|eqe": ["17200;352"],
  "bmw|i3": ["3500;79"], "bmw|i4": ["3500;330"], "bmw|i5": ["3500;341"], "bmw|i7": ["3500;336"], "bmw|ix": ["3500;331"], "bmw|ix1": ["3500;337"], "bmw|ix2": ["3500;346"], "bmw|ix3": ["3500;329"],
  "mini|cooper": WYBOR["MINI|MINI|Cooper"], "seat|leonfrsportstourer": ["22500;9"], "nissan|pulsar": ["18700;58"], "cupra|formentor": ["3;5"], "tesla|modely": ["135;6"], "polestar|2": ["4;3"], "nio|et5": ["31954;3"],
}
const normalny = (k: string) => k.toLowerCase().replace(/[^a-z0-9|]/g, "")
const PO_NORMALNYM = Object.fromEntries([...Object.entries(WYBOR).map(([k, v]) => [normalny(k), v]), ...Object.entries(DODATKOWE)])

// mobile.de filtruje moc w kW, jak w ich formularzu: 76–96 KM to pw=56:71.
const kw = (km: number) => Math.round(km / 1.3596216173)

// MINI ma osobne modele mobile.de dla wersji, wersja jest w tytule (jak mini_model w skanerze).
function wersjaMini(tytul: string) {
  const m = tytul.match(/MINI (?:(?:Cabrio|Roadster|Coupe) )?(John Cooper Works|Cooper(?: (?:SD|S|D|SE|E))?|One)(?: |$)/)
  if (!m || /^Cooper S?E$/.test(m[1])) return null
  return m[1] === "One" ? "ONE" : m[1] === "Cooper SD" ? "Cooper S" : m[1] === "Cooper D" ? "Cooper" : m[1]
}

export function linkMobile(r: Auto): string | null {
  if (!r.make || !r.model || !r.reg || r.km == null) return null
  const mini = r.make === "MINI" && ["MINI", "Cabrio", "Roadster", "Coupe"].includes(r.model) ? wersjaMini(r.title) : ""
  if (mini === null) return null
  const klucz = [r.make, r.model, mini].filter(Boolean).join("|")
  const ms = WYBOR[ALIASY[klucz] ?? klucz] ?? PO_NORMALNYM[normalny(klucz)]
  if (!ms) return null
  const rok = Number(r.reg.slice(0, 4))
  // cn=DE: tylko auta z Niemiec (Standort Deutschland).
  const p = new URLSearchParams({ vc: "Car", s: "Car", isSearchRequest: "true", dam: "false", cn: "DE", sb: "p", od: "up" })
  ms.forEach((m) => p.append("ms", m))
  p.set("fr", `${rok - 2}:${rok + 2}`)
  p.set("ml", `:${r.km + 40000}`)
  if (r.hp != null) p.set("pw", `${kw(Math.max(0, r.hp - 10))}:${kw(r.hp + 10)}`) // Dania: część aut bez mocy u dostawcy
  if (r.fuel && PALIWO[r.fuel]) p.set("ft", PALIWO[r.fuel])
  // Elektryki mają zawsze automat; Dania potrafi je opisać jako manual („Automatisk” w wersji), więc bez filtra skrzyni.
  if (r.gear && SKRZYNIA[r.gear] && PALIWO[r.fuel ?? ""] !== "ELECTRICITY") p.set("tr", SKRZYNIA[r.gear])
  return "https://suchen.mobile.de/fahrzeuge/search.html?" + p.toString()
}
