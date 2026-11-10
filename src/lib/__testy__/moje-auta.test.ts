import { describe, expect, it } from "vitest"

import { linkOtomoto } from "@/lib/marki"
import { kwotaLiczba, kwotaTekst, przelicz, przesun, rachunek, zPolskiej, type MojeAuto, type Zdjecie } from "@/lib/moje-auta"
import { rozpoznajVin } from "@/lib/vin"

const auto = (z: Partial<MojeAuto> = {}): MojeAuto => ({
  id: "a", utworzono: "", zmieniono: "", status: "kupione", nazwa: "Audi", rok: 2019, vin: null, przebieg_km: null,
  marka: null, model: null, rej_miesiac: null, rej_rok: null, paliwo: null, skrzynia: null, moc_km: null, wlasciciele: null,
  zrodlo: "auto1", zrodlo_id: null, link: null, ogloszenie: null, zakup_kwota: 10000, zakup_waluta: "EUR", zakup_data: null, przyjazd_data: null,
  transport_kwota: null, wystawienie_kwota: null, min_zysk_kwota: null, sprzedaz_waluta: "EUR", sprzedaz_kwota: null, sprzedaz_data: null,
  notatka: "", lakier: "", szkody: [], lista: {}, ...z,
})

describe("Moje auta: rachunki", () => {
  it("przelicza waluty kursem zł za euro", () => {
    expect(przelicz(100, "EUR", "PLN", 4.3)).toBeCloseTo(430)
    expect(przelicz(430, "PLN", "EUR", 4.3)).toBeCloseTo(100)
    expect(przelicz(null, "EUR", "PLN", 4.3)).toBeNull()
  })

  it("koszt całkowity = zakup + transport + naprawy szkód", () => {
    const r = rachunek(auto({ transport_kwota: 450, szkody: [{ opis: "rysa", kwota: 250.5 }, { opis: "lusterko", kwota: null }] }), 4.3, "EUR")
    expect(r.koszty).toBeCloseTo(700.5)
    expect(r.razem).toBeCloseTo(10700.5)
  })

  it("zysk z ceny, za którą chcę sprzedać, w walucie widoku", () => {
    const r = rachunek(auto({ wystawienie_kwota: 13000 }), 4.3, "PLN")
    expect(r.razem).toBeCloseTo(43000)
    expect(r.zysk).toBeCloseTo(12900)
    expect(r.zakonczone).toBe(false)
    expect(rachunek(auto({ wystawienie_kwota: 13000 }), 4.3, "EUR").zysk).toBeCloseTo(3000)
  })

  it("po sprzedaży zysk liczy się z ceny sprzedaży", () => {
    const r = rachunek(auto({ wystawienie_kwota: 13000, sprzedaz_kwota: 12000 }), 4.3, "EUR")
    expect(r.zysk).toBeCloseTo(2000)
    expect(r.zakonczone).toBe(true)
  })

  it("bez ceny zakupu nie ma kosztu całkowitego ani zysku", () => {
    const r = rachunek(auto({ zakup_kwota: null, wystawienie_kwota: 5000, transport_kwota: 100 }), 4.3, "EUR")
    expect(r.razem).toBeNull()
    expect(r.zysk).toBeNull()
  })

  it("przesuwanie zdjęć zmienia numery tylko tych, które ruszyły", () => {
    const z = (id: string, kolejnosc: number): Zdjecie => ({ id, auto_id: "a", sciezka: id, rodzaj: "moje", opis: "", kolejnosc })
    const lista = [z("a", 0), z("b", 1), z("c", 2), z("d", 3)]
    expect(przesun(lista, 2, 0)).toEqual([{ id: "c", kolejnosc: 0 }, { id: "a", kolejnosc: 1 }, { id: "b", kolejnosc: 2 }])
    expect(przesun(lista, 0, 0)).toEqual([])
  })
})

describe("Moje auta: wpisywanie", () => {
  it("daty po polsku, też bez roku i bez kropek", () => {
    expect(zPolskiej("08.11.2026")).toBe("2026-11-08")
    expect(zPolskiej("8.11", 2026)).toBe("2026-11-08")
    expect(zPolskiej("15.3.04", 2026)).toBe("2004-03-15")
    expect(zPolskiej("7.1.26", 2026)).toBe("2026-01-07")
    expect(zPolskiej("12112026")).toBe("2026-11-12")
    expect(zPolskiej("31.02.2026")).toBeNull()
    expect(zPolskiej("jutro")).toBeNull()
  })

  it("kwoty z groszami i kropkami tysięcy", () => {
    expect(kwotaTekst("10250,5")).toBe("10.250,5")
    expect(kwotaTekst("169000")).toBe("169.000")
    expect(kwotaTekst("99.99")).toBe("99,99")
    expect(kwotaLiczba("10.250,50")).toBe(10250.5)
    expect(kwotaLiczba("")).toBeNull()
  })

  it("link do Otomoto z zasadami porównania", () => {
    expect(linkOtomoto("Mercedes-Benz", "Klasa C", 2019, 150000)).toBe(
      "https://www.otomoto.pl/osobowe/mercedes-benz/c-klasa?search%5Bfilter_float_year%3Afrom%5D=2017&search%5Bfilter_float_year%3Ato%5D=2021&search%5Bfilter_float_mileage%3Ato%5D=190000",
    )
    expect(linkOtomoto("Škoda", "Octavia", null, null)).toBe("https://www.otomoto.pl/osobowe/skoda/octavia")
  })
})

describe("VIN bez płatnych serwisów", () => {
  it("marka, model i rocznik grupy VW", () => {
    expect(rozpoznajVin("WVWZZZAUZJW000001", 2026)).toEqual({ marka: "Volkswagen", model: "Golf", kandydaci: [], rok: 2018 })
    expect(rozpoznajVin("wauzzz8v5ka000001", 2026)).toEqual({ marka: "Audi", model: "A3", kandydaci: [], rok: 2019 })
  })
  it("Mercedes: klasa bez rocznika", () => {
    expect(rozpoznajVin("WDD2050041R123456")).toEqual({ marka: "Mercedes-Benz", model: "Klasa C", kandydaci: [], rok: null })
  })
  it("ten sam kod dla dwóch modeli: wybór zamiast zgadywania", () => {
    expect(rozpoznajVin("TMBGJ7NW8L0000001", 2026)).toEqual({ marka: "Škoda", model: null, kandydaci: ["Scala", "Kamiq"], rok: 2020 })
  })
  it("inne marki: sama marka; nieznany albo za krótki VIN", () => {
    expect(rozpoznajVin("TSMLYD21S00000001")?.marka).toBe("Suzuki")
    expect(rozpoznajVin("SAJAA05P7JPA00001")?.model).toBeNull()
    expect(rozpoznajVin("XXX0000000000000A")?.marka).toBeNull()
    expect(rozpoznajVin("WVW123")).toBeNull()
  })
})
