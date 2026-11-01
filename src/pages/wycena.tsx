import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Wybor } from "@/components/wybor"
import { pieniadze } from "@/lib/auta"

// Skrypty strony wyceny, bez zmian: public/wycena/catalog.js i filtry.js.
declare const KATALOG: { makes: [string, string][]; models: Record<string, [string, string][]> }
type Rozpoznane = Partial<Record<"marka" | "model" | "paliwo" | "skrzynia" | "rok" | "moc" | "przebieg", string | number>>
declare const FILTRY: {
  zbuduj: (f: Record<string, string>) => Record<string, string>
  link: (f: Record<string, string>) => string
  podsumuj: (odpowiedz: unknown) => { lacznie: number; najtansza: number | null; srednia: number | null; policzono: number; pominieto: number }
  rozpoznaj: (tekst: string, katalog: typeof KATALOG) => Rozpoznane
}

// Adres pośrednika worker.mjs z projektu wycena-aut.
const SZUKAJ_URL = "https://wycena-aut.hfnvflmwxetmfpc.workers.dev/"
const zl = (kwota: number) => pieniadze(kwota, "pln")
const PALIWA: [string, string][] = [["petrol", "Benzyna"], ["diesel", "Diesel"], ["hybrid", "Hybryda"], ["plugin-hybrid", "Hybryda Plug-in"], ["petrol-lpg", "Benzyna+LPG"], ["petrol-cng", "Benzyna+CNG"], ["electric", "Elektryczny"], ["etanol", "Etanol"], ["hidrogen", "Wodór"]]
const SKRZYNIE: [string, string][] = [["manual", "Manualna"], ["automatic", "Automatyczna"]]
const PUSTE = { marka: "", model: "", paliwo: "", skrzynia: "", rok: "", moc: "", przebieg: "", rokOd: "", rokDo: "", mocOd: "", mocDo: "", przebiegDo: "" }
type Pola = typeof PUSTE

const OKNA: Record<string, (w: number) => Partial<Pola>> = {
  rok: (w) => ({ rokOd: String(w - 2), rokDo: String(w + 2) }),
  moc: (w) => ({ mocOd: String(Math.max(0, w - 10)), mocDo: String(w + 10) }),
  przebieg: (w) => ({ przebiegDo: String(w + 40000) }),
}

function okno(pole: string, wartosc: string): Partial<Pola> {
  const zmiany = OKNA[pole](Number(wartosc))
  return wartosc === "" ? Object.fromEntries(Object.keys(zmiany).map((k) => [k, ""])) : zmiany
}

function modele(marka: string): [string, string][] {
  const lista = KATALOG.models[marka] ?? []
  return lista.map(([id, nazwa]) => [id, lista.filter((m) => m[1] === nazwa).length > 1 ? `${nazwa} (${id})` : nazwa])
}

async function szukaj(filtry: Record<string, string>) {
  const odpowiedz = await fetch(SZUKAJ_URL, { method: "POST", body: JSON.stringify({ filters: filtry }) })
  if (!odpowiedz.ok) return `Otomoto odmówiło (${odpowiedz.status}). Użyj Otwórz Otomoto.`
  const w = FILTRY.podsumuj(await odpowiedz.json())
  if (w.najtansza === null || w.srednia === null) return `Ofert łącznie: ${w.lacznie}. Brak cen do policzenia.`
  return `Ofert łącznie: ${w.lacznie}\nNajtańsza: ${zl(w.najtansza)}\nŚrednia z ${w.policzono}: ${zl(w.srednia)}` + (w.pominieto ? `\nPominięto raty, leasing lub netto: ${w.pominieto}` : "")
}

function Liczba({ etykieta, value, onChange }: { etykieta: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{etykieta}</Label>
      <Input type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

const OSTATNI_ROK = new Date().getFullYear() + 1
const LATA = Array.from({ length: OSTATNI_ROK - 1979 }, (_, i) => String(OSTATNI_ROK - i))

function Rok({ etykieta, value, onChange }: { etykieta: string; value: string; onChange: (v: string) => void }) {
  // Rok spoza listy (z wklejonego tekstu) też ma być widoczny.
  const lata = value && !LATA.includes(value) ? [value, ...LATA] : LATA
  return <div className="flex flex-col gap-1"><Label>{etykieta}</Label><Wybor puste="—" value={value} opcje={lata.map((r): [string, string] => [r, r])} onChange={onChange} /></div>
}

export function Wycena() {
  const [tekst, ustawTekst] = React.useState("")
  const [p, ustawP] = React.useState(PUSTE)
  const [wynik, ustawWynik] = React.useState("")

  // Odpowiedź na stare zapytanie nie może nadpisać nowych pól.
  const zapytanie = React.useRef(0)

  const zmien = (zmiany: Partial<Pola>) => { zapytanie.current++; ustawP((x) => ({ ...x, ...zmiany })); ustawWynik("") }
  const zmienAuto = (pole: "rok" | "moc" | "przebieg", wartosc: string) => zmien({ [pole]: wartosc, ...okno(pole, wartosc) })
  const wczytaj = (nowy: string) => {
    ustawTekst(nowy)
    const a = FILTRY.rozpoznaj(nowy, KATALOG)
    const wart = (k: keyof Rozpoznane) => (a[k] === undefined ? "" : String(a[k]))
    zmien({ ...PUSTE, marka: wart("marka"), model: wart("model"), paliwo: wart("paliwo"), skrzynia: wart("skrzynia"), rok: wart("rok"), moc: wart("moc"), przebieg: wart("przebieg"),
      ...okno("rok", wart("rok")), ...okno("moc", wart("moc")), ...okno("przebieg", wart("przebieg")) })
  }
  const filtry = p.marka ? FILTRY.zbuduj({ marka: p.marka, model: p.model, paliwo: p.paliwo, skrzynia: p.skrzynia, rokOd: p.rokOd, rokDo: p.rokDo, mocOd: p.mocOd, mocDo: p.mocDo, przebiegDo: p.przebiegDo }) : null

  const wyszukaj = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filtry) { ustawWynik("Wybierz markę."); return }
    const numer = ++zapytanie.current
    ustawWynik("Szukam…")
    let tresc: string
    try {
      tresc = await szukaj(filtry)
    } catch (blad) {
      tresc = (blad instanceof TypeError ? "Brak połączenia." : (blad as Error).message) + " Użyj Otwórz Otomoto."
    }
    if (numer === zapytanie.current) ustawWynik(tresc)
  }

  return (
    <form className="grid items-start gap-4 lg:grid-cols-2" onSubmit={wyszukaj}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="tekst">Wklej albo wpisz auto</Label>
            <Textarea id="tekst" rows={3} value={tekst} onChange={(e) => wczytaj(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1"><Label>Marka</Label><Wybor puste="—" value={p.marka} opcje={KATALOG.makes} onChange={(v) => zmien({ marka: v, model: "" })} /></div>
            <div className="flex flex-col gap-1"><Label>Model</Label><Wybor puste="—" value={p.model} opcje={modele(p.marka)} onChange={(v) => zmien({ model: v })} /></div>
            <div className="flex flex-col gap-1"><Label>Paliwo</Label><Wybor puste="—" value={p.paliwo} opcje={PALIWA} onChange={(v) => zmien({ paliwo: v })} /></div>
            <div className="flex flex-col gap-1"><Label>Skrzynia</Label><Wybor puste="—" value={p.skrzynia} opcje={SKRZYNIE} onChange={(v) => zmien({ skrzynia: v })} /></div>
            <Rok etykieta="Rok" value={p.rok} onChange={(v) => zmienAuto("rok", v)} />
            <Liczba etykieta="Moc (KM)" value={p.moc} onChange={(v) => zmienAuto("moc", v)} />
            <div className="col-span-2"><Liczba etykieta="Przebieg (km)" value={p.przebieg} onChange={(v) => zmienAuto("przebieg", v)} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Filtr (możesz zmienić)</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Rok etykieta="Rok od" value={p.rokOd} onChange={(v) => zmien({ rokOd: v })} />
            <Rok etykieta="Rok do" value={p.rokDo} onChange={(v) => zmien({ rokDo: v })} />
            <Liczba etykieta="Moc od" value={p.mocOd} onChange={(v) => zmien({ mocOd: v })} />
            <Liczba etykieta="Moc do" value={p.mocDo} onChange={(v) => zmien({ mocDo: v })} />
            <div className="col-span-2"><Liczba etykieta="Przebieg do" value={p.przebiegDo} onChange={(v) => zmien({ przebiegDo: v })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="submit">Wyszukaj</Button>
            <Button asChild={!!filtry} variant="outline" disabled={!filtry}>
              {filtry ? <a href={FILTRY.link(filtry)} target="_blank" rel="noopener">Otwórz Otomoto</a> : "Otwórz Otomoto"}
            </Button>
          </div>
          {wynik && <p role="status" className="whitespace-pre-line text-lg">{wynik}</p>}
        </CardContent>
      </Card>
    </form>
  )
}
