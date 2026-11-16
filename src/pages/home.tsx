import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmt, powodBledu } from "@/lib/auta"
import type { Auto, Dane, Noc } from "@/lib/dane"
import { wczytajDaniaBezZdjec } from "@/lib/dania"
import { najczestsze, type Podzial } from "@/lib/statystyki"

// Skan publikuje co noc; starsze dane znaczą, że ostatni się nie udał albo został zablokowany.
const STALE_HOURS = 26
const STATUS: Record<string, string> = { done: "udany", blocked_no_publish: "zablokowany", failed_no_publish: "błąd" }

const dzien = (d: string) => d.split("-").reverse().join(".")
const czas = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—")

function dlugosc(start: string | null, koniec: string | null) {
  if (!start || !koniec) return "—"
  const minuty = Math.round((Date.parse(koniec) - Date.parse(start)) / 60000)
  return `${Math.floor(minuty / 60)} h ${minuty % 60} min`
}

// Auta, których Otomoto tej nocy nie dało porównać, i dlaczego.
function Bledy({ auta }: { auta: Auto[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="sm">Pokaż</Button></DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Błędy pobrania z Otomoto</DialogTitle>
          <DialogDescription>Te auta są na liście bez porównania. Następna noc sprawdza je od nowa.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auto</TableHead>
                <TableHead>Powód</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auta.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-normal">{r.title || r.id}<div className="text-xs text-muted-foreground">{r.id}</div></TableCell>
                  <TableCell className="whitespace-normal">{powodBledu(r.note)}</TableCell>
                  <TableCell>{r.search_url ? <a className="underline" href={r.search_url} target="_blank" rel="noopener">Otomoto</a> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Status({ noc }: { noc: Noc }) {
  const zly = noc.status !== null && noc.status !== "done"
  return <Badge variant={zly ? "destructive" : "outline"}>{(noc.status && STATUS[noc.status]) || noc.status || "—"}</Badge>
}

const PODZIALY: [Podzial, string][] = [["modele", "Modele"], ["marki", "Marki"], ["typy", "Typy"]]

// Najczęstsze auta na liście (cała lista, nie wycinek): Auto1 albo Dania.
function Najwiecej({ tytul, opis, rows }: { tytul: string; opis: string; rows: Auto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tytul}</CardTitle>
        <CardDescription>{opis} Generacje modelu liczone razem (Golf VII i VIII = Golf).</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="modele">
          <TabsList>
            {PODZIALY.map(([v, n]) => <TabsTrigger key={v} value={v}>{n}</TabsTrigger>)}
          </TabsList>
          {PODZIALY.map(([v]) => {
            const lista = najczestsze(rows, v)
            const max = lista[0]?.ile ?? 1
            return (
              <TabsContent key={v} value={v} className="flex flex-col gap-3 pt-2">
                {lista.map((p) => (
                  <div key={p.nazwa + (p.opis ?? "")} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0">{p.nazwa}{p.opis && <span className="text-muted-foreground"> · {p.opis}</span>}</span>
                      <span className="font-medium tabular-nums">{fmt(p.ile)}</span>
                    </div>
                    <Progress value={(p.ile / max) * 100} />
                  </div>
                ))}
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Dania to osobny plik nocy (mały); wczytany tylko do statystyki. Bez danych karta się nie pokazuje.
function NajwiecejWDanii() {
  const [dania, setDania] = React.useState<Dane | null>(null)
  React.useEffect(() => {
    let aktywne = true
    wczytajDaniaBezZdjec().then((d) => aktywne && setDania(d), () => {})
    return () => { aktywne = false }
  }, [])
  if (!dania) return null
  const wszystkie = dania.rows.length
  const bez = dania.rows.filter((r) => !r.make).length
  return (
    <Najwiecej
      tytul="Najwięcej w Danii"
      opis={`Dzisiejsza lista Auto Midt, ${fmt(wszystkie)} aut${bez ? ` (${fmt(bez)} bez modelu: nierozpoznane albo sprzedane)` : ""}.`}
      rows={dania.rows}
    />
  )
}

export function Home({ dane }: { dane: Dane }) {
  const { scan, meta, nights, rows } = dane
  const zBledem = rows.filter((r) => r.note?.startsWith("error:"))
  const [wiek] = React.useState(() => (Date.now() - Date.parse(meta.stamp_iso)) / 3600000)
  const kafelki: [string, string][] = [
    ["Ostatni skan", czas(meta.stamp_iso)],
    ["Czas skanu", dlugosc(scan.started, scan.finished)],
    ["Aut z Auto1", fmt(scan.cars)],
    ["Z porównaniem Otomoto", fmt(scan.compared)],
    ["Kwalifikujące się", fmt(scan.qualified)],
    ["Błędy", fmt(scan.errors)],
    ["Bez modelu w Otomoto", fmt(scan.unmapped)],
    [`Kurs NBP EUR z ${dzien(meta.rate_date)}`, `${meta.rate.replace(".", ",")} zł`],
  ]
  return (
    <>
      {wiek > STALE_HOURS && (
        <Alert variant="destructive">
          <AlertTitle>Dane nieaktualne (sprzed {Math.floor(wiek)} h)</AlertTitle>
          <AlertDescription>Ostatni nocny skan się nie udał albo został zablokowany.</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kafelki.map(([opis, wartosc]) => (
          <Card key={opis}>
            <CardHeader>
              <CardDescription>{opis}</CardDescription>
              {opis === "Błędy" && zBledem.length > 0 && <CardAction><Bledy auta={zBledem} /></CardAction>}
              <CardTitle className="text-xl font-semibold tabular-nums lg:text-2xl">{wartosc}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Najwiecej tytul="Najwięcej na Auto1" opis={`Dzisiejsza lista Auto1, ${fmt(rows.length)} aut.`} rows={rows} />
        <NajwiecejWDanii />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Noc</TableHead>
              <TableHead>Wynik</TableHead>
              <TableHead className="text-right">Aut</TableHead>
              <TableHead className="text-right">Z porównaniem</TableHead>
              <TableHead className="text-right">Błędy</TableHead>
              <TableHead className="text-right">Czas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nights.map((n) => (
              <TableRow key={n.day}>
                <TableCell>{dzien(n.day)}</TableCell>
                <TableCell><Status noc={n} /></TableCell>
                <TableCell className="text-right tabular-nums">{fmt(n.cars)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(n.compared)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(n.errors)}</TableCell>
                <TableCell className="text-right tabular-nums">{dlugosc(n.started, n.finished)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
