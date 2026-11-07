// Auto Midt (Dania): plik dania.json z kroku porannego skanera (autoradar/dania_night.py), obok data.json.
// Każde auto dostawcy jest tu wierszem jak auto z Auto1 (te same pola), więc strona używa tabeli i okna Auto1.
// Cena „a” to cena dostawcy; porównanie z Otomoto i próg są te same co w Auto1. Przeglądarka niczego nie liczy od nowa.
import { kolorPL } from "@/lib/auta"
import { plikNocy, type Auto, type Dane } from "@/lib/dane"
import { POLA_OGLOSZENIA, type Ogloszenie } from "@/lib/ogloszenia"
import { adresyZdjec } from "@/lib/schowek"

// Marża w poście (cena dostawcy + MARZA). Stała, decyzja właściciela; nie zmienia różnicy ani kwalifikacji.
export const MARZA = 1000

export const OPIS_TYPU: Record<string, string> = { margin: "z duńskim VAT, system marży", netto: "bez VAT" }

// Dodatkowe dane auta z Danii, przy wierszu tabeli.
export type Dania = {
  vin: string | null
  wersja: string
  typ: string // pole type dostawcy: PHEV, Diesel, Benzin
  kolor: string | null
  rejestracja: string | null // 2018-10-11
  typCeny: string | null
  folder: string | null // folder zdjęć w Dropboxie
  zip: string | null // ten sam folder jako zip (dl=1)
  zdjecia: string[] // opublikowane zdjęcie ze strony dostawcy: [dania/<VIN>/1.jpg] albo []
  nowe: boolean
  skrzyniaZDomyslu: boolean // wersja nie podaje skrzyni, przyjęto manual (reguła 05.11): do sprawdzenia ręcznie
  powod: string | null // dlaczego auto nie ma porównania (sprzedane, brak mocy w API…)
}

type AutoZPliku = Partial<Auto> & {
  id: string; title: string; status: string; reason: string | null; vin?: string | null; variant?: string; type?: string; color?: string | null
  reg_date?: string | null; price_type?: string | null; gear_guess?: boolean; photos_link?: string | null; photos_zip?: string | null; new?: boolean
  images?: string[]
}
type PlikDania = { meta: Dane["meta"]; cars: AutoZPliku[] }
export type AutoDania = Auto & { dania: Dania }

const TYP_PALIWA: Record<string, string> = { petrol: "petrol", benzin: "petrol", diesel: "diesel", electric: "electric", phev: "hybrid", hev: "hybrid", hybrid: "hybrid", "mild hybrid": "hybrid" }
// Lokalna kopia do testów (VITE_DANE); bez niej zdjęcia mają podpisane adresy ze schowku Supabase.
const ADRES = (import.meta.env.VITE_DANE || "https://666dynamic.github.io/autoradar-migawka/data.json").replace("data.json", "dania.json")
// Powód braku porównania po polsku; reszta (brak ofert, model poza katalogiem) idzie przez noteLabel jak w Auto1.
const POWODY: Record<string, string> = { sold: "sprzedane u dostawcy", duplicate: "ten sam VIN wyżej na liście", unparsed: "dostawca nie podał mocy" }

// dania.json → ten sam kształt co data.json Auto1 (bez nocy i skanu: strona Dania ich nie pokazuje).
export function zPliku(plik: PlikDania, adres = ADRES, podpisane?: Record<string, string>): Dane {
  const zdjecie = (z: string) => (podpisane ? (podpisane[z] ?? null) : new URL(z, adres).href)
  // Auto bez porównania (brak mocy) dostaje rocznik i paliwo od dostawcy, tylko do pokazania.
  const rows = plik.cars.map((c): AutoDania => ({
    id: c.id, title: c.title, auto1_url: null, search_url: c.search_url ?? null, note: c.note ?? null,
    reg: c.reg ?? c.reg_date?.slice(0, 7) ?? null, fuel: c.fuel ?? TYP_PALIWA[(c.type ?? "").toLowerCase()] ?? null, hp: c.hp ?? null, km: c.km ?? null, unroadworthy: false, gear: c.gear ?? null,
    liters: c.liters ?? null, make: c.make ?? null, model: c.model ?? null, auction: null, body: c.body ?? null,
    image: c.image ? zdjecie(c.image) : null, end_ms: null, bid_eur: null, bid_pln: null, // image: mini.jpg do najechania
    total: c.total ?? null, compared: c.compared ?? null, a_eur: c.a_eur ?? null, a_pln: c.a_pln ?? null, o_eur: c.o_eur ?? null,
    o_pln: c.o_pln ?? null, d_eur: c.d_eur ?? null, d_pln: c.d_pln ?? null, t: c.t ?? null, ok: !!c.ok, a_prev_eur: c.a_prev_eur ?? null,
    dania: {
      vin: c.vin ?? null, wersja: c.variant ?? "", typ: c.type ?? "", kolor: c.color ?? null, rejestracja: c.reg_date ?? null,
      typCeny: c.price_type ?? null, folder: c.photos_link ?? null, zip: c.photos_zip ?? null, nowe: !!c.new, skrzyniaZDomyslu: !!c.gear_guess,
      zdjecia: (c.images ?? []).map(zdjecie).filter((z): z is string => !!z),
      powod: POWODY[c.status] ?? null,
    },
  }))
  return { meta: plik.meta, scan: {} as Dane["scan"], nights: [], rows }
}

export async function wczytajDania() {
  const plik = await plikNocy<PlikDania>("dania.json")
  if (import.meta.env.VITE_DANE) return zPliku(plik)
  return zPliku(plik, ADRES, await adresyZdjec(plik.cars.flatMap((c) => [...(c.image ? [c.image] : []), ...(c.images ?? [])])))
}

const PL_PALIWO: Record<string, string> = { petrol: "Benzyna", diesel: "Diesel", electric: "Elektryczny", hybrid: "Hybryda" }

// Pola posta z auta duńskiego: cena = cena dostawcy + MARZA, w euro.
export function doOgloszenia(a: AutoDania): Ogloszenie {
  const d = a.dania
  const data = d.rejestracja?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  // Nazwa jak u dostawcy („Mercedes-Benz C220d”), nie model z katalogu Otomoto („C-Klasse”).
  const wersja = d.wersja.trim()
  const nazwa = wersja && a.title.endsWith(wersja) ? a.title.slice(0, -wersja.length).trim() : ""
  return {
    ...POLA_OGLOSZENIA, kraj: "DK", auto: nazwa || [a.make, a.model].filter(Boolean).join(" ") || a.title, wersja: d.wersja.replace(/\s+-\s*$/, ""), vin: d.vin ?? "",
    paliwo: /phev|plug/i.test(d.typ) ? "Hybryda plug-in" : (a.fuel && PL_PALIWO[a.fuel]) || d.typ,
    skrzynia: a.gear === "automatic" ? "Automat" : a.gear === "manual" ? "Manualna" : "",
    rejestracja: data ? `${data[3]}.${data[2]}.${data[1]}` : "", przebieg: a.km != null ? String(a.km) : "", moc: a.hp != null ? String(a.hp) : "",
    cena: a.a_eur != null ? String(a.a_eur + MARZA) : "", waluta: "eur", typCeny: d.typCeny ?? "", kolor: kolorPL(d.kolor) ?? "",
  }
}
