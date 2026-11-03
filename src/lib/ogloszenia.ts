import { fmt } from "@/lib/auta"

// Kraj: flaga i „z …” do nagłówka. Polska bez sprowadzania, więc bez „z”.
export const KRAJE_OGLOSZEN: [string, string, string, string][] = [
  ["DE", "Niemcy", "🇩🇪", "z Niemiec"], ["DK", "Dania", "🇩🇰", "z Danii"], ["NL", "Holandia", "🇳🇱", "z Holandii"], ["BE", "Belgia", "🇧🇪", "z Belgii"],
  ["FR", "Francja", "🇫🇷", "z Francji"], ["SE", "Szwecja", "🇸🇪", "ze Szwecji"], ["AT", "Austria", "🇦🇹", "z Austrii"], ["IT", "Włochy", "🇮🇹", "z Włoch"],
  ["ES", "Hiszpania", "🇪🇸", "z Hiszpanii"], ["LU", "Luksemburg", "🇱🇺", "z Luksemburga"], ["CH", "Szwajcaria", "🇨🇭", "ze Szwajcarii"], ["CZ", "Czechy", "🇨🇿", "z Czech"],
  ["PL", "Polska", "🇵🇱", ""],
]

export const POLA_OGLOSZENIA = { kraj: "DE", auto: "", wersja: "", vin: "", paliwo: "", skrzynia: "", rejestracja: "", przebieg: "", moc: "", cena: "", waluta: "eur", atuty: "", kontakt: "" }
export type Ogloszenie = typeof POLA_OGLOSZENIA

export const WZORY: [string, string, string][] = [
  ["krotki", "Krótki", "Dane linijka pod linijką, jak dziś na WhatsAppie"],
  ["lista", "Z ikonami", "WhatsApp: pogrubiona nazwa i cena, ikony przy danych"],
  ["pelny", "Pełny", "Facebook lub grupa: nagłówek, opis importu, atuty i kontakt"],
]

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

// Puste pola znikają z tekstu, więc ogłoszenie da się zrobić z samą nazwą i ceną.
export function ogloszenie(o: Ogloszenie, wzor: string) {
  const [, , flaga, skad] = kraj(o) ?? ["", "", "", ""]
  const silnik = [o.paliwo, moc(o), o.skrzynia].filter(Boolean).join(" · ")
  if (wzor === "krotki") {
    return linie(`${flaga} ${o.auto}`.trim(), o.vin, o.wersja, o.paliwo, o.skrzynia, o.rejestracja, przebieg(o), moc(o), cena(o), ...atuty(o).map((a) => `✅ ${a}`), o.kontakt)
  }
  if (wzor === "lista") {
    return linie(
      `${flaga} *${o.auto || "Auto"}*`, o.wersja, ODSTEP,
      o.rejestracja && `📅 ${o.rejestracja}`, przebieg(o) && `🛣️ ${przebieg(o)}`, silnik && `⚙️ ${silnik}`, o.vin && `🔑 VIN: ${o.vin}`,
      ...(atuty(o).length ? [ODSTEP, ...atuty(o).map((a) => `✅ ${a}`)] : []),
      ODSTEP, cena(o) && `💶 *${cena(o)}*`, o.kontakt && `📞 ${o.kontakt}`,
    )
  }
  const naglowek = skad ? `${flaga} Na zamówienie ${skad}: ${o.auto}` : `${flaga} ${o.auto}`
  return linie(
    naglowek.trim(), ODSTEP,
    skad && `Nasz sprawdzony partner ${skad} ma na sprzedaż ten egzemplarz. Sprowadzimy go dla Ciebie od A do Z.`, ODSTEP,
    o.wersja && `🚗 Wersja: ${o.wersja}`, o.rejestracja && `📅 Pierwsza rejestracja: ${o.rejestracja}`, przebieg(o) && `🛣️ Przebieg: ${przebieg(o)}`,
    silnik && `⛽ Silnik: ${silnik}`, o.vin && `🔑 VIN: ${o.vin}`,
    ...(atuty(o).length ? [ODSTEP, "Najważniejsze o tym aucie:", ...atuty(o).map((a) => `✅ ${a}`)] : []),
    ODSTEP, cena(o) && `💶 Cena: ${cena(o)}`,
    skad && "Zajmujemy się całym importem: sprawdzeniem auta, transportem i formalnościami.",
    ODSTEP, `📩 Zainteresowany tym autem albo szukasz podobnego? Napisz wiadomość${o.kontakt ? ` lub zadzwoń: ${o.kontakt}` : "."}`,
  )
}
