import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { powodBraku, przygotuj } from "@/lib/auta"
import type { Auto } from "@/lib/dane"
import { zPliku } from "@/lib/dania"
import { linkMobile } from "@/lib/mobile"

// Dzisiejsze dane: lokalna kopia z public/test-dane, a bez niej (GitHub Actions) plik z migawki.
const MIGAWKA = "https://666dynamic.github.io/autoradar-migawka/"
async function plik(nazwa: string) {
  const lokalny = `public/test-dane/${nazwa}`
  if (existsSync(lokalny)) return JSON.parse(readFileSync(lokalny, "utf8"))
  const o = await fetch(MIGAWKA + nazwa)
  if (!o.ok) throw new Error(`${nazwa}: ${o.status}`)
  return o.json()
}
// Polska etykieta nie może być surowym kodem z nocy (WIELKIE_LITERY_Z_PODKRESLENIEM ani angielskim słowem).
const ANGIELSKIE = /^[A-Z0-9_]{4,}$|^(petrol|electro|electric|hybrid|manual|automatic|other|gas|duplex)$/

function sprawdz(rows: Auto[], nazwa: string) {
  const w = przygotuj(rows)
  it(`${nazwa}: paliwo, skrzynia i typ aukcji po polsku`, () => {
    const zle = w.flatMap((r) => [r._fuel, r._gear, r._label].filter((x) => ANGIELSKIE.test(x)).map((x) => `${r.id}: ${x}`))
    expect(zle.slice(0, 10)).toEqual([])
  })
  it(`${nazwa}: różnica = Otomoto − cena`, () => {
    const zle = w.filter((r) => r.d_eur != null && r.o_eur != null && r.a_eur != null && Math.abs(r.o_eur - r.a_eur - r.d_eur) > 1)
    expect(zle.map((r) => r.id).slice(0, 10)).toEqual([])
  })
  it(`${nazwa}: auto bez różnicy ma powód po polsku`, () => {
    const zle = w.filter((r) => r.d_eur == null).map((r) => [r.id, powodBraku(r)]).filter(([, p]) => !p || /[a-z]+_[a-z]+/.test(p))
    expect(zle.slice(0, 10)).toEqual([])
  })
}

describe("prawdziwe dane", async () => {
  const auto1 = await plik("data.json")
  const dania = zPliku(await plik("dania.json"))
  sprawdz(auto1.rows, "Auto1")
  sprawdz(dania.rows, "Dania")
  it("Dania: każde porównane auto ma link mobile.de z cn=DE", () => {
    const porownane = dania.rows.filter((r) => r.total != null)
    const bez = porownane.filter((r) => !linkMobile(r)?.includes("cn=DE")).map((r) => `${r.id} ${r.make}|${r.model}`)
    expect(bez.slice(0, 10)).toEqual([])
  })
})
