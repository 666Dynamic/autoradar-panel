import type { Auto } from "@/lib/dane"
import MODELE from "@/lib/mobile-modele.json"

// Link do wyszukiwania mobile.de z tymi samymi zasadami co Otomoto: rok ±2, moc ±10 KM, przebieg 0…Auto1+40000,
// paliwo, skrzynia, bez uszkodzonych, od najtańszych. Otwiera go właściciel w swojej przeglądarce; noc mobile.de nie czyta.
// Modele (Auto1 marka|model → wybór mobile.de) z planu Codexa 05.11 (mobile-de-research, all-auto1-plan-20261105-v1).
const WYBOR = MODELE as Record<string, string[]>
// Audi Sportback i Limousine mobile.de trzyma w zwykłym modelu; link pokaże też inne nadwozia, ocena okiem.
const ALIASY: Record<string, string> = { "Audi|A1 Sportback": "Audi|A1", "Audi|A3 Sportback": "Audi|A3", "Audi|A3 Limousine": "Audi|A3", "Audi|A5 Sportback": "Audi|A5", "Audi|A7 Sportback": "Audi|A7" }
const PALIWO: Record<string, string> = { petrol: "PETROL", diesel: "DIESEL", electro: "ELECTRICITY", hybrid: "HYBRID" }
const SKRZYNIA: Record<string, string> = { manual: "MANUAL_GEAR", automatic: "AUTOMATIC_GEAR", duplex: "AUTOMATIC_GEAR", "semi-automatic": "AUTOMATIC_GEAR" }
// mobile.de filtruje moc w kW, jak w ich formularzu: 76–96 KM to pw=56:71.
const kw = (km: number) => Math.round(km / 1.3596216173)

// MINI ma osobne modele mobile.de dla wersji, wersja jest w tytule (jak mini_model w skanerze).
function wersjaMini(tytul: string) {
  const m = tytul.match(/MINI (?:(?:Cabrio|Roadster|Coupe) )?(John Cooper Works|Cooper(?: (?:SD|S|D|SE|E))?|One)(?: |$)/)
  if (!m || /^Cooper S?E$/.test(m[1])) return null
  return m[1] === "One" ? "ONE" : m[1] === "Cooper SD" ? "Cooper S" : m[1] === "Cooper D" ? "Cooper" : m[1]
}

export function linkMobile(r: Auto): string | null {
  if (!r.make || !r.model || !r.reg || r.hp == null || r.km == null) return null
  const mini = r.make === "MINI" && ["MINI", "Cabrio", "Roadster", "Coupe"].includes(r.model) ? wersjaMini(r.title) : ""
  if (mini === null) return null
  const klucz = [r.make, r.model, mini].filter(Boolean).join("|")
  const ms = WYBOR[ALIASY[klucz] ?? klucz]
  if (!ms) return null
  const rok = Number(r.reg.slice(0, 4))
  const p = new URLSearchParams({ vc: "Car", s: "Car", isSearchRequest: "true", dam: "false", sb: "p", od: "up" })
  ms.forEach((m) => p.append("ms", m))
  p.set("fr", `${rok - 2}:${rok + 2}`)
  p.set("ml", `:${r.km + 40000}`)
  p.set("pw", `${kw(Math.max(0, r.hp - 10))}:${kw(r.hp + 10)}`)
  if (r.fuel && PALIWO[r.fuel]) p.set("ft", PALIWO[r.fuel])
  if (r.gear && SKRZYNIA[r.gear]) p.set("tr", SKRZYNIA[r.gear])
  return "https://suchen.mobile.de/fahrzeuge/search.html?" + p.toString()
}
