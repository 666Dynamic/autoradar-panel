import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, PlusIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"
import { pieniadze } from "@/lib/auta"
import type { Auto, Dane } from "@/lib/dane"
import { dataLabel, dniMiedzy, odczytajAuta, plikKopii, STATUSY, wczytajKopie, zapiszAuta, type MojeAuto, type Status } from "@/lib/moje-auta"

const NAZWA_STATUSU = Object.fromEntries(STATUSY) as Record<Status, string>
const PUSTE = { nazwa: "", auto1: "", zakupEur: "", zakupData: "", przyjazdPlan: "", przyjazd: "", wystawienie: "", sprzedazData: "", sprzedaz: "", status: "kupione", notatka: "" }
type Pola = typeof PUSTE

const doPol = (a: MojeAuto): Pola => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v === null ? "" : String(v)])) as Pola
const kwota = (s: string) => (s.trim() === "" || !(Number(s) >= 0) ? null : Number(s))

function zPol(p: Pola, id: string): MojeAuto {
  return {
    id,
    nazwa: p.nazwa.trim(),
    auto1: p.auto1.trim(),
    zakupEur: kwota(p.zakupEur),
    zakupData: p.zakupData || null,
    przyjazdPlan: p.przyjazdPlan || null,
    przyjazd: p.przyjazd || null,
    wystawienie: kwota(p.wystawienie),
    sprzedazData: p.sprzedazData || null,
    sprzedaz: kwota(p.sprzedaz),
    status: p.status as Status,
    notatka: p.notatka.trim(),
  }
}

function Pole({ etykieta, children }: { etykieta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{etykieta}</Label>
      {children}
    </div>
  )
}

function Okno({ auto, otwarte, zamknij, zapisz, usun, zAuto1 }: {
  auto: MojeAuto | null
  otwarte: boolean
  zamknij: () => void
  zapisz: (p: Pola) => void
  usun: () => void
  zAuto1: (numer: string) => Auto | undefined
}) {
  const [p, ustawP] = React.useState<Pola>(PUSTE)
  const [potwierdz, ustawPotwierdz] = React.useState(false)
  const [poprzednie, ustawPoprzednie] = React.useState<MojeAuto | null | undefined>(undefined)
  // Nowe otwarcie okna zaczyna od danych wybranego auta albo od pustego formularza.
  if (otwarte && poprzednie !== auto) {
    ustawPoprzednie(auto)
    ustawP(auto ? doPol(auto) : PUSTE)
    ustawPotwierdz(false)
  }
  if (!otwarte && poprzednie !== undefined) ustawPoprzednie(undefined)

  const pole = (k: keyof Pola) => ({ value: p[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => ustawP({ ...p, [k]: e.target.value }) })
  const znalezione = p.auto1.trim() ? zAuto1(p.auto1.trim()) : undefined
  const brakNazwy = !p.nazwa.trim() && !znalezione

  return (
    <Dialog open={otwarte} onOpenChange={(v) => !v && zamknij()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{auto ? "Edytuj auto" : "Dodaj auto"}</DialogTitle>
          <DialogDescription>Zapis tylko w tej przeglądarce.</DialogDescription>
        </DialogHeader>
        <form
          id="moje-auto"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (brakNazwy) return
            zapisz(!p.nazwa.trim() && znalezione ? { ...p, nazwa: znalezione.title } : p)
          }}
        >
          <div className="sm:col-span-2"><Pole etykieta="Auto"><Input placeholder="np. Audi A4 2.0 TDI, czarne" {...pole("nazwa")} /></Pole></div>
          <Pole etykieta="Numer Auto1 (opcjonalnie)">
            <Input placeholder="np. AB12345" {...pole("auto1")} />
            {znalezione && <span className="text-xs text-muted-foreground">Na liście: {znalezione.title}</span>}
          </Pole>
          <Pole etykieta="Status">
            <Select value={p.status} onValueChange={(v) => ustawP({ ...p, status: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSY.map(([id, nazwa]) => <SelectItem key={id} value={id}>{nazwa}</SelectItem>)}
              </SelectContent>
            </Select>
          </Pole>
          <Pole etykieta="Cena zakupu (EUR)"><Input type="number" inputMode="numeric" min={0} {...pole("zakupEur")} /></Pole>
          <Pole etykieta="Data zakupu"><Input type="date" {...pole("zakupData")} /></Pole>
          <Pole etykieta="Planowany przyjazd"><Input type="date" {...pole("przyjazdPlan")} /></Pole>
          <Pole etykieta="Przyjazd"><Input type="date" {...pole("przyjazd")} /></Pole>
          <Pole etykieta="Cena wystawienia (PLN)"><Input type="number" inputMode="numeric" min={0} {...pole("wystawienie")} /></Pole>
          <Pole etykieta="Data sprzedaży"><Input type="date" {...pole("sprzedazData")} /></Pole>
          <Pole etykieta="Cena sprzedaży (PLN)"><Input type="number" inputMode="numeric" min={0} {...pole("sprzedaz")} /></Pole>
          <div className="sm:col-span-2"><Pole etykieta="Notatka"><Textarea rows={3} placeholder="Bez danych klientów" {...pole("notatka")} /></Pole></div>
          {brakNazwy && <p className="text-xs text-muted-foreground sm:col-span-2">Wpisz auto albo numer Auto1 z listy.</p>}
        </form>
        <DialogFooter className="gap-2 sm:justify-between">
          {auto ? (
            <Button type="button" variant={potwierdz ? "destructive" : "outline"} onClick={() => (potwierdz ? usun() : ustawPotwierdz(true))}>
              {potwierdz ? "Na pewno usunąć?" : "Usuń"}
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={zamknij}>Anuluj</Button>
            <Button type="submit" form="moje-auto" disabled={brakNazwy}>Zapisz</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Auto1Link({ a, zAuto1 }: { a: MojeAuto; zAuto1: (numer: string) => Auto | undefined }) {
  if (!a.auto1) return <>—</>
  const url = zAuto1(a.auto1)?.auto1_url
  return url ? <a className="underline" href={url} target="_blank" rel="noopener">{a.auto1}</a> : <>{a.auto1}</>
}

export function MojeAuta({ dane }: { dane: Dane | null }) {
  const [auta, ustawAuta] = React.useState(odczytajAuta)
  const [edytowane, ustawEdytowane] = React.useState<MojeAuto | null>(null)
  const [otwarte, ustawOtwarte] = React.useState(false)
  const [najnowsze, ustawNajnowsze] = React.useState(true)
  const plik = React.useRef<HTMLInputElement>(null)
  const wTelefonie = useIsMobile()

  const zAuto1 = React.useMemo(() => {
    const mapa = new Map((dane?.rows ?? []).map((r) => [r.id.toLowerCase(), r]))
    return (numer: string) => mapa.get(numer.toLowerCase())
  }, [dane])

  const zmien = (nowe: MojeAuto[]) => {
    ustawAuta(nowe)
    if (!zapiszAuta(nowe)) toast.error("Przeglądarka nie pozwala zapisać. Zrób kopię JSON.")
  }

  const lista = React.useMemo(() => {
    const kierunek = najnowsze ? -1 : 1
    // Auta bez daty zakupu zawsze na końcu.
    return [...auta].sort((a, b) => (!a.zakupData ? 1 : !b.zakupData ? -1 : a.zakupData.localeCompare(b.zakupData) * kierunek))
  }, [auta, najnowsze])

  const sprzedaneZDatami = auta.filter((a) => a.status === "sprzedane" && a.przyjazd && a.sprzedazData)
  const srednio = sprzedaneZDatami.length ? Math.round(sprzedaneZDatami.reduce((s, a) => s + dniMiedzy(a.przyjazd!, a.sprzedazData!), 0) / sprzedaneZDatami.length) : null
  const kafelki: [string, string][] = [
    ...STATUSY.map(([id, nazwa]) => [nazwa, String(auta.filter((a) => a.status === id).length)] as [string, string]),
    ["Dni do sprzedaży (średnio)", srednio === null ? "—" : String(srednio)],
  ]

  const otworz = (a: MojeAuto | null) => {
    ustawEdytowane(a)
    ustawOtwarte(true)
  }

  const eksportuj = () => {
    const link = document.createElement("a")
    link.href = URL.createObjectURL(plikKopii(auta))
    link.download = `moje-auta-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const importuj = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    const nowe = wczytajKopie(await f.text(), auta)
    if (!nowe) return toast.error("To nie jest plik kopii Moich aut.")
    zmien(nowe)
    toast.success(`Wczytano kopię. Aut na liście: ${nowe.length}.`)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kafelki.map(([opis, wartosc]) => (
          <Card key={opis} className="last:col-span-2 lg:last:col-span-1">
            <CardHeader>
              <CardDescription>{opis}</CardDescription>
              <CardTitle className="text-xl font-semibold tabular-nums lg:text-2xl">{wartosc}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => otworz(null)}><PlusIcon />Dodaj auto</Button>
        <Button size="sm" variant="outline" onClick={() => ustawNajnowsze(!najnowsze)}>
          {najnowsze ? <ArrowDownIcon /> : <ArrowUpIcon />}Zakup: {najnowsze ? "najnowsze" : "najstarsze"}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={eksportuj} disabled={!auta.length}><DownloadIcon />Kopia JSON</Button>
          <Button size="sm" variant="outline" onClick={() => plik.current?.click()}><UploadIcon />Wczytaj kopię</Button>
          <input ref={plik} type="file" accept="application/json,.json" className="hidden" onChange={importuj} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Dane są tylko w tej przeglądarce. Rób kopię JSON po zmianach.</p>

      {!auta.length ? (
        <p className="text-muted-foreground">Brak aut. Dodaj pierwsze albo wczytaj kopię.</p>
      ) : wTelefonie ? (
        <div className="flex flex-col gap-3">
          {lista.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left font-medium" onClick={() => otworz(a)}>{a.nazwa}</button>
                  <Badge variant={a.status === "sprzedane" ? "secondary" : "outline"}>{NAZWA_STATUSU[a.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Auto1: <Auto1Link a={a} zAuto1={zAuto1} /></p>
                <div className="grid grid-cols-3 gap-y-2 text-sm">
                  <span><span className="block text-xs text-muted-foreground">Zakup</span>{pieniadze(a.zakupEur, "eur")}<span className="block text-xs text-muted-foreground">{dataLabel(a.zakupData)}</span></span>
                  <span><span className="block text-xs text-muted-foreground">Przyjazd</span>{a.przyjazd ? dataLabel(a.przyjazd) : `plan ${dataLabel(a.przyjazdPlan)}`}</span>
                  <span><span className="block text-xs text-muted-foreground">Wystawione</span>{pieniadze(a.wystawienie, "pln")}</span>
                  {(a.sprzedaz !== null || a.sprzedazData) && <span className="col-span-3"><span className="block text-xs text-muted-foreground">Sprzedane</span>{pieniadze(a.sprzedaz, "pln")} · {dataLabel(a.sprzedazData)}</span>}
                </div>
                {a.notatka && <p className="text-sm whitespace-pre-line text-muted-foreground">{a.notatka}</p>}
                <Button size="sm" variant="outline" className="self-start" onClick={() => otworz(a)}>Edytuj</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Zakup</TableHead>
                <TableHead>Data zakupu</TableHead>
                <TableHead>Przyjazd</TableHead>
                <TableHead className="text-right">Wystawione</TableHead>
                <TableHead className="text-right">Sprzedane</TableHead>
                <TableHead>Data sprzedaży</TableHead>
                <TableHead>Notatka</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="min-w-40 whitespace-normal">{a.nazwa}<div className="text-xs text-muted-foreground"><Auto1Link a={a} zAuto1={zAuto1} /></div></TableCell>
                  <TableCell><Badge variant={a.status === "sprzedane" ? "secondary" : "outline"}>{NAZWA_STATUSU[a.status]}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{pieniadze(a.zakupEur, "eur")}</TableCell>
                  <TableCell className="tabular-nums">{dataLabel(a.zakupData)}</TableCell>
                  <TableCell className="tabular-nums">{a.przyjazd ? dataLabel(a.przyjazd) : <span className="text-muted-foreground">plan {dataLabel(a.przyjazdPlan)}</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{pieniadze(a.wystawienie, "pln")}</TableCell>
                  <TableCell className="text-right tabular-nums">{pieniadze(a.sprzedaz, "pln")}</TableCell>
                  <TableCell className="tabular-nums">{dataLabel(a.sprzedazData)}</TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground" title={a.notatka}>{a.notatka || "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => otworz(a)}>Edytuj</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Okno
        auto={edytowane}
        otwarte={otwarte}
        zamknij={() => ustawOtwarte(false)}
        zAuto1={zAuto1}
        zapisz={(p) => {
          const nowe = zPol(p, edytowane?.id ?? crypto.randomUUID())
          zmien(edytowane ? auta.map((a) => (a.id === nowe.id ? nowe : a)) : [...auta, nowe])
          ustawOtwarte(false)
        }}
        usun={() => {
          if (edytowane) zmien(auta.filter((a) => a.id !== edytowane.id))
          ustawOtwarte(false)
        }}
      />
    </>
  )
}
