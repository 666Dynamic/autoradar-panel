// Darmowe rozpoznawanie VIN bez zewnętrznych serwisów (darmowy dekoder NHTSA nie zna modeli aut z Europy,
// a roczniki podaje błędnie). Marka z pierwszych 3 znaków (WMI). Model z kodów producenta: grupa VW znaki 7–8,
// Mercedes znaki 4–6. Rocznik tylko dla grupy VW (znak 10), bo tylko ona wpisuje go pewnie w autach z Europy.
// Gdy jeden kod pasuje do dwóch modeli (np. Škoda Scala i Kamiq), zwracamy obu kandydatów zamiast zgadywać.

const WMI_MAREK: Record<string, string> = {
  "Mercedes-Benz": "WDB WDC WDD WDF W1K W1N W1V W1W WMX",
  BMW: "WBA WBS WBY WBX 4US 5UX 5YM X4X",
  Audi: "WAU WUA WA1 TRU",
  Volkswagen: "WVW WVG WV1 WV2 WV3 1VW 3VW",
  Škoda: "TMB",
  Seat: "VSS",
  Porsche: "WP0 WP1",
  Opel: "W0L W0V VXK",
  Ford: "WF0 WF1 1FA 1FM 2FM",
  Peugeot: "VF3 VR3",
  Citroën: "VF7 VR7",
  DS: "VR1",
  Renault: "VF1 VF6 VNV",
  Dacia: "UU1 VGA",
  Fiat: "ZFA",
  "Alfa Romeo": "ZAR",
  Lancia: "ZLA",
  Jeep: "ZAC 1C4 1J4",
  Volvo: "YV1 YV2 YV4 LVY",
  Toyota: "JTD JTE JTN JTM JTK SB1 NMT VNK",
  Lexus: "JTH JTJ",
  Nissan: "SJN JN1 JN8 VSK",
  Honda: "JHM SHH SHS",
  Mazda: "JMZ JM1",
  Mitsubishi: "JMB JMY MMB",
  Subaru: "JF1 JF2",
  Suzuki: "JS1 JS2 JS3 JSA TSM MA3",
  Hyundai: "KMH TMA NLH",
  Kia: "KNA KNE U5Y U6Y",
  Jaguar: "SAJ",
  "Land Rover": "SAL",
  Mini: "WMW",
  Smart: "WME",
  Tesla: "5YJ LRW XP7 7SA",
}
const WMI: Record<string, string> = {}
for (const [marka, kody] of Object.entries(WMI_MAREK)) for (const k of kody.split(" ")) WMI[k] ??= marka

type Modele = Record<string, string | string[]>
const MODELE_VAG: Record<string, Modele> = {
  Volkswagen: {
    "1K": "Golf", "5K": "Golf", AU: "Golf", "5G": "Golf", CD: "Golf", "3C": "Passat", "3G": "Passat", "6R": "Polo", AW: "Polo",
    "5N": "Tiguan", AD: ["Tiguan", "Tiguan Allspace"], "1T": "Touran", "5T": "Touran", "7N": "Sharan", "7L": "Touareg", "7P": "Touareg",
    CR: "Touareg", A1: "T-Roc", C1: "T-Cross", "3H": "Arteon", E1: "ID.3", E2: "ID.4", "2K": "Caddy", SB: "Caddy", "7H": "Transporter",
    "7J": "Transporter", "7E": "Transporter", SG: "Transporter", SH: "Transporter", "2E": "Crafter", SY: "Crafter", SZ: "Crafter",
  },
  Audi: {
    "8X": "A1", GB: "A1", "8P": "A3", "8V": "A3", "8Y": "A3", "8K": "A4", "8W": "A4", "8T": "A5", F5: "A5", "4F": "A6", "4G": ["A6", "A7"],
    "4A": "A6", "4K": "A7", "4H": "A8", "4N": "A8", GA: "Q2", "8U": "Q3", F3: "Q3", "8R": "Q5", FY: "Q5", "4L": "Q7", "4M": ["Q7", "Q8"],
    "8J": "TT", FV: "TT",
  },
  Škoda: { "5J": "Fabia", NJ: "Fabia", PJ: "Fabia", "1Z": "Octavia", "5E": "Octavia", NX: "Octavia", "3T": "Superb", "3V": "Superb", NS: "Kodiaq", NU: "Karoq", NW: ["Scala", "Kamiq"] },
  Seat: { "6J": "Ibiza", KJ: ["Ibiza", "Arona"], "1P": "Leon", "5F": ["Leon", "Ateca"], KL: "Leon", "5P": "Altea", "7N": "Alhambra", KN: "Tarraco" },
}
const MODELE_MB: Modele = {
  "169": "Klasa A", "176": "Klasa A", "177": "Klasa A", "245": "Klasa B", "246": "Klasa B", "203": "Klasa C", "204": "Klasa C", "205": "Klasa C",
  "206": "Klasa C", "211": "Klasa E", "212": "Klasa E", "213": "Klasa E", "214": "Klasa E", "207": "Klasa E", "238": "Klasa E", "221": "Klasa S",
  "222": "Klasa S", "223": "Klasa S", "117": "CLA", "118": "CLA", "218": "CLS", "257": "CLS", "156": "GLA", "253": "GLC", "254": "GLC",
  "164": "GLE", "166": "GLE", "167": "GLE", "292": "GLE", "906": "Sprinter", "907": "Sprinter", "910": "Sprinter", "639": "Vito", "293": "EQC",
}
const ROK_VIN = "ABCDEFGHJKLMNPRSTVWXY123456789"

export type Rozpoznanie = { marka: string | null; model: string | null; kandydaci: string[]; rok: number | null }

// Tylko znaki dozwolone w VIN (bez I, O, Q), wielkimi literami.
export const czystyVin = (s: string) => s.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17)

export function rozpoznajVin(vin: string, terazRok = new Date().getFullYear()): Rozpoznanie | null {
  const v = czystyVin(vin)
  if (v.length !== 17) return null
  const marka = WMI[v.slice(0, 3)] ?? null
  let wynik: string | string[] | undefined
  let rok: number | null = null
  if (marka && MODELE_VAG[marka]) {
    wynik = MODELE_VAG[marka][v.slice(6, 8)]
    const i = ROK_VIN.indexOf(v[9])
    if (i >= 0) rok = 2010 + i > terazRok ? 1980 + i : 2010 + i
  }
  if (marka === "Mercedes-Benz") wynik = MODELE_MB[v.slice(3, 6)]
  const kandydaci = Array.isArray(wynik) ? wynik : []
  return { marka, model: typeof wynik === "string" ? wynik : null, kandydaci, rok }
}
