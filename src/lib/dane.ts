export type Auto = {
  id: string
  title: string
  auto1_url: string | null
  search_url: string | null
  note: string | null
  reg: string | null
  fuel: string | null
  hp: number | null
  km: number | null
  unroadworthy: boolean
  gear: string | null
  liters: number | null
  make: string | null
  model: string | null
  auction: string | null
  body: string | null
  image: string | null
  end_ms: number | null
  bid_eur: number | null
  bid_pln: number | null
  total: number | null
  compared: number | null
  a_eur: number | null
  a_pln: number | null
  o_eur: number | null
  o_pln: number | null
  d_eur: number | null
  d_pln: number | null
  t: number | null
  ok: boolean
  since?: string | null // pierwsza noc w historii (90 dni); brak w danych sprzed wydania 10
  a_prev_eur?: number | null // cena Auto1 z poprzedniej udanej nocy
}

// Zdjęcia i wyposażenie z pliku szczegoly.json, pobieranego dopiero przy pierwszym otwarciu auta.
export type Szczegoly = {
  images: string[]
  report?: string
  colour?: string | number
  doors?: string | number
  emissionStandard?: string | number
  city?: string
  country?: string
  allWheelDrive?: boolean
  ac?: boolean
  backupCamera?: boolean
  heatedSeats?: boolean
  leather?: boolean
  navigationSystem?: boolean
  parkHeating?: boolean
  pdc?: boolean
  sunroof?: boolean
  prices?: [string, number | null, number | null][] // noc, Auto1 EUR, Otomoto PLN: tylko noce ze zmianą
}

export type Noc = {
  day: string
  status: string | null
  cars: number | null
  compared: number | null
  errors: number | null
  started: string | null
  finished: string | null
}

export type Dane = {
  meta: { stamp_iso: string; rate: string; rate_value: number; rate_date: string }
  scan: {
    started: string | null
    finished: string | null
    cars: number | null
    compared: number
    qualified: number
    errors: number | null
    unmapped: number | null
  }
  nights: Noc[]
  rows: Auto[]
}

// Nocny skan publikuje dane obok obecnej strony.
const ADRES = import.meta.env.VITE_DANE ?? "https://666dynamic.github.io/autoradar-migawka/data.json"

export async function wczytajDane(): Promise<Dane> {
  const odpowiedz = await fetch(ADRES, { cache: "no-cache" })
  if (!odpowiedz.ok) throw new Error(String(odpowiedz.status))
  return odpowiedz.json()
}

const ADRES_SZCZEGOLOW = ADRES.replace("data.json", "szczegoly.json")
let szczegoly: Promise<Record<string, Szczegoly>> | null = null

// Bez pliku (noc sprzed zmiany, błąd sieci) auto ma tylko pierwsze zdjęcie z głównych danych.
export function wczytajSzczegoly() {
  szczegoly ??= fetch(ADRES_SZCZEGOLOW, { cache: "no-cache" }).then((o) => (o.ok ? o.json() : {})).catch(() => {
    szczegoly = null
    return {}
  })
  return szczegoly
}
