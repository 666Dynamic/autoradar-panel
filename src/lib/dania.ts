// Lista Auto Midt (Dania) wklejona z maila → auta jak z Auto1. Odpowiednik autoradar/dania.py w repo skanera:
// te same pola, statusy i powody. Porównanie z Otomoto robi tylko skaner (dania.json); przeglądarka niczego nie pobiera.
import type { Ogloszenie } from "@/lib/ogloszenia"
import { POLA_OGLOSZENIA } from "@/lib/ogloszenia"

// Próg jak publish.threshold() w skanerze. Filtrów wejścia Auto1 tu nie ma (decyzja właściciela 05.11): wszystkie auta oprócz Sold.
export const prog = (cena: number) => (cena < 10000 ? 3500 : 4500)

export type Status = "sold" | "unparsed" | "duplicate" | "filtered" | "no_search" | "pending" | "compared" | "error"
export const STATUSY: Record<Status, string> = {
  compared: "porównane", pending: "czeka na porównanie", filtered: "poza filtrem", no_search: "bez porównania",
  error: "błąd Otomoto", sold: "sprzedane", unparsed: "nie do odczytu", duplicate: "duplikat",
}

export type AutoDK = {
  id: string
  pos: number
  status: Status
  reason: string | null
  title: string
  make: string
  model: string
  variant: string
  vin: string | null
  reg_date: string | null // 2018-10-11
  reg: string | null // 2018-10
  fuel: string | null // petrol, diesel, hybrid, electric jak w Auto1
  type: string // pole Type z listy: PHEV, Diesel, Benzin
  gear: string | null
  hp: number | null
  km: number | null
  a_eur: number | null // cena dostawcy
  color: string | null
  body_text: string | null
  co2_g: number | null
  photos_link: string | null
  photos_zip: string | null
  // Z porównania nocy (dania.json); bez niego null.
  o_eur: number | null
  d_eur: number | null
  t: number | null
  ok: boolean
  total: number | null
  compared: number | null
  search_url: string | null
  nowe: boolean // znacznik „New” na stronie dostawcy
}

const NAGLOWEK = ["year", "type", "brand", "model", "variant", "type", "vin", "colour", "km", "price full vat", "pictures", "co2"]
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/i
const MOC = /(?<![\d.])(\d{2,4})\s*(?:hp|hk|ps|km|cv)\b/i
const SPRZEDANE = /^(sold|solgt|verkauft|sprzedan[ey])\b/i
const CO2 = /^(\d+)\s*g$/i
const PALIWA: Record<string, string> = {
  benzin: "petrol", petrol: "petrol", gasoline: "petrol", diesel: "diesel", el: "electric", electric: "electric", ev: "electric", bev: "electric",
  hybrid: "hybrid", hev: "hybrid", "mild hybrid": "hybrid", phev: "hybrid", "plug-in": "hybrid", "plug-in hybrid": "hybrid",
}
const MARKI: Record<string, string> = { mercedes: "Mercedes-Benz", vw: "Volkswagen", "citroën": "Citroen", "škoda": "Skoda", mini: "MINI" }

export function kwotaListy(tekst: string): number | null {
  const t = tekst.trim().replace(/,(\d{1,2}|-)\s*$/, "").replace(/[\s.,]/g, "")
  return /^\d+$/.test(t) ? Number(t) : null
}

export function photosZip(link: string | null) {
  if (!link || !/^https:\/\/(www\.)?dropbox\.com\//.test(link)) return null
  if (/[?&]dl=\d/.test(link)) return link.replace(/([?&])dl=\d/, "$1dl=1")
  return link + (link.includes("?") ? "&" : "?") + "dl=1"
}

export function bloki(tekst: string) {
  let linie = tekst.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean)
  if (linie.slice(0, NAGLOWEK.length).map((l) => l.toLowerCase()).join("|") === NAGLOWEK.join("|")) linie = linie.slice(NAGLOWEK.length)
  const auta: string[][] = []
  for (const l of linie) {
    if (DATA.test(l)) auta.push([l])
    else if (auta.length) auta[auta.length - 1].push(l)
  }
  return auta
}

const puste = (pos: number, id: string, title: string): AutoDK => ({
  id, pos, status: "unparsed", reason: null, title, make: "", model: "", variant: "", vin: null, reg_date: null, reg: null, fuel: null, type: "",
  gear: null, hp: null, km: null, a_eur: null, color: null, body_text: null, co2_g: null, photos_link: null, photos_zip: null,
  o_eur: null, d_eur: null, t: null, ok: false, total: null, compared: null, search_url: null, nowe: false,
})

// Pola karty auta na automidt.dk (i kolumny eksportu do Excela po zmapowaniu). Tekst jak na stronie.
export type Karta = {
  name?: string // marka i model razem, np. „Ford Mondeo”
  make?: string
  model?: string
  variant: string // „2,0 TDCi Titanium Powershift 163HK Stc 6g Aut”
  vin: string
  fuel: string
  hp?: string // „163 HK”; bez niej moc z wersji
  km: string // „328.000 km”
  first_reg: string // „18.12.2014” albo „2014-12-18”
  price: string // „€ 2.200” albo „Sold”
  sold?: string | boolean
  new?: string | boolean
  color?: string
  body?: string
  photos_link?: string
  co2?: string
}

// Strona nie ma pola skrzyni: automat, gdy wersja tak mówi, inaczej manualna (decyzja 05.11). Jak gearbox_from w skanerze.
const AUTOMAT = /\b(aut|auto|automat|automatic|automatik|automatgear|dsg|s[ -]?tronic|powershift|tiptronic|steptronic|multitronic|cvt|edc|eat\d?|e-?cvt|geartronic|7g-tronic|9g-tronic|xtronic|amt)\b/i
export const skrzyniaZWersji = (w: string) => (AUTOMAT.test(w) ? "automatic" : "manual")
const DWUCZLONOWE = ["land rover", "alfa romeo", "aston martin", "mercedes benz", "rolls royce", "lynk co", "ds automobiles"]
export function rozdzielNazwe(nazwa: string): [string, string] {
  const s = nazwa.trim().split(/\s+/)
  const dwa = s.slice(0, 2).join(" ").toLowerCase().replace(/-/g, " ").replace(/&/g, "").replace(/\s+/g, " ")
  const n = DWUCZLONOWE.includes(dwa) ? 2 : 1
  return [s.slice(0, n).join(" "), s.slice(n).join(" ")]
}
function dataIso(t: string) {
  const x = t.trim()
  if (DATA.test(x)) return x
  const m = x.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null
}
const tak = (v: string | boolean | undefined, re: RegExp) => v === true || (typeof v === "string" && re.test(v.trim()))

// Mail: 12 linijek na auto w stałej kolejności → te same pola co karta.
function zMaila(l: string[]): Karta | string {
  if (l.length < 10) return `niepełne dane: ${l.length} linijek zamiast 12`
  const [data, typ, marka, model, wersja, nadwozie, vin, kolor, km, cena] = l
  if (!VIN.test(vin)) return "układ linijek nie pasuje (brak VIN w 7. linijce)"
  const reszta = l.slice(10)
  return { make: marka, model, variant: wersja, vin, fuel: typ, km, first_reg: data, price: cena, color: kolor, body: nadwozie,
    photos_link: reszta.find((x) => x.startsWith("http")), co2: reszta.find((x) => CO2.test(x)) }
}

// Każde auto dostaje status i powód; nic nie znika bez śladu. Wejście: karty (Excel) albo błędy odczytu z etykietą.
export function rozlicz(wejscie: { karta: Karta | string; etykieta: string }[]): AutoDK[] {
  const wynik: AutoDK[] = []
  const viny = new Set<string>()
  wejscie.forEach(({ karta: k, etykieta }, i) => {
    const pos = i + 1
    if (typeof k === "string") return wynik.push({ ...puste(pos, `DK-poz${pos}`, etykieta), reason: k })
    const [make0, model] = k.make ? [k.make, k.model ?? ""] : rozdzielNazwe(k.name ?? "")
    const make = MARKI[make0.toLowerCase()] ?? make0
    const vin = k.vin.trim().toUpperCase()
    const tytul = `${make} ${model} ${k.variant}`.trim()
    if (!VIN.test(vin)) return wynik.push({ ...puste(pos, `DK-poz${pos}`, tytul), reason: "brak poprawnego VIN" })
    const data = dataIso(k.first_reg)
    const link = k.photos_link?.trim() || null
    const co2 = k.co2?.match(CO2)
    const a: AutoDK = {
      ...puste(pos, "DK-" + vin, tytul), make, model, variant: k.variant, vin, reg_date: data, reg: data?.slice(0, 7) ?? null,
      type: k.fuel, color: k.color?.trim() || null, body_text: k.body?.trim() || null, km: kwotaListy(k.km.replace(/\s*km$/i, "")),
      photos_link: link, photos_zip: photosZip(link), co2_g: co2 ? Number(co2[1]) : null, nowe: tak(k.new, /^(new|ny|true|1|yes|ja)$/i),
    }
    if (!data) return wynik.push({ ...a, reason: "nie da się odczytać 1. rejestracji: " + k.first_reg.slice(0, 30) })
    if (a.km === null) return wynik.push({ ...a, reason: "nie da się odczytać przebiegu: " + k.km.slice(0, 30) })
    if (viny.has(a.id)) return wynik.push({ ...a, id: `DK-poz${pos}`, status: "duplicate", reason: "ten sam VIN wcześniej na liście" })
    viny.add(a.id)
    if (tak(k.sold, SPRZEDANE) || SPRZEDANE.test(k.price.trim())) return wynik.push({ ...a, status: "sold", reason: "sprzedane (Sold na liście)" })
    a.a_eur = kwotaListy(k.price.replace(/€|eur/gi, ""))
    if (a.a_eur === null) return wynik.push({ ...a, reason: "nie da się odczytać ceny: " + k.price.slice(0, 30) })
    const moc = k.hp?.trim() ? kwotaListy(k.hp.replace(/\s*(hk|hp|ps|km)$/i, "")) : Number(k.variant.match(MOC)?.[1] ?? NaN)
    if (!moc) return wynik.push({ ...a, reason: "brak mocy (KM/HP) w wersji: " + k.variant.slice(0, 40) })
    a.hp = moc
    a.gear = skrzyniaZWersji(k.variant)
    const t = k.fuel.trim().toLowerCase()
    a.fuel = PALIWA[t] ?? (t || null)
    if (["phev", "plug-in", "plug-in hybrid"].includes(t) && !/\bPHEV\b|plug-?in/i.test(a.title)) a.title += " PHEV"
    // Model i paliwo sprawdza katalog Otomoto w skanerze; tu auto czeka na porównanie.
    wynik.push({ ...a, status: "pending", reason: "czeka na porównanie z Otomoto" })
  })
  return wynik
}

export const czytajListe = (tekst: string) => rozlicz(bloki(tekst).map((l) => ({ karta: zMaila(l), etykieta: l.slice(2, 5).join(" ") })))

// Eksport „Export to Excel” ze strony: nazwy kolumn poznamy przy pierwszym pliku. Rozpoznajemy je po kilku nazwach;
// kolumny bez dopasowania strona pokazuje, żeby dopisać je tutaj.
const KOLUMNY: [keyof Karta, RegExp][] = [
  ["vin", /^(vin|stelnr\.?|stelnummer|chassis( ?nr\.?)?)$/i], ["name", /^(car|bil|name|navn|make ?(&|and|\+)? ?model|mærke ?(og|&)? ?model)$/i],
  ["make", /^(make|brand|mærke|marke)$/i], ["model", /^(model)$/i], ["variant", /^(variant|version|model ?text|beskrivelse|description|title)$/i],
  ["fuel", /^(fuel|type|brændstof|drivmiddel)$/i], ["hp", /^(hp|hk|power|effekt|ps)$/i], ["km", /^(km|mileage|kilometer|kørt)$/i],
  ["first_reg", /^(1st ?reg\.?|first ?reg(istration)?\.?|1\. ?reg(\.|istrering)?|year|årgang|reg\.? ?date)$/i],
  ["price", /^(price|pris|price ?(full ?vat|eur|€)|price \(€\))$/i], ["sold", /^(sold|solgt|status)$/i], ["new", /^(new|ny)$/i],
  ["color", /^(colou?r|farve)$/i], ["photos_link", /^(pictures|images|billeder|dropbox|photos)$/i], ["body", /^(body|karosseri)$/i], ["co2", /^co2$/i],
]
type Komorka = string | number | boolean | Date | null
const tekstKomorki = (v: Komorka) => (v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}` : v == null ? "" : String(v))

export function zArkusza(wiersze: Komorka[][]): { auta: AutoDK[]; nieznane: string[]; brak: string[] } {
  // Nagłówek: pierwszy wiersz z kolumną VIN.
  const i = wiersze.findIndex((w) => w.some((c) => typeof c === "string" && KOLUMNY[0][1].test(c.trim())))
  if (i < 0) return { auta: [], nieznane: (wiersze[0] ?? []).map(tekstKomorki).filter(Boolean), brak: ["vin"] }
  const naglowek = wiersze[i].map((c) => tekstKomorki(c).trim())
  const pola = naglowek.map((h) => KOLUMNY.find(([, re]) => re.test(h))?.[0])
  const nieznane = naglowek.filter((h, j) => h && !pola[j])
  const brak = (["vin", "variant", "fuel", "km", "first_reg", "price"] as (keyof Karta)[]).filter((p) => !pola.includes(p))
  if (!pola.includes("name") && !pola.includes("make")) brak.push("name")
  const auta = rozlicz(wiersze.slice(i + 1).filter((w) => w.some((c) => tekstKomorki(c).trim())).map((w) => {
    const k: Record<string, string> = { variant: "", vin: "", fuel: "", km: "", first_reg: "", price: "" }
    pola.forEach((p, j) => { if (p && !k[p]?.trim()) k[p] = tekstKomorki(w[j] ?? null) })
    return { karta: k as unknown as Karta, etykieta: k.name || [k.make, k.model].join(" ") }
  }))
  return { auta, nieznane, brak }
}

export async function czytajExcel(plik: File) {
  const { readSheet } = await import("read-excel-file/browser")
  return zArkusza((await readSheet(plik)) as Komorka[][])
}

export type PlikDania = { meta: { stamp_iso: string; rate_value: number }; cars: (Partial<AutoDK> & { id: string; vin?: string | null })[] }

const ADRES = (import.meta.env.VITE_DANE ?? "https://666dynamic.github.io/autoradar-migawka/data.json").replace("data.json", "dania.json")

// Nocny dania.json; dopóki go nie ma (404), strona działa na samym wklejonym tekście.
export async function wczytajDania(): Promise<PlikDania | null> {
  try {
    const o = await fetch(ADRES, { cache: "no-cache" })
    return o.ok ? await o.json() : null
  } catch {
    return null
  }
}

// Wklejona lista decyduje, które auta są dziś; z nocy bierzemy porównanie tego samego VIN-u.
export function polacz(lista: AutoDK[], noc: PlikDania | null): AutoDK[] {
  if (!noc) return lista
  const zNocy = new Map(noc.cars.filter((c) => c.vin).map((c) => [c.vin!, c]))
  if (!lista.length) return noc.cars.map((c) => ({ ...puste(c.pos ?? 0, c.id, c.title ?? ""), ...c }) as AutoDK)
  return lista.map((a) => {
    const c = a.vin ? zNocy.get(a.vin) : undefined
    if (!c || a.status !== "pending" || !c.status || !["compared", "error", "no_search"].includes(c.status)) return a
    return { ...a, status: c.status, reason: c.reason ?? null, o_eur: c.o_eur ?? null, d_eur: c.d_eur ?? null, t: c.t ?? null, ok: !!c.ok && a.a_eur === c.a_eur,
      total: c.total ?? null, compared: c.compared ?? null, search_url: c.search_url ?? null }
  })
}

const PL_PALIWO: Record<string, string> = { petrol: "Benzyna", diesel: "Diesel", electric: "Elektryczny", hybrid: "Hybryda" }
const KOLORY: Record<string, string> = {
  black: "czarny", white: "biały", grey: "szary", gray: "szary", silver: "srebrny", blue: "niebieski", red: "czerwony", green: "zielony",
  brown: "brązowy", beige: "beżowy", yellow: "żółty", orange: "pomarańczowy", sort: "czarny", hvid: "biały", "grå": "szary", "sølv": "srebrny", "blå": "niebieski", "rød": "czerwony",
}

// Pola ogłoszenia z auta duńskiego: cena = cena dostawcy + marża (koszty nie są liczone).
export function doOgloszenia(a: AutoDK, marza: number, kontakt = ""): Ogloszenie {
  const plugin = /phev|plug/i.test(a.type)
  const d = a.reg_date?.match(DATA)
  return {
    ...POLA_OGLOSZENIA, kraj: "DK", kontakt, auto: `${a.make} ${a.model}`.trim(), wersja: a.variant.replace(/\s+-\s*$/, ""), vin: a.vin ?? "",
    paliwo: plugin ? "Hybryda plug-in" : (a.fuel && PL_PALIWO[a.fuel]) || a.type,
    skrzynia: a.gear === "automatic" ? "Automat" : a.gear === "manual" ? "Manualna" : "",
    rejestracja: d ? `${d[3]}.${d[2]}.${d[1]}` : "", przebieg: a.km != null ? String(a.km) : "", moc: a.hp != null ? String(a.hp) : "",
    cena: a.a_eur != null ? String(a.a_eur + marza) : "", waluta: "eur", kolor: a.color ? KOLORY[a.color.toLowerCase()] ?? a.color : "",
  }
}
