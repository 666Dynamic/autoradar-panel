import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { OknoMojegoAuta, type Wgrywanie } from "@/components/okno-mojego-auta"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Wybor } from "@/components/wybor"
import { useIsMobile } from "@/hooks/use-mobile"
import { pieniadze } from "@/lib/auta"
import type { Dane } from "@/lib/dane"
import { ZRODLA } from "@/lib/marki"
import {
  adresyZdjec, czyPdf, dataLabel, dniOd, doOtwarcia, NAZWA_STATUSU, oczekujaceZdjecia, pamietanaWaluta, pobierzWszystko, poKolei,
  przeniesStare, rachunek, stareAuta, STATUSY, wgraj, zapamietajWalute, type MojeAuto, type Rodzaj, type Wal, type Zdjecie,
} from "@/lib/moje-auta"
import { pobierzZdjecie } from "@/lib/paczka"
import { cn } from "@/lib/utils"

// Kwoty jak w reszcie panelu: „21.725 €”.
const kw = (n: number | null | undefined, w: Wal) => pieniadze(n, w === "EUR" ? "eur" : "pln")
const plusKw = (n: number | null, w: Wal) => (n === null ? "—" : `${n > 0 ? "+" : ""}${kw(n, w)}`)
const kolorZysku = (n: number | null) => (!n ? "" : n > 0 ? "text-success" : "text-destructive")
const KLUCZ_WIDOKU = "ar_moje_waluta" // waluta, w której liczą się sumy i zysk na liście
const NOWE = "nowe"
const nazwaZrodla = (a: MojeAuto) => (a.zrodlo === "dania" ? "Dania" : ZRODLA.find(([z]) => z === a.zrodlo)?.[1] ?? "")

// ---------- Strona ----------

const W_TOKU = ""
const NARAZ = 3

export function MojeAuta({ dane }: { dane: Dane }) {
  const kurs = dane.meta.rate_value
  const [auta, ustawAuta] = React.useState<MojeAuto[] | null>(null)
  const [zdjecia, ustawZdjecia] = React.useState<Zdjecie[]>([])
  const [adresy, ustawAdresy] = React.useState<Record<string, string>>({})
  const [blad, ustawBlad] = React.useState(false)
  const [waluta, ustawWaluteStan] = React.useState<Wal>(() => pamietanaWaluta(KLUCZ_WIDOKU, "PLN"))
  const [filtr, ustawFiltr] = React.useState(W_TOKU)
  const [otwarte, ustawOtwarte] = React.useState<string | null>(null)
  const [stare, ustawStare] = React.useState(() => stareAuta().length)
  const [wgrywanie, ustawWgrywanie] = React.useState<Wgrywanie | null>(null)
  const [nowyId, ustawNowyId] = React.useState<string | null>(null) // nowe auto zapisane w trakcie (np. przy pierwszym zdjęciu)
  const stop = React.useRef(false)
  const wTelefonie = useIsMobile()
  const ustawWalute = (w: Wal) => { ustawWaluteStan(w); zapamietajWalute(KLUCZ_WIDOKU, w) }

  const zmienZdjecia = React.useCallback((zmienione: Zdjecie[], usuniete: string[]) => {
    ustawZdjecia((z) => {
      const nowe = new Map(zmienione.map((x) => [x.id, x]))
      return [...z.filter((x) => !usuniete.includes(x.id) && !nowe.has(x.id)), ...nowe.values()]
    })
  }, [])

  // Wgrywanie w tle, po kilka plików naraz; „Zatrzymaj” kończy po plikach, które już idą.
  const wgrajDo = React.useCallback(async (autoId: string, rodzaj: Rodzaj, zadania: (File | string)[]): Promise<Zdjecie[]> => {
    const wgrane: Zdjecie[] = []
    if (!zadania.length) return wgrane
    stop.current = false
    let poczatek = 0
    ustawZdjecia((z) => { poczatek = z.filter((x) => x.auto_id === autoId && x.rodzaj === rodzaj).length; return z })
    const stan = { autoId, rodzaj, gotowe: 0, razem: zadania.length, bledy: 0 }
    ustawWgrywanie({ ...stan })
    let nastepne = 0
    const robotnik = async () => {
      while (nastepne < zadania.length && !stop.current) {
        const n = nastepne++
        const z = zadania[n]
        try {
          const nowe = await wgraj(autoId, typeof z === "string" ? await pobierzZdjecie(z) : z, { rodzaj, kolejnosc: poczatek + n })
          wgrane.push(nowe)
          const a = await adresyZdjec([nowe])
          ustawAdresy((x) => ({ ...x, ...a }))
          zmienZdjecia([nowe], [])
        } catch {
          stan.bledy++
        }
        stan.gotowe++
        ustawWgrywanie({ ...stan })
      }
    }
    await Promise.all(Array.from({ length: NARAZ }, robotnik))
    ustawWgrywanie(null)
    if (stop.current) toast(`Zatrzymano: wgrane ${stan.gotowe - stan.bledy} z ${stan.razem}.`)
    else if (stan.bledy) toast.error(`Nie udało się wgrać ${stan.bledy} z ${stan.razem} plików.`)
    return wgrane
  }, [zmienZdjecia])

  React.useEffect(() => {
    let aktywne = true
    pobierzWszystko().then(async (w) => {
      if (!aktywne) return
      ustawAuta(w.auta)
      ustawZdjecia(w.zdjecia)
      const id = doOtwarcia()
      if (id && w.auta.some((a) => a.id === id)) {
        ustawOtwarte(id)
        wgrajDo(id, "sprzedawca", oczekujaceZdjecia(id)) // po „Kupiłem” w oknie Auto1 / Danii
      }
      const a = await adresyZdjec(w.zdjecia)
      if (aktywne) ustawAdresy((x) => ({ ...a, ...x }))
    }).catch(() => aktywne && ustawBlad(true))
    return () => { aktywne = false }
  }, [wgrajDo])

  if (blad) return <p className="text-destructive">Nie udało się wczytać Moich aut. Odśwież stronę.</p>
  if (!auta) return <p className="text-muted-foreground">Wczytuję Moje auta…</p>

  const zdjeciaAuta = (id: string) => zdjecia.filter((z) => z.auto_id === id)
  const miniatura = (id: string) => {
    const wlasne = zdjeciaAuta(id).filter((x) => !czyPdf(x)).sort(poKolei)
    const z = wlasne.find((x) => x.rodzaj === "sprzedawca") ?? wlasne.find((x) => x.rodzaj === "moje") ?? wlasne[0]
    return z ? adresy[z.sciezka] : undefined
  }
  const rok = String(new Date().getFullYear())
  const wToku = auta.filter((a) => a.status !== "sprzedane")
  const sprzedaneWRoku = auta.filter((a) => a.status === "sprzedane" && a.sprzedaz_data?.startsWith(rok))
  const suma = (lista: MojeAuto[], pole: "razem" | "zysk") => lista.reduce((s, a) => s + (rachunek(a, kurs, waluta)[pole] ?? 0), 0)
  const kafelki: [string, string, string?][] = [
    ["Auta w toku", String(wToku.length)],
    ["Zainwestowane w auta w toku", kw(suma(wToku, "razem"), waluta)],
    [`Sprzedane w ${rok}`, String(sprzedaneWRoku.length)],
    [`Zysk w ${rok}`, plusKw(suma(sprzedaneWRoku, "zysk"), waluta), kolorZysku(suma(sprzedaneWRoku, "zysk"))],
  ]
  const lista = filtr === W_TOKU ? wToku : filtr === "wszystkie" ? auta : auta.filter((a) => a.status === filtr)
  const wybrane = otwarte && otwarte !== NOWE ? auta.find((a) => a.id === otwarte) ?? null : null

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kafelki.map(([opis, wartosc, klasa]) => (
          <Card key={opis}>
            <CardHeader>
              <CardDescription>{opis}</CardDescription>
              <CardTitle className={cn("text-xl font-semibold tabular-nums lg:text-2xl", klasa)}>{wartosc}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => { ustawNowyId(null); ustawOtwarte(NOWE) }}><PlusIcon />Dodaj auto</Button>
        <Wybor size="sm" className="w-56" value={filtr} onChange={ustawFiltr} puste="W toku (bez sprzedanych)" opcje={[...STATUSY.map(([id, n]) => [id, n] as [string, string]), ["wszystkie", "Wszystkie"]]} />
        <ToggleGroup type="single" variant="outline" size="sm" className="ml-auto" value={waluta} onValueChange={(v) => v && ustawWalute(v as Wal)}>
          <ToggleGroupItem value="EUR">EUR</ToggleGroupItem>
          <ToggleGroupItem value="PLN">PLN</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {stare > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <p className="text-sm">W tej przeglądarce są auta ze starych „Moich aut” ({stare}). Przenieś je do bazy, żeby były na każdym urządzeniu.</p>
            <Button size="sm" className="ml-auto" onClick={async () => {
              try {
                const n = await przeniesStare(kurs)
                const w = await pobierzWszystko()
                ustawAuta(w.auta)
                ustawStare(0)
                toast.success(`Przeniesiono ${n} aut.`)
              } catch {
                toast.error("Nie udało się przenieść.")
              }
            }}>Przenieś</Button>
          </CardContent>
        </Card>
      )}

      {!lista.length ? (
        <p className="text-muted-foreground">{auta.length ? "Brak aut w tym widoku." : "Brak aut. Kliknij „Dodaj auto” albo „Kupiłem” w oknie auta Auto1 lub Danii."}</p>
      ) : wTelefonie ? (
        <div className="flex flex-col gap-3">
          {lista.map((a) => {
            const r = rachunek(a, kurs, waluta)
            return (
              <Card key={a.id} className="cursor-pointer py-0" onClick={() => ustawOtwarte(a.id)}>
                <CardContent className="flex gap-3 p-3">
                  {miniatura(a.id) ? <img src={miniatura(a.id)} alt="" className="size-20 shrink-0 rounded-md object-cover" /> : <div className="size-20 shrink-0 rounded-md bg-muted" />}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{a.nazwa}</span>
                      <Badge variant={a.status === "sprzedane" ? "secondary" : "outline"}>{NAZWA_STATUSU[a.status]}</Badge>
                    </div>
                    <div className="grid grid-cols-2 text-sm">
                      <span><span className="block text-xs text-muted-foreground">Zakup + koszty</span>{kw(r.razem, waluta)}</span>
                      <span><span className="block text-xs text-muted-foreground">Zysk</span><span className={kolorZysku(r.zysk)}>{plusKw(r.zysk, waluta)}</span></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20" />
                <TableHead>Auto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zakup</TableHead>
                <TableHead className="text-right">Dni na placu</TableHead>
                <TableHead className="text-right">Zakup + koszty</TableHead>
                <TableHead className="text-right">Cena</TableHead>
                <TableHead className="text-right">Zysk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => {
                const r = rachunek(a, kurs, waluta)
                return (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => ustawOtwarte(a.id)}>
                    <TableCell>{miniatura(a.id) ? <img src={miniatura(a.id)} alt="" className="h-12 w-16 rounded-md object-cover" /> : <div className="h-12 w-16 rounded-md bg-muted" />}</TableCell>
                    <TableCell className="min-w-40 whitespace-normal">{a.nazwa}<div className="text-xs text-muted-foreground">{nazwaZrodla(a)}{a.zrodlo_id ? ` ${a.zrodlo_id}` : ""}</div></TableCell>
                    <TableCell><Badge variant={a.status === "sprzedane" ? "secondary" : "outline"}>{NAZWA_STATUSU[a.status]}</Badge></TableCell>
                    <TableCell className="tabular-nums">{dataLabel(a.zakup_data)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dniOd(a.przyjazd_data, a.sprzedaz_data) ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{kw(r.razem, waluta)}</TableCell>
                    <TableCell className="text-right tabular-nums">{kw(r.cena, waluta)}{r.cena !== null && <span className="block text-xs text-muted-foreground">{r.zakonczone ? "sprzedane" : "wystawione"}</span>}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", kolorZysku(r.zysk))}>{plusKw(r.zysk, waluta)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {otwarte && (
        <OknoMojegoAuta
          key={otwarte}
          auto={wybrane}
          otwarte
          zamknij={() => ustawOtwarte(null)}
          dane={dane}
          kurs={kurs}
          zdjecia={wybrane ? zdjeciaAuta(wybrane.id) : nowyId ? zdjeciaAuta(nowyId) : []}
          adresy={adresy}
          wgrywanie={wgrywanie}
          wgrajDo={wgrajDo}
          zatrzymaj={() => { stop.current = true }}
          zmienZdjecia={zmienZdjecia}
          zapisane={(a, czyNowe) => {
            ustawAuta((l) => (czyNowe ? [a, ...l!] : l!.map((x) => (x.id === a.id ? a : x))))
            if (czyNowe) ustawNowyId(a.id)
          }}
          usuniete={(id) => { ustawAuta((l) => l!.filter((a) => a.id !== id)); ustawOtwarte(null) }}
        />
      )}
    </>
  )
}
