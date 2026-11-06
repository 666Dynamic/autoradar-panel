import { describe, expect, it } from "vitest"

import { kolorPL, noteLabel, pasuje, powodBraku, przygotuj, szukane, zakonczona } from "@/lib/auta"
import type { Auto } from "@/lib/dane"
import { zPliku } from "@/lib/dania"
import { linkMobile } from "@/lib/mobile"
import { ostrzezenie } from "@/lib/ostrzezenia"

// Jedno auto z sensownymi wartościami; testy zmieniają tylko to, co sprawdzają.
const auto = (z: Partial<Auto> = {}): Auto => ({
  id: "AB12345", title: "Volkswagen Golf 1.5 TSI", auto1_url: null, search_url: null, note: null, reg: "2020-05", fuel: "petrol",
  hp: 150, km: 80000, unroadworthy: false, gear: "manual", liters: 1.5, make: "Volkswagen", model: "Golf", auction: "24D1", body: null,
  image: null, end_ms: null, bid_eur: null, bid_pln: null, total: 5, compared: 5, a_eur: 10000, a_pln: 42000, o_eur: 15000, o_pln: 63000,
  d_eur: 5000, d_pln: 21000, t: 3500, ok: true, ...z,
})

describe("wyszukiwanie", () => {
  const [golf] = przygotuj([auto()])
  it("po numerze, marce i modelu, bez wielkości liter", () => {
    expect(pasuje(golf, szukane("ab123"))).toBe(true)
    expect(pasuje(golf, szukane("golf"))).toBe(true)
    expect(pasuje(golf, szukane("VW polo"))).toBe(false)
  })
  it("sklejone słowa: „e220” znajduje „E 220 d”, ale nie „GLE 220”", () => {
    const [e, gle] = przygotuj([auto({ make: "Mercedes-Benz", model: "E", title: "E 220 d" }), auto({ make: "Mercedes-Benz", model: "GLE", title: "GLE 220 d" })])
    expect(pasuje(e, szukane("e220"))).toBe(true)
    expect(pasuje(gle, szukane("e220"))).toBe(false)
  })
})

describe("etykiety", () => {
  it("aukcje dealerskie po polsku, także nowe kody", () => {
    const w = przygotuj([auto({ auction: "3RD_PARTY_BIDDING_OPEN" }), auto({ auction: "3RD_PARTY_COS_NOWEGO" }), auto({ auction: "REMA_BIDDING_OPEN" })])
    expect(w.map((r) => r._label)).toEqual(["Aukcja dealerska", "Aukcja dealerska", "Dealerska REMA"])
    expect(w.every((r) => r._dealer)).toBe(true)
  })
  it("paliwo electro i electric to to samo", () => {
    expect(przygotuj([auto({ fuel: "electro" }), auto({ fuel: "electric" })]).map((r) => r._fuel)).toEqual(["elektryczny", "elektryczny"])
  })
  it("kolory: metalik, duńskie nazwy, VIN to nie kolor", () => {
    expect(kolorPL("Grey Metallic")).toBe("szary metalik")
    expect(kolorPL("Sort")).toBe("czarny")
    expect(kolorPL("WVWZZZAUZLW123456")).toBeNull()
  })
  it("brak ofert to nie błąd", () => {
    expect(powodBraku(auto({ note: null, total: 0 }))).toBe("brak pasujących ofert w Otomoto")
    expect(noteLabel("error: timeout")).toBe("błąd pobrania z Otomoto")
  })
})

describe("ostrzeżenia i aukcje", () => {
  it("kwalifikujące się auto z jedną ofertą dostaje ostrzeżenie", () => {
    expect(ostrzezenie(auto({ compared: 1 }))).toBe("1 oferta")
    expect(ostrzezenie(auto({ compared: 3 }))).toBeNull()
    expect(ostrzezenie(auto({ compared: 1, ok: false }))).toBeNull()
  })
  it("zakończona aukcja", () => {
    expect(zakonczona(auto({ end_ms: Date.now() - 1000 }))).toBe(true)
    expect(zakonczona(auto({ end_ms: Date.now() + 60000 }))).toBe(false)
  })
})

describe("link mobile.de", () => {
  it("te same zasady co Otomoto i zawsze Niemcy", () => {
    const u = new URL(linkMobile(auto())!)
    expect(u.searchParams.get("cn")).toBe("DE")
    expect(u.searchParams.get("fr")).toBe("2018:2022")
    expect(u.searchParams.get("ml")).toBe(":120000")
    expect(u.searchParams.get("pw")).toBe("103:118") // 140–160 KM w kW
    expect(u.searchParams.get("dam")).toBe("false")
    expect(u.searchParams.get("tr")).toBe("MANUAL_GEAR")
  })
  it("duńskie nazwy modeli i elektryk bez filtra skrzyni", () => {
    const u = new URL(linkMobile(auto({ make: "Tesla", model: "Model Y", fuel: "electric", gear: "manual" }))!)
    expect(u.searchParams.getAll("ms")).toEqual(["135;6"])
    expect(u.searchParams.has("tr")).toBe(false)
  })
})

describe("Dania", () => {
  it("auto bez mocy zostaje z rocznikiem i paliwem dostawcy", () => {
    const d = zPliku({ meta: {} as never, cars: [{ id: "DK-X", title: "Kia Niro", status: "unparsed", reg_date: "2021-03-01", type: "PHEV", a_eur: 9000 }] } as never, "https://x/dania.json")
    const [r] = d.rows
    expect(r.reg).toBe("2021-03")
    expect(r.fuel).toBe("hybrid")
    expect(r.dania?.powod).toBe("dostawca nie podał mocy")
  })
  it("skrzynia z domysłu daje ostrzeżenie", () => {
    const d = zPliku({ meta: {} as never, cars: [{ id: "DK-Y", title: "Volvo V90", status: "ok", gear_guess: true, d_eur: 5000, ok: true, compared: 4 }] } as never, "https://x/dania.json")
    expect(ostrzezenie(d.rows[0])).toBe("skrzynia?")
  })
})
