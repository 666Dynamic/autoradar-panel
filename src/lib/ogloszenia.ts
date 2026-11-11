import { FUEL, GEAR, fmt, kolorPL, wyposazenie } from "@/lib/auta"
import type { Auto, Szczegoly } from "@/lib/dane"

// Kraj: flaga i „z …” do nagłówka. Polska bez sprowadzania, więc bez „z”.
export const KRAJE_OGLOSZEN: [string, string, string, string][] = [
  ["DE", "Niemcy", "🇩🇪", "z Niemiec"], ["DK", "Dania", "🇩🇰", "z Danii"], ["NL", "Holandia", "🇳🇱", "z Holandii"], ["BE", "Belgia", "🇧🇪", "z Belgii"],
  ["FR", "Francja", "🇫🇷", "z Francji"], ["SE", "Szwecja", "🇸🇪", "ze Szwecji"], ["AT", "Austria", "🇦🇹", "z Austrii"], ["IT", "Włochy", "🇮🇹", "z Włoch"],
  ["ES", "Hiszpania", "🇪🇸", "z Hiszpanii"], ["LU", "Luksemburg", "🇱🇺", "z Luksemburga"], ["CH", "Szwajcaria", "🇨🇭", "ze Szwajcarii"], ["CZ", "Czechy", "🇨🇿", "z Czech"],
  ["PL", "Polska", "🇵🇱", ""],
]

export const POLA_OGLOSZENIA = { kraj: "DE", auto: "", wersja: "", vin: "", paliwo: "", skrzynia: "", rejestracja: "", przebieg: "", moc: "", cena: "", waluta: "eur", atuty: "", kolor: "", typCeny: "" }
export type Ogloszenie = typeof POLA_OGLOSZENIA

// Wzory właściciela. „OFERTA SPROWADZENIA” to osobny rodzaj posta (cena w zł po opłatach), nie styl tamtego.
export const WZORY: [string, string, string][] = [
  ["whatsapp", "WhatsApp", "Krótki: flaga i auto, VIN, wersja, paliwo, rejestracja, przebieg, moc, cena"],
  ["zamowienie", "Facebook – Możliwość sprowadzenia", "Auto u kontrahenta za granicą: punkty, atuty, cena w €, import od A do Z"],
  ["oferta", "OFERTA SPROWADZENIA", "Auto do sprowadzenia: dane w jednej linii, wyposażenie, cena w zł po opłatach"],
]
export const wzorZPamieci = (w: string | undefined) => (WZORY.some(([id]) => id === w) ? w! : "whatsapp")

const kraj = (o: Ogloszenie) => KRAJE_OGLOSZEN.find(([k]) => k === o.kraj)
const liczba = (s: string) => (s.trim() === "" ? "" : fmt(Number(s.replace(/\D/g, ""))))
const cena = (o: Ogloszenie) => (o.cena.trim() ? `${liczba(o.cena)} ${o.waluta === "eur" ? "€" : "zł"}` : "")
const przebieg = (o: Ogloszenie) => (o.przebieg.trim() ? `${liczba(o.przebieg)} km` : "")
const moc = (o: Ogloszenie) => (o.moc.trim() ? `${o.moc.replace(/\D/g, "")} KM` : "")
const atuty = (o: Ogloszenie) => o.atuty.split("\n").map((x) => x.trim().replace(/^[-*•✅]\s*/, "")).filter(Boolean)
// Puste pola dają "" i znikają; ODSTEP to zamierzona pusta linia, najwyżej jedna z rzędu.
const ODSTEP = "¶"
const linie = (...l: string[]) => l.filter((x) => x !== "").join("\n").replace(/¶(\n¶)+/g, ODSTEP).replace(/^¶\n|\n¶$/g, "").replaceAll(ODSTEP, "")

const PALIWA_TEKSTU: [RegExp, string][] = [
  [/^(phev|plug-?in( hybrid)?|hybryda plug-?in)$/i, "Hybryda plug-in"], [/^(hybrid|hybryda|hev|mhev)$/i, "Hybryda"],
  [/^(diesel|tdi|cdi|dci|hdi)$/i, "Diesel"], [/^(petrol|gasoline|benzin|benzyna|essence)$/i, "Benzyna"], [/^(electric|ev|bev|elektryczny|elektro)$/i, "Elektryczny"],
]
const NADWOZIA: [RegExp, string][] = [
  [/^(stationcar|station wagon|estate|kombi|variant|touring|avant|break|wagon)$/i, "Kombi"], [/^(sedan|saloon|limousine|limuzyna)$/i, "Sedan"],
  [/^(hatchback)$/i, "Hatchback"], [/^(suv|offroad)$/i, "SUV"], [/^(coupe|coupé)$/i, "Coupe"], [/^(cabrio|cabriolet|convertible)$/i, "Kabriolet"], [/^(van|bus)$/i, "Van"],
]
const KOLORY_TEKSTU: Record<string, string> = { black: "czarny", white: "biały", grey: "szary", gray: "szary", silver: "srebrny", blue: "niebieski", red: "czerwony", green: "zielony", brown: "brązowy", beige: "beżowy", yellow: "żółty", orange: "pomarańczowy" }
const FLAGI = new Map(KRAJE_OGLOSZEN.map(([k, , f]) => [f, k]))

// Tekst wklejony linijka po linijce (lista od kontrahenta, wiadomość z WhatsAppa): każda linijka rozpoznawana osobno.
// Czego nie da się rozpoznać, zostaje jako nazwa auta (pierwsze dwie) albo jest pomijane; link do zdjęć pomijany.
export function rozpoznajTekst(tekst: string): Partial<Ogloszenie> {
  const w: Partial<Ogloszenie> = {}
  const nazwa: string[] = []
  const atuty: string[] = []
  const liczby: string[] = []
  let nadwozie = ""
  for (const surowa of tekst.split("\n")) {
    let l = surowa.trim()
    const flaga = [...FLAGI.keys()].find((f) => l.startsWith(f))
    if (flaga) { w.kraj = FLAGI.get(flaga); l = l.slice(flaga.length).trim() }
    if (!l || /^https?:\/\//i.test(l)) continue
    const data = l.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? l.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/)
    if (data) { w.rejestracja = data[1].length === 4 ? `${data[3]}.${data[2]}.${data[1]}` : `${data[1]}.${data[2]}.${data[3]}`; continue }
    if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(l)) { w.vin = l.toUpperCase(); continue }
    const paliwo = PALIWA_TEKSTU.find(([re]) => re.test(l))
    if (paliwo) { w.paliwo = paliwo[1]; continue }
    const typ = NADWOZIA.find(([re]) => re.test(l))
    if (typ) { nadwozie = typ[1]; continue }
    if (KOLORY_TEKSTU[l.toLowerCase()]) { atuty.push(`Kolor ${KOLORY_TEKSTU[l.toLowerCase()]}`); continue }
    if (/^(automatic|automat|manual|manualna)$/i.test(l)) { w.skrzynia = /^auto/i.test(l) ? "Automat" : "Manualna"; continue }
    const moc = l.match(/(?<![\d.,])(\d{2,3})\s*(hp|km|ps|cv)\b/i) // „140.000 km” to przebieg, nie moc
    if (moc) {
      w.moc ??= moc[1]
      if (/automatic|automat|dsg|tiptronic|s tronic/i.test(l)) w.skrzynia ??= "Automat"
      else if (/manual/i.test(l)) w.skrzynia ??= "Manualna"
      if (l.replace(moc[0], "").trim()) w.wersja = l.replace(/\s+-\s*$/, "") // sama moc nie jest wersją
      continue
    }
    const kwota = l.match(/^(\d{1,3}(?:[ .]\d{3})+|\d+)\s*(€|eur|euro|zł|pln|km)?$/i)
    if (kwota) {
      const n = kwota[1].replace(/\D/g, "")
      const jednostka = (kwota[2] ?? "").toLowerCase()
      if (jednostka === "km") w.przebieg = n
      else if (jednostka) { w.cena = n; w.waluta = /zł|pln/.test(jednostka) ? "pln" : "eur" }
      else liczby.push(n)
      continue
    }
    if (nazwa.length < 2) nazwa.push(l)
  }
  // Same liczby bez jednostki: najpierw przebieg, potem cena, jak w liście kontrahenta.
  for (const n of liczby) {
    if (w.przebieg === undefined) w.przebieg = n
    else if (w.cena === undefined) w.cena = n
  }
  if (nazwa.length || nadwozie) w.auto = [...nazwa, nadwozie].filter(Boolean).join(" ")
  if (atuty.length) w.atuty = atuty.join("\n")
  return w
}

// Styl właściciela (facebook.com/autosprowadzone): tysiące spacją w cenie i przebiegu, „04.2018” w linii danych.
const spacja = (s: string) => (s.trim() === "" ? "" : String(Number(s.replace(/\D/g, ""))).replace(/\B(?=(\d{3})+(?!\d))/g, " "))
const rok = (o: Ogloszenie) => o.rejestracja.match(/(\d{4})$/)?.[1] ?? ""
const miesiac = (o: Ogloszenie) => o.rejestracja.match(/(\d{2})[./-](\d{4})$/)?.slice(1).join(".") ?? o.rejestracja
const pojemnosc = (o: Ogloszenie) => o.wersja.match(/\b(\d\.\d)\b/)?.[1] ?? ""

const W_KRAJU: Record<string, string> = {
  DE: "w Niemczech", DK: "w Danii", NL: "w Holandii", BE: "w Belgii", FR: "we Francji", SE: "w Szwecji", AT: "w Austrii", IT: "we Włoszech",
  ES: "w Hiszpanii", LU: "w Luksemburgu", CH: "w Szwajcarii", CZ: "w Czechach",
}

function wzorWlasciciela(o: Ogloszenie, wzor: string, skad: string) {
  // Typ ceny dostawcy z Danii: margin = z VAT (system marży), netto = bez VAT.
  const typ = o.typCeny === "margin" ? " (brutto, VAT marża)" : o.typCeny === "netto" ? " (netto, bez VAT)" : ""
  const kwota = o.cena.trim() ? `${spacja(o.cena)} ${o.waluta === "eur" ? "€" : "zł"}${typ}` : ""
  const nazwa = [o.auto, o.wersja].filter(Boolean).join(" ")
  if (wzor === "oferta") {
    const dane = [miesiac(o), o.przebieg.trim() && `${liczba(o.przebieg)} km`, moc(o), o.paliwo.toLowerCase(), o.skrzynia.toLowerCase()].filter(Boolean).join(" · ")
    return linie(
      "OFERTA SPROWADZENIA" + (skad ? ` ${skad.toUpperCase()}` : ""), nazwa, dane, o.kolor, ODSTEP, kwota && `Cena: ${kwota}`,
      ...(atuty(o).length ? [ODSTEP, `Wyposażenie: ${atuty(o).join(", ")}`] : []),
      ODSTEP, "Zainteresowany? Napisz wiadomość.",
    )
  }
  const silnik = [[pojemnosc(o), o.paliwo.toLowerCase()].filter(Boolean).join(" "), moc(o), o.skrzynia.toLowerCase()].filter(Boolean).join(", ")
  return linie(
    `Możliwość sprowadzenia na zamówienie: ${o.auto}${rok(o) ? ` (${rok(o)})` : ""}${skad ? ` ${skad}` : ""}`, ODSTEP,
    W_KRAJU[o.kraj] ? `Nasz zaufany kontrahent ${W_KRAJU[o.kraj]} posiada na sprzedaż następujący pojazd. Możemy zająć się całym procesem jego sprowadzenia.`
      : "Posiadamy na sprzedaż następujący pojazd.", ODSTEP,
    nazwa && `• Model: ${nazwa}`, o.rejestracja && `• Data pierwszej rejestracji: ${o.rejestracja}`, silnik && `• Silnik: ${silnik}`,
    o.przebieg.trim() && `• Przebieg: ${spacja(o.przebieg)} km`, o.kolor && `• Kolor: ${o.kolor}`, o.vin && `• VIN: ${o.vin}`,
    ...(atuty(o).length ? [ODSTEP, "Najważniejsze informacje o tym egzemplarzu:", ...atuty(o).map((a) => `• ${a}`)] : []),
    ODSTEP, kwota && `Cena za auto: ${kwota}`, ODSTEP,
    skad && "Zajmujemy się całością procesu importu: weryfikacją, transportem i formalnościami.", ODSTEP,
    "Jeśli jesteś zainteresowany sprowadzeniem tego konkretnego egzemplarza lub szukasz podobnego modelu, napisz do nas wiadomość.",
  )
}

// Puste pola znikają z tekstu, więc ogłoszenie da się zrobić z samą nazwą i ceną.
export function ogloszenie(o: Ogloszenie, wzor: string) {
  const [, , flaga, skad] = kraj(o) ?? ["", "", "", ""]
  if (wzor === "zamowienie" || wzor === "oferta") return wzorWlasciciela(o, wzor, skad)
  return linie(`${flaga} ${o.auto}`.trim(), o.vin, o.wersja, o.paliwo, o.rejestracja, przebieg(o), moc(o), cena(o), ...atuty(o).map((a) => `✅ ${a}`))
}

// „Zrób ogłoszenie” w oknie auta Auto1: numer auta czeka w pamięci karty, podstrona Ogłoszenia go zabiera.
const KLUCZ_AUTA = "ar_ogloszenie_auto1"

export function zrobOgloszenie(id: string) {
  try {
    sessionStorage.setItem(KLUCZ_AUTA, id)
  } catch {
    // bez pamięci: strona Ogłoszenia otworzy się pusta
  }
  window.location.hash = "#/ogloszenia"
}

export function autoDoOgloszenia(usun = false) {
  try {
    const id = sessionStorage.getItem(KLUCZ_AUTA)
    if (usun) sessionStorage.removeItem(KLUCZ_AUTA)
    return id
  } catch {
    return null
  }
}

const wielka = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

// Auto z nocnego skanu Auto1 → pola ogłoszenia. Auto1 nie podaje w liście VIN-u ani ceny sprzedaży: dopisuje się je w tekście.
export function ogloszenieZAuto1(r: Auto, s?: Szczegoly, domyslnyKraj = "DE"): Ogloszenie {
  const nazwa = [r.make, r.model].filter(Boolean).join(" ")
  const kraj = s?.country ?? s?.countryCode
  return {
    ...POLA_OGLOSZENIA,
    kraj: kraj && KRAJE_OGLOSZEN.some(([k]) => k === kraj) ? kraj : domyslnyKraj,
    auto: nazwa || r.title,
    wersja: nazwa && r.title.startsWith(nazwa) ? r.title.slice(nazwa.length).trim() : r.title,
    paliwo: r.fuel ? wielka(FUEL[r.fuel] ?? r.fuel) : "",
    skrzynia: r.gear ? wielka(GEAR[r.gear] ?? r.gear) : "",
    rejestracja: r.reg ? `${r.reg.slice(5, 7)}.${r.reg.slice(0, 4)}` : "",
    przebieg: r.km != null ? String(r.km) : "",
    moc: r.hp != null ? String(r.hp) : "",
    atuty: wyposazenie(s).map(wielka).join("\n"),
    kolor: typeof s?.colour === "string" ? kolorPL(s.colour) ?? s.colour : "",
  }
}
