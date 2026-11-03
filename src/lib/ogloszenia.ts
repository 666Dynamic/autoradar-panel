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
