// Darmowe sprawdzenie auta po VIN: tylko linki otwierane przez właściciela w jego przeglądarce.
// Panel niczego z tych stron sam nie pobiera. Wzory adresów sprawdzone 11.11.2026.
export type Link = { nazwa: string; url: string }

// Auto1 nie podaje VIN-u w danych skanu: carVertical otwiera się bez numeru, VIN wpisuje się z aukcji.
export const CARVERTICAL: Link = { nazwa: "carVertical", url: "https://www.carvertical.com/pl" }

export function linkiSprawdzenia(vin: string | null | undefined, dania: boolean): Link[] {
  const v = (vin ?? "").trim().toUpperCase()
  if (v.length !== 17) return []
  const e = encodeURIComponent(v)
  return [
    ...(dania ? [
      { nazwa: "Przeglądy DK", url: `https://findsynsrapport.esyn.dk/result?chassisNumber=${e}` },
      { nazwa: "Tjekbil", url: `https://www.tjekbil.dk/stelnummer/${e}/overblik` },
      { nazwa: "Nummerplade", url: `https://www.nummerplade.net/nummerplade/${e}.html` },
    ] : []),
    { nazwa: "carVertical", url: `https://www.carvertical.com/pl/precheck?vin=${e}` },
  ]
}
