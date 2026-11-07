import { describe, expect, it } from "vitest"

import { kolorOferty, przelicz, rachunek, type Koszt, type MojeAuto } from "@/lib/moje-auta"

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

  it("cena minimalna = koszt całkowity + minimalny zysk; zysk i procent od ceny sprzedaży", () => {
    const a = auto({ min_zysk_kwota: 4300, wystawienie_kwota: 55900 })
    const r = rachunek(a, [], 4.3, "PLN")
    expect(r.razem).toBeCloseTo(43000)
    expect(r.minimalna).toBeCloseTo(47300)
    expect(r.zysk).toBeCloseTo(12900)
    expect(r.procent).toBeCloseTo((12900 / 55900) * 100)
    expect(r.zakonczone).toBe(false)
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

  it("kolor oferty klienta", () => {
    expect(kolorOferty(46000, 47300, 55900)).toBe("czerwona")
    expect(kolorOferty(50000, 47300, 55900)).toBe("pomaranczowa")
    expect(kolorOferty(55900, 47300, 55900)).toBe("zielona")
    expect(kolorOferty(48000, 47300, null)).toBe("zielona")
    expect(kolorOferty(null, 47300, 55900)).toBeNull()
  })
})
