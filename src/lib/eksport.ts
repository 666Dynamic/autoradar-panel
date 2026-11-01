import { FUEL, GEAR, litersLabel, offersLabel, regLabel, type Wiersz } from "@/lib/auta"

export async function pobierzExcel(auta: Wiersz[]) {
  const { default: zapisz } = await import("write-excel-file/browser")
  const naglowki = ["Numer", "Auto", "Rocznik", "Pojemność", "Przebieg (km)", "Moc (KM)", "Paliwo", "Skrzynia", "Auto1 (EUR)", "Otomoto (EUR)", "Różnica (EUR)", "Ofert", "Typ aukcji", "Link Otomoto", "Link Auto1"]
  const tekst = (value: string | null | undefined) => ({ value: value ?? "" })
  const liczba = (value: number | null | undefined) => ({ value: value == null ? null : Math.round(value), type: Number })
  const wiersze = [
    naglowki.map((value) => ({ value, fontWeight: "bold" as const })),
    ...auta.map((r) => [
      tekst(r.id), tekst(r.title), tekst(regLabel(r)), tekst(litersLabel(r)), liczba(r.km), liczba(r.hp),
      tekst((r.fuel && FUEL[r.fuel]) || r.fuel), tekst((r.gear && GEAR[r.gear]) || r.gear),
      liczba(r.a_eur), liczba(r.o_eur), liczba(r.d_eur), tekst(offersLabel(r)), tekst(r._label), tekst(r.search_url), tekst(r.auto1_url),
    ]),
  ]
  await zapisz(wiersze as never).toFile("autoradar-zaznaczone.xlsx")
}
