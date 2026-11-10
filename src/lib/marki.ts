// Marki i modele do wyboru w „Dodaj auto” (nazwy jak na Otomoto). Wpisanie spoza listy też działa.
export const MARKI: Record<string, string[]> = {
  "Alfa Romeo": ["Giulia", "Giulietta", "Stelvio", "Tonale"],
  Audi: ["A1", "A3", "A4", "A4 Allroad", "A5", "A6", "A6 Allroad", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron", "TT"],
  BMW: ["Seria 1", "Seria 2", "Seria 3", "Seria 4", "Seria 5", "Seria 6", "Seria 7", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "i3", "iX"],
  Citroën: ["C3", "C4", "C5 Aircross", "Berlingo", "Jumpy"],
  Cupra: ["Formentor", "Born", "Leon"],
  Dacia: ["Duster", "Sandero", "Logan", "Jogger"],
  DS: ["DS 3", "DS 4", "DS 7"],
  Fiat: ["500", "Panda", "Tipo", "Ducato", "Doblo"],
  Ford: ["Fiesta", "Focus", "Mondeo", "Kuga", "Puma", "S-Max", "Galaxy", "Transit", "Transit Custom", "Ranger"],
  Honda: ["Civic", "CR-V", "HR-V", "Jazz"],
  Hyundai: ["i20", "i30", "Tucson", "Kona", "Santa Fe", "Ioniq 5"],
  Jaguar: ["XE", "XF", "F-Pace", "E-Pace"],
  Jeep: ["Compass", "Renegade", "Grand Cherokee"],
  Kia: ["Ceed", "Sportage", "Niro", "Sorento", "Picanto", "EV6"],
  Lancia: ["Ypsilon"],
  "Land Rover": ["Range Rover Evoque", "Range Rover Sport", "Discovery Sport", "Defender", "Range Rover Velar"],
  Lexus: ["NX", "RX", "UX", "IS"],
  Mazda: ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60"],
  "Mercedes-Benz": ["Klasa A", "Klasa B", "Klasa C", "Klasa E", "Klasa S", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "Vito", "V-Klasa", "Sprinter", "EQC"],
  Mini: ["Cooper", "Countryman", "Clubman"],
  Mitsubishi: ["ASX", "Outlander", "L200"],
  Nissan: ["Qashqai", "Juke", "X-Trail", "Leaf", "Navara"],
  Opel: ["Astra", "Corsa", "Insignia", "Mokka", "Grandland", "Zafira", "Vivaro"],
  Peugeot: ["208", "308", "508", "2008", "3008", "5008", "Partner", "Expert"],
  Porsche: ["Cayenne", "Macan", "Panamera", "911", "Taycan"],
  Renault: ["Clio", "Megane", "Captur", "Kadjar", "Austral", "Arkana", "Trafic", "Master"],
  Seat: ["Ibiza", "Leon", "Ateca", "Arona", "Tarraco", "Alhambra", "Altea"],
  Smart: ["ForTwo", "ForFour"],
  Subaru: ["Forester", "Outback", "XV"],
  Suzuki: ["Swift", "Vitara", "SX4 S-Cross", "Ignis", "Jimny", "Baleno"],
  Škoda: ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq", "Enyaq"],
  Tesla: ["Model 3", "Model Y", "Model S"],
  Toyota: ["Yaris", "Corolla", "C-HR", "RAV4", "Camry", "Proace", "Hilux"],
  Volkswagen: ["Polo", "Golf", "Passat", "Arteon", "T-Roc", "T-Cross", "Tiguan", "Tiguan Allspace", "Touareg", "Touran", "Sharan", "ID.3", "ID.4", "Caddy", "Transporter", "Crafter"],
  Volvo: ["V40", "V60", "V90", "S60", "S90", "XC40", "XC60", "XC90"],
}

export const PALIWA = ["Diesel", "Benzyna", "Hybryda", "Hybryda plug-in", "Elektryczny", "Benzyna + LPG"]
export const SKRZYNIE = ["Automatyczna", "Manualna"]
export const ZRODLA = [
  ["auto1", "Auto1"],
  ["inna_aukcja", "Inna aukcja"],
  ["handlarz", "Handlarz / komis"],
  ["prywatnie", "Prywatnie"],
  ["inne", "Inne"],
] as const

// Paliwo i skrzynia z nocnego skanu Auto1 (kody Auto1) na nazwy z listy.
const PALIWO_AUTO1: Record<string, string> = { diesel: "Diesel", petrol: "Benzyna", hybrid: "Hybryda", electro: "Elektryczny", electric: "Elektryczny", gas: "Benzyna + LPG" }
export const paliwoZAuto1 = (k: string | null) => (k && PALIWO_AUTO1[k]) || null
export const skrzyniaZAuto1 = (k: string | null) => (!k ? null : k === "manual" ? "Manualna" : "Automatyczna")
// Auto1 pisze „Skoda”, lista ma „Škoda”.
export const markaZAuto1 = (m: string | null) => (!m ? null : Object.keys(MARKI).find((x) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() === m.toLowerCase()) ?? m)

// Wyszukiwanie na Otomoto z zasadami porównania: rocznik ±2, przebieg do +40.000 km.
const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/^klasa (\w)$/, "$1-klasa").replace(/^seria (\d)$/, "seria-$1").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
export function linkOtomoto(marka: string, model: string, rok: number | null, km: number | null): string {
  const q = new URLSearchParams()
  if (rok) {
    q.set("search[filter_float_year:from]", String(rok - 2))
    q.set("search[filter_float_year:to]", String(rok + 2))
  }
  if (km) q.set("search[filter_float_mileage:to]", String(km + 40000))
  const s = q.toString()
  return `https://www.otomoto.pl/osobowe/${slug(marka)}/${slug(model)}${s ? "?" + s : ""}`
}
