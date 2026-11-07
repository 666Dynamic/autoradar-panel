import { pobierzJson } from "@/lib/schowek"
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
  dania?: import("@/lib/dania").Dania // tylko auta z Danii (dania.json): cena „a” to cena dostawcy
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
  countryCode?: string // tak nazywa kraj nocny szczegoly.json
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

// Liczone w nocy z historii ogłoszeń Otomoto (autoradar/market.py); null, dopóki noc go nie wysyła.
export type Rynek = {
  since: string
  nights: number
  windows: {
    days: number
    gone: number
    counted: number
    median_days: number | null
    trend: { from: string; searches: number; change_pct: number | null } | null
  }[]
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
  market?: Rynek | null
  rows: Auto[]
}

// Dane nocy: prywatny schowek Supabase (po zalogowaniu). VITE_DANE = lokalna kopia do testów (public/test-dane).
const LOKALNIE = import.meta.env.VITE_DANE || ""

async function plikLokalny<T>(nazwa: string): Promise<T> {
  const odpowiedz = await fetch(LOKALNIE.replace("data.json", nazwa), { cache: "no-cache" })
  if (!odpowiedz.ok) throw new Error(String(odpowiedz.status))
  return odpowiedz.json()
}
export const plikNocy = <T,>(nazwa: string): Promise<T> => (LOKALNIE ? plikLokalny<T>(nazwa) : pobierzJson<T>(nazwa))

export const wczytajDane = () => plikNocy<Dane>("data.json")

let szczegoly: Promise<Record<string, Szczegoly>> | null = null

// Bez pliku (noc sprzed zmiany, błąd sieci) auto ma tylko pierwsze zdjęcie z głównych danych; następne otwarcie próbuje znowu.
export function wczytajSzczegoly() {
  szczegoly ??= plikNocy<Record<string, Szczegoly>>("szczegoly.json").catch(() => {
    szczegoly = null
    return {}
  })
  return szczegoly
}
