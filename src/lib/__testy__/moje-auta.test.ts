import { describe, expect, it } from "vitest"

import { przelicz, przesun, rachunek, zPolskiej, type Koszt, type MojeAuto, type Zdjecie } from "@/lib/moje-auta"

const auto = (z: Partial<MojeAuto> = {}): MojeAuto => ({
  id: "a", utworzono: "", zmieniono: "", status: "kupione", nazwa: "Audi", rok: 2019, vin: null, przebieg_km: null,
  zrodlo: "auto1", zrodlo_id: null, link: null, zakup_kwota: 10000, zakup_waluta: "EUR", zakup_data: null, przyjazd_data: null,
  wystawienie_kwota: null, min_zysk_kwota: null, sprzedaz_waluta: "PLN", sprzedaz_kwota: null, sprzedaz_data: null, notatka: "", lista: {}, ...z,
})
const koszt = (kwota: number, waluta: "EUR" | "PLN"): Koszt => ({ id: String(kwota), auto_id: "a", kategoria: "transport", opis: "", kwota, waluta, data: null })

describe("Moje auta: rachunki", () => {
  it("przelicza waluty kursem zł za euro", () => {
    expect(przelicz(100, "EUR", "PLN", 4.3)).toBeCloseTo(430)
    expect(przelicz(430, "PLN", "EUR", 4.3)).toBeCloseTo(100)
    expect(przelicz(null, "EUR", "PLN", 4.3)).toBeNull()
  })

  it("koszt całkowity = zakup + koszty w różnych walutach", () => {
    const r = rachunek(auto(), [koszt(500, "EUR"), koszt(860, "PLN")], 4.3, "EUR")
    expect(r.koszty).toBeCloseTo(700)
    expect(r.razem).toBeCloseTo(10700)
  })

  it("zysk przy cenie wystawienia, w walucie widoku", () => {
    const r = rachunek(auto({ wystawienie_kwota: 55900 }), [], 4.3, "PLN")
    expect(r.razem).toBeCloseTo(43000)
    expect(r.cena).toBeCloseTo(55900)
    expect(r.zysk).toBeCloseTo(12900)
    expect(r.zakonczone).toBe(false)
    expect(rachunek(auto({ wystawienie_kwota: 55900 }), [], 4.3, "EUR").zysk).toBeCloseTo(3000)
  })

  it("po sprzedaży zysk liczy się z ceny sprzedaży, nie wystawienia", () => {
    const r = rachunek(auto({ wystawienie_kwota: 55900, sprzedaz_kwota: 50000 }), [], 4.3, "PLN")
    expect(r.zysk).toBeCloseTo(7000)
    expect(r.zakonczone).toBe(true)
  })

  it("bez ceny zakupu nie ma kosztu całkowitego ani zysku", () => {
    const r = rachunek(auto({ zakup_kwota: null, wystawienie_kwota: 50000 }), [koszt(100, "PLN")], 4.3, "PLN")
    expect(r.razem).toBeNull()
    expect(r.zysk).toBeNull()
  })

  it("przesuwanie zdjęć zmienia numery tylko tych, które ruszyły", () => {
    const z = (id: string, kolejnosc: number): Zdjecie => ({ id, auto_id: "a", sciezka: id, rodzaj: "moje", opis: "", kolejnosc })
    const lista = [z("a", 0), z("b", 1), z("c", 2), z("d", 3)]
    expect(przesun(lista, 2, 0)).toEqual([{ id: "c", kolejnosc: 0 }, { id: "a", kolejnosc: 1 }, { id: "b", kolejnosc: 2 }])
    expect(przesun(lista, 1, 2)).toEqual([{ id: "c", kolejnosc: 1 }, { id: "b", kolejnosc: 2 }])
    expect(przesun(lista, 0, 0)).toEqual([])
    expect(przesun(lista, 3, 4)).toEqual([])
  })

  it("daty po polsku", () => {
    expect(zPolskiej("07.11.2026")).toBe("2026-11-07")
    expect(zPolskiej("7.1.26")).toBe("2026-01-07")
    expect(zPolskiej("31.02.2026")).toBeNull()
    expect(zPolskiej("11/07/2026")).toBe("2026-07-11")
    expect(zPolskiej("jutro")).toBeNull()
  })
})
