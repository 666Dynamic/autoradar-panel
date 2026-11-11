import * as React from "react"
import { CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Wybor } from "@/components/wybor"
import { wczytajSzczegoly, type Dane } from "@/lib/dane"
import { KRAJE_OGLOSZEN, POLA_OGLOSZENIA, WZORY, ogloszenie, ogloszenieZAuto1, rozpoznajTekst, autoDoOgloszenia, wzorZPamieci, type Ogloszenie } from "@/lib/ogloszenia"

const PALIWA: [string, string][] = ["Diesel", "Benzyna", "Hybryda", "Hybryda plug-in", "Elektryczny", "Benzyna + LPG"].map((x) => [x, x])
const SKRZYNIE: [string, string][] = [["Automat", "Automat"], ["Manualna", "Manualna"]]
const KLUCZ = "ar_ogloszenie"

// Szkic ogłoszenia i wybrany wzór zostają w tej przeglądarce.
function odczytajSzkic(): { pola: Ogloszenie; wzor: string } {
  try {
    const s = JSON.parse(localStorage.getItem(KLUCZ) ?? "{}")
    const pola = Object.fromEntries(Object.entries(POLA_OGLOSZENIA).map(([k, v]) => [k, typeof s.pola?.[k] === "string" ? s.pola[k] : v])) as Ogloszenie
    return { pola, wzor: wzorZPamieci(s.wzor) } // stare wzory (Krótki, Z ikonami, Pełny) → WhatsApp
  } catch {
    return { pola: POLA_OGLOSZENIA, wzor: "whatsapp" }
  }
}

function Pole({ etykieta, children, className }: { etykieta: string; children: React.ReactNode; className?: string }) {
  return <div className={className ?? "flex flex-col gap-1.5"}><Label>{etykieta}</Label>{children}</div>
}

export function Ogloszenia({ dane }: { dane: Dane | null }) {
  const [szkic] = React.useState(odczytajSzkic)
  const [o, ustawO] = React.useState(szkic.pola)
  const [wzor, ustawWzor] = React.useState(szkic.wzor)
  const [zOkna] = React.useState(() => autoDoOgloszenia())
  const [numer, ustawNumer] = React.useState(zOkna ?? "")
  const [wklejony, ustawWklejony] = React.useState("")
  const [skopiowano, ustawSkopiowano] = React.useState(false)
  const tekst = ogloszenie(o, wzor)

  React.useEffect(() => {
    try {
      localStorage.setItem(KLUCZ, JSON.stringify({ pola: o, wzor }))
    } catch {
      // bez pamięci strona działa dalej
    }
  }, [o, wzor])

  const pole = (k: keyof Ogloszenie) => ({ value: o[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => ustawO((x) => ({ ...x, [k]: e.target.value })) })
  const ustaw = (k: keyof Ogloszenie) => (v: string) => ustawO((x) => ({ ...x, [k]: v }))

  // Dane z nocnego skanu: bez ceny sprzedaży i VIN-u, tych Auto1 nie podaje w liście.
  const wczytajAuto = React.useCallback(async (numerAuta: string) => {
    const id = numerAuta.trim().toUpperCase()
    const r = dane?.rows.find((x) => x.id.toUpperCase() === id)
    if (!r) return toast.error(dane ? "Nie ma takiego auta w ostatnim skanie." : "Dane skanu jeszcze się wczytują.")
    const s = (await wczytajSzczegoly())[r.id]
    ustawO((x) => ({ ...ogloszenieZAuto1(r, s, x.kraj), waluta: x.waluta }))
    toast.success("Wczytano dane auta. Dopisz cenę i VIN.")
  }, [dane])
  const wczytaj = () => wczytajAuto(numer)

  // „Zrób ogłoszenie” w oknie auta Auto1 zostawia numer auta i przechodzi tutaj.
  React.useEffect(() => {
    if (zOkna && autoDoOgloszenia(true)) wczytajSzczegoly().then(() => wczytajAuto(zOkna))
  }, [zOkna, wczytajAuto])

  const rozpoznaj = () => {
    const w = rozpoznajTekst(wklejony)
    const ile = Object.keys(w).filter((k) => k !== "waluta").length
    if (!ile) return toast.error("Nie rozpoznałem żadnych danych. Wpisz je ręcznie.")
    ustawO((x) => ({ ...POLA_OGLOSZENIA, waluta: x.waluta, kraj: x.kraj, ...w }))
    ustawWklejony("")
    toast.success("Uzupełniono dane z tekstu. Sprawdź je i dopisz brakujące.")
  }

  const kopiuj = () => navigator.clipboard.writeText(tekst).then(() => {
    ustawSkopiowano(true)
    setTimeout(() => ustawSkopiowano(false), 1500)
  }, () => toast.error("Nie udało się skopiować."))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Dane auta</CardTitle>
          <CardDescription>Puste pola nie pojawią się w ogłoszeniu.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Textarea rows={3} aria-label="Wklejony tekst" placeholder={"Wklej tekst auta, np. od kontrahenta:\n2017-02-07 · PHEV · Volkswagen · Passat · VIN · przebieg · cena"} value={wklejony} onChange={(e) => ustawWklejony(e.target.value)} />
            <Button className="self-start" onClick={rozpoznaj} disabled={!wklejony.trim()}>Uzupełnij z tekstu</Button>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Numer Auto1, np. AB12345" aria-label="Numer Auto1" value={numer} onChange={(e) => ustawNumer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && wczytaj()} />
            <Button variant="outline" onClick={wczytaj} disabled={!numer.trim()}>Wczytaj z Auto1</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Pole etykieta="Kraj"><Wybor value={o.kraj} onChange={ustaw("kraj")} puste="bez flagi" opcje={KRAJE_OGLOSZEN.map(([k, n, f]) => [k, `${f} ${n}`])} /></Pole>
            <Pole etykieta="Marka i model"><Input placeholder="Mercedes-Benz C-Klasse" {...pole("auto")} /></Pole>
            <Pole etykieta="Wersja" className="flex flex-col gap-1.5 sm:col-span-2"><Input placeholder="2.0 192HP Automatic C 220" {...pole("wersja")} /></Pole>
            <Pole etykieta="VIN"><Input className="uppercase" {...pole("vin")} /></Pole>
            <Pole etykieta="Pierwsza rejestracja"><Input placeholder="04.10.2019" {...pole("rejestracja")} /></Pole>
            <Pole etykieta="Paliwo"><Wybor value={o.paliwo} onChange={ustaw("paliwo")} puste="nie podawaj" opcje={PALIWA} /></Pole>
            <Pole etykieta="Skrzynia"><Wybor value={o.skrzynia} onChange={ustaw("skrzynia")} puste="nie podawaj" opcje={SKRZYNIE} /></Pole>
            <Pole etykieta="Przebieg (km)"><Input inputMode="numeric" placeholder="140000" {...pole("przebieg")} /></Pole>
            <Pole etykieta="Moc (KM)"><Input inputMode="numeric" placeholder="192" {...pole("moc")} /></Pole>
            <Pole etykieta="Cena">
              <div className="flex gap-2">
                <Input inputMode="numeric" placeholder="11500" {...pole("cena")} />
                <ToggleGroup type="single" variant="outline" value={o.waluta} onValueChange={(v) => v && ustaw("waluta")(v)}>
                  <ToggleGroupItem value="eur">€</ToggleGroupItem>
                  <ToggleGroupItem value="pln">zł</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </Pole>
            <Pole etykieta="Kolor"><Input placeholder="szary" {...pole("kolor")} /></Pole>
            <Pole etykieta="Atuty, każdy w nowej linii" className="flex flex-col gap-1.5 sm:col-span-2">
              <Textarea rows={4} placeholder={"Bezwypadkowe, oryginalny lakier\nSerwis w ASO\nOpony letnie w cenie"} {...pole("atuty")} />
            </Pole>
          </div>
          <Button variant="ghost" size="sm" className="self-start" onClick={() => ustawO((x) => ({ ...POLA_OGLOSZENIA, waluta: x.waluta }))}><RotateCcwIcon />Nowe ogłoszenie</Button>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle>Ogłoszenie</CardTitle>
          <CardDescription>{WZORY.find(([id]) => id === wzor)?.[2]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleGroup type="single" variant="outline" orientation="vertical" className="w-full flex-col" value={wzor} onValueChange={(v) => v && ustawWzor(v)}>
            {WZORY.map(([id, nazwa]) => <ToggleGroupItem key={id} value={id} className="w-full">{nazwa}</ToggleGroupItem>)}
          </ToggleGroup>
          <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">{tekst || <span className="text-muted-foreground">Wpisz dane auta albo wczytaj je z Auto1.</span>}</div>
          <Button onClick={kopiuj} disabled={!tekst}>{skopiowano ? <CheckIcon /> : <CopyIcon />}{skopiowano ? "Skopiowano" : "Kopiuj tekst"}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
