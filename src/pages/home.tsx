import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmt } from "@/lib/auta"
import type { Dane, Noc } from "@/lib/dane"

// Skan publikuje co noc; starsze dane znaczą, że ostatni się nie udał albo został zablokowany.
const STALE_HOURS = 26
const STATUS: Record<string, string> = { done: "udany", blocked_no_publish: "zablokowany", failed_no_publish: "błąd" }

const czas = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "—")

function dlugosc(start: string | null, koniec: string | null) {
  if (!start || !koniec) return "—"
  const minuty = Math.round((Date.parse(koniec) - Date.parse(start)) / 60000)
  return `${Math.floor(minuty / 60)} h ${minuty % 60} min`
}

function Status({ noc }: { noc: Noc }) {
  const zly = noc.status !== null && noc.status !== "done"
  return <Badge variant={zly ? "destructive" : "outline"}>{(noc.status && STATUS[noc.status]) || noc.status || "—"}</Badge>
}

export function Home({ dane }: { dane: Dane }) {
  const { scan, meta, nights } = dane
  const wiek = (Date.now() - Date.parse(meta.stamp_iso)) / 3600000
  const kafelki: [string, string][] = [
    ["Ostatni skan", czas(meta.stamp_iso)],
    ["Czas skanu", dlugosc(scan.started, scan.finished)],
    ["Aut z Auto1", fmt(scan.cars)],
    ["Z porównaniem Otomoto", fmt(scan.compared)],
    ["Spełnia próg", fmt(scan.qualified)],
    ["Błędy", fmt(scan.errors)],
    ["Bez modelu w Otomoto", fmt(scan.unmapped)],
    ["Kurs NBP EUR", `${meta.rate} PLN`],
  ]
  return (
    <>
      {wiek > STALE_HOURS && (
        <p className="rounded-md border border-destructive p-3 text-destructive">
          Dane nieaktualne (sprzed {Math.floor(wiek)} h). Ostatni nocny skan się nie udał albo został zablokowany.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kafelki.map(([opis, wartosc]) => (
          <Card key={opis}>
            <CardHeader>
              <CardDescription>{opis}</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums lg:text-2xl">{wartosc}</CardTitle>
            </CardHeader>
          </Card>
        ))}
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
                <TableCell>{n.day}</TableCell>
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
