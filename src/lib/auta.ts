import type { Auto, Szczegoly } from "@/lib/dane"

export const FUEL: Record<string, string> = { diesel: "diesel", petrol: "benzyna", hybrid: "hybryda", electro: "elektryczny", gas: "gaz", other: "inne" }
export const GEAR: Record<string, string> = { manual: "manualna", automatic: "automat", duplex: "automat", "semi-automatic": "automat" }
// Kod spoza listy (nowy typ w Auto1) widać bez zmiany kodu.
const AUCTION = new Map([
  ["24D1", "Aukcja 24h"], ["24D2", "Aukcja 24h"], ["24D3", "Aukcja 24h"], ["ZRT24D1", "Aukcja 24h"],
  ["LASTRUN", "Ostatnia szansa"], ["INSTANTPURCHASE", "Zakup natychmiastowy"],
  ["3RD_PARTY_BIDDING", "Aukcja dealerska"], ["3RD_PARTY_PREBID", "Dealerska zewnętrzna"], ["REMA_PREBIDDING", "Dealerska REMA"],
])
export const AUCTION_LABELS = [...new Set(AUCTION.values())]

export type Wiersz = Auto & { _label: string; _fuel: string; _gear: string; _year: number | null; _dealer: boolean; _id: string; _hay: string; _joined: string }

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/ß/g, "ss")
const squeeze = (s: string) => s.replace(/[^a-z0-9]/g, "")

export function przygotuj(rows: Auto[]): Wiersz[] {
  return rows.map((r) => {
    const key = r.auction ?? ""
    const hay = fold([r.make, r.model, r.title].filter(Boolean).join(" "))
    // Sąsiednie słowa razem: „e220” znajdzie „E 220 d”, ale nie „GLE 220”.
    const w = hay.split(/[^a-z0-9]+/).filter(Boolean)
    return {
      ...r,
      _label: key === "" ? "nieznany" : AUCTION.get(key) ?? key,
      _fuel: (r.fuel && FUEL[r.fuel]) || r.fuel || "brak danych",
      _gear: (r.gear && GEAR[r.gear]) || r.gear || "brak danych",
      _year: r.reg ? Number(r.reg.slice(0, 4)) : null,
      _dealer: key.startsWith("3RD_PARTY") || key.startsWith("REMA"),
      _id: squeeze(fold(r.id)),
      _hay: hay,
      _joined: w.map((x, i) => ` ${x}${w[i + 1] ?? ""} ${x}${w[i + 1] ?? ""}${w[i + 2] ?? ""}`).join(""),
    }
  })
}

export type Szukane = { id: string; words: { raw: string; bare: string }[] }

export function szukane(tekst: string): Szukane {
  const t = fold(tekst)
  return { id: t.replace(/\s/g, ""), words: t.split(/\s+/).filter(Boolean).map((raw) => ({ raw, bare: squeeze(raw) })) }
}

export function pasuje(r: Wiersz, s: Szukane) {
  if (!s.words.length) return true
  // Dwa znaki to model („a4”), nie numer auta.
  return (s.id.length >= 3 && r._id.includes(s.id)) || s.words.every(({ raw, bare }) => r._hay.includes(raw) || (bare && r._joined.includes(" " + bare)) || (bare.length >= 3 && r._id.includes(bare)))
}

export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."))
export const regLabel = (r: Auto) => (r.reg ? r.reg.slice(5, 7) + "." + r.reg.slice(0, 4) : "—")
export const kmLabel = (r: Auto) => (r.km != null ? fmt(r.km) + " km" : "—")
export const litersLabel = (r: Auto) => (r.liters != null ? r.liters.toFixed(1).replace(".", ",") + " l" : "—")
export const hpLabel = (r: Auto) => (r.hp != null ? r.hp + " KM" : "—")
export const offersLabel = (r: Auto) => (r.total == null ? "—" : `${r.compared ?? "—"} z ${r.total}`)

export function endLabel(r: Auto) {
  if (r.end_ms == null) return "—"
  const when = new Date(r.end_ms).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  return r.end_ms < Date.now() ? when + " (zakończona)" : when
}

export function noteLabel(n: string | null) {
  if (!n) return "brak pełnego porównania"
  if (n === "no_exact_offers") return "brak pasujących ofert w Otomoto"
  if (/^auto1_incomplete:/.test(n)) return "niepełne dane w Auto1"
  if (/^error:/.test(n)) return "błąd pobrania z Otomoto"
  if (/Fuel or gearbox/.test(n)) return "paliwo/skrzynia do ustalenia"
  const m = n.match(/catalogue value: (.+)$/)
  return m ? `model „${m[1]}” poza katalogiem filtrów` : "brak porównania"
}

const POWODY: Record<string, string> = {
  "Incomplete page": "Otomoto zwróciło niepełną stronę wyników",
  "Duplicate advert within a page": "ta sama oferta dwa razy na stronie wyników",
  "Unexpected advert URL": "nietypowy link oferty w wynikach",
  "Wrong sort order": "wyniki w złej kolejności",
  "Unexpected pagination": "nietypowy podział wyników na strony",
  "GraphQL returned errors": "Otomoto zwróciło błąd",
  "Applied filters differ from requested filters": "Otomoto zmieniło filtry wyszukiwania",
  timeout_240s: "brak odpowiedzi przez 4 minuty",
  ValueError: "nieczytelna odpowiedź Otomoto",
  URLError: "problem z połączeniem",
  HTTPError: "problem z połączeniem",
  TimeoutError: "brak odpowiedzi Otomoto",
}

// Dlaczego auto ma błąd: noc zapisuje powód po angielsku, strona pokazuje go po polsku.
export function powodBledu(n: string | null) {
  const powod = (n ?? "").replace(/^error:\s*/, "")
  return POWODY[powod] ?? powod
}

export type Waluta = "eur" | "pln"
export const kwota = (r: Auto, pole: "a" | "o" | "d" | "bid", w: Waluta) => r[`${pole}_${w}`]
export const pieniadze = (n: number | null | undefined, w: Waluta) => (n === null || n === undefined ? "—" : `${fmt(n)} ${w === "eur" ? "€" : "zł"}`)

export type Sort = { key: string; dir: 1 | -1 }

function wartosc(r: Wiersz, key: string, w: Waluta): string | number | null | undefined {
  switch (key) {
    case "name": return r.title
    case "a": case "o": case "d": case "bid": return kwota(r, key, w)
    case "end": return r.end_ms !== null && r.end_ms > Date.now() ? r.end_ms : null // zakończone na końcu
    case "offers": return r.compared
    case "reg": return r.reg
    case "liters": return r.liters
    case "km": return r.km
    case "hp": return r.hp
    case "fuel": return r._fuel
    case "gear": return r._gear
    case "rank": return r.ok ? 2 : r.d_eur === null ? 0 : 1
  }
}

export function porownaj(a: Wiersz, b: Wiersz, s: Sort, w: Waluta) {
  const x = wartosc(a, s.key, w)
  const y = wartosc(b, s.key, w)
  const xn = x === null || x === undefined
  const yn = y === null || y === undefined
  if (xn && yn) return 0
  if (xn) return 1
  if (yn) return -1
  if (s.key === "rank") {
    if (x !== y) return s.dir * ((x as number) - (y as number))
    return (kwota(b, "d", w) ?? 0) - (kwota(a, "d", w) ?? 0)
  }
  if (typeof x === "string") return s.dir * x.localeCompare(y as string, "pl")
  return s.dir * ((x as number) - (y as number))
}

const specyfikacja = (r: Auto): [string, string][] => [
  ["Rocznik", regLabel(r)], ["Przebieg", kmLabel(r)], ["Pojemność", litersLabel(r)], ["Moc", hpLabel(r)],
  ["Paliwo", (r.fuel && FUEL[r.fuel]) || r.fuel || "—"], ["Skrzynia", (r.gear && GEAR[r.gear]) || r.gear || "—"],
]

export const specyfikacjaAuta = specyfikacja

// Od najrzadszych w nocy 02.11: najpierw to, co wyróżnia auto. Lista Auto1 ma tylko te pola.
const WYPOSAZENIE: [keyof Szczegoly, string, boolean][] = [
  ["backupCamera", "kamera cofania", true], ["parkHeating", "ogrzewanie postojowe", true], ["allWheelDrive", "napęd 4x4", true],
  ["sunroof", "szyberdach", true], ["leather", "skórzana tapicerka", true],
  ["navigationSystem", "nawigacja", false], ["heatedSeats", "podgrzewane fotele", false], ["pdc", "czujniki parkowania", false], ["ac", "klimatyzacja", false],
]

export function wyposazenie(s?: Szczegoly) {
  return s ? WYPOSAZENIE.filter(([k]) => s[k] === true).map(([, nazwa]) => nazwa) : []
}

// [nazwa, czy rzadkie]: rzadkie okno pokazuje wyraźniej.
export function wyposazenieOkna(s?: Szczegoly) {
  return s ? WYPOSAZENIE.filter(([k]) => s[k] === true).map(([, nazwa, rzadkie]): [string, boolean] => [nazwa, rzadkie]) : []
}

const KOLORY: Record<string, string> = { black: "czarny", gray: "szary", grey: "szary", white: "biały", silver: "srebrny", blue: "niebieski", red: "czerwony", green: "zielony", brown: "brązowy", beige: "beżowy", yellow: "żółty", orange: "pomarańczowy", gold: "złoty", purple: "fioletowy" }

export const dodatki = (s?: Szczegoly): [string, string][] => [
  ...(typeof s?.colour === "string" ? [["Kolor", KOLORY[s.colour] ?? s.colour] as [string, string]] : []),
  ...(s?.doors ? [["Drzwi", String(s.doors)] as [string, string]] : []),
  ...(typeof s?.emissionStandard === "string" ? [["Norma emisji", s.emissionStandard] as [string, string]] : []),
]

const KRAJE: Record<string, string> = { DE: "Niemcy", NL: "Holandia", BE: "Belgia", FR: "Francja", IT: "Włochy", ES: "Hiszpania", AT: "Austria", PL: "Polska", SE: "Szwecja", DK: "Dania", CZ: "Czechy", PT: "Portugalia", LU: "Luksemburg", CH: "Szwajcaria" }

export const lokalizacja = (s?: Szczegoly) => [s?.city, s?.country && (KRAJE[s.country] ?? s.country)].filter(Boolean).join(", ") || "—"

// Stawka akcyzy w procentach (2026): do 2,0 l 3,1%, powyżej 18,6%. Hybryda do 3,5 l połowa, hybryda plug-in do 2,0 l
// zwolniona do końca 2029, elektryk 0. Plug-in rozpoznawany po tytule. Bez pojemności decyduje wybór w oknie.
// Sprawdzone na 125 hybrydach z 02.11: reszta to zwykłe hybrydy (Toyota, Kia Niro, E-Tech, C 300 Hybrid).
const PLUG_IN = /plug-in|phev|\bgte\b|\biv\b|\d{2,3}\s?x?e\b|tfsi ?e\b|e-tron|\bde\b|recharge|4xe|e-?hybrid|\bt8\b|twin engine|cooper s e\b|hybrid ?4\b|^(peugeot|citro.n|ds|opel) .*1\.6 hybrid/i
export function stawkaAkcyzy(r: Auto, ponad2l: boolean | null): number | null {
  if (r.fuel === "electro") return 0
  const duzy = r.liters != null ? r.liters > 2 : ponad2l
  if (duzy === null) return null
  if (r.fuel === "hybrid" && (r.liters == null || r.liters <= 3.5)) return !duzy && PLUG_IN.test(r.title) ? 0 : duzy ? 9.3 : 1.55
  return duzy ? 18.6 : 3.1
}

// Teksty bez ceny zakupu i bez linku do Auto1. Krótkie: dane w jednej linii, dodatki w drugiej.
function linieOferty(r: Auto, s?: Szczegoly) {
  const sprzet = wyposazenie(s)
  return [
    specyfikacja(r).map(([, v]) => v).filter((v) => v !== "—").join(" · "),
    dodatki(s).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(" · "),
    sprzet.length ? `Wyposażenie: ${sprzet.join(", ")}` : "",
  ].filter(Boolean)
}

export function tekstWhatsApp(r: Auto, s?: Szczegoly) {
  return [r.title, ...linieOferty(r, s)].join("\n")
}

export function tekstFacebook(r: Auto, s?: Szczegoly) {
  return [`🚗 ${r.title}`, ...linieOferty(r, s).map((x) => `✅ ${x}`), "Zainteresowany? Napisz wiadomość."].join("\n")
}

// Zmiana ceny Auto1 od poprzedniej udanej nocy, w euro; 0 gdy bez zmian albo bez historii.
export const zmianaCeny = (r: Auto) => (r.a_prev_eur != null && r.a_eur != null ? Math.round(r.a_eur - r.a_prev_eur) : 0)
