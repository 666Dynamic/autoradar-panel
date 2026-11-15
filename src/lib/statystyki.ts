import { FUEL, GEAR } from "@/lib/auta"
import type { Auto } from "@/lib/dane"

export type Pozycja = { nazwa: string; opis?: string; ile: number }
export type Podzial = "modele" | "marki" | "typy"

// Auto1 dzieli modele na generacje („Golf VII”, „Golf VIII”); w statystyce to jeden model.
// Tesla zostaje bez zmian, bo „Model X”/„Model S” to nazwy, nie generacje.
export function bezGeneracji(make: string | null, model: string | null): string {
  const m = (model ?? "").trim()
  if (!m || /tesla/i.test(make ?? "")) return m
  return m.replace(/\s+(II|III|IV|V|VI|VII|VIII|IX)(?=\s|$)/g, "").trim()
}

function klucz(r: Auto, podzial: Podzial): Pozycja | null {
  if (!r.make) return null
  const model = `${r.make} ${bezGeneracji(r.make, r.model)}`.trim()
  if (podzial === "marki") return { nazwa: r.make, ile: 0 }
  if (podzial === "modele") return { nazwa: model, ile: 0 }
  const rok = Number(r.reg?.slice(0, 4))
  const od = Number.isFinite(rok) && rok > 0 ? Math.floor(rok / 5) * 5 : null
  const opis = [r.fuel ? (FUEL[r.fuel] ?? r.fuel) : "?", r.gear ? (GEAR[r.gear] ?? r.gear) : "?", od ? `${od}–${od + 4}` : "rocznik ?"].join(" · ")
  return { nazwa: model, opis, ile: 0 }
}

// Ile aut z dzisiejszej listy Auto1 przypada na model, markę albo typ (model, paliwo, skrzynia, rocznik po 5 lat).
export function najczestsze(rows: Auto[], podzial: Podzial, ile = 5): Pozycja[] {
  const licznik = new Map<string, Pozycja>()
  for (const r of rows) {
    const k = klucz(r, podzial)
    if (!k) continue
    const id = `${k.nazwa}|${k.opis ?? ""}`
    const p = licznik.get(id) ?? k
    p.ile += 1
    licznik.set(id, p)
  }
  return [...licznik.values()].sort((a, b) => b.ile - a.ile || a.nazwa.localeCompare(b.nazwa, "pl")).slice(0, ile)
}
