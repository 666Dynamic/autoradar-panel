import * as React from "react"
import { ExternalLinkIcon, FileTextIcon, ImagePlusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Wybor } from "@/components/wybor"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Dane } from "@/lib/dane"
import {
  adresyZdjec, czyPdf, dataLabel, dniOd, dodajAuto, dodajKoszt, doOtwarcia, dzis, KATEGORIE, kolorOferty, LISTA, NAZWA_KATEGORII, NAZWA_STATUSU,
  pobierzWszystko, przeniesStare, rachunek, stareAuta, STATUSY, usunAuto, usunKoszt, usunZdjecie, wgraj, zmienAuto, zmienZdjecie,
  type Kategoria, type Koszt, type MojeAuto, type Status, type Wal, type Zdjecie,
} from "@/lib/moje-auta"
import { cn } from "@/lib/utils"

const fmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 })
const kw = (n: number | null | undefined, w: Wal) => (n === null || n === undefined ? "—" : `${fmt.format(n)} ${w === "EUR" ? "€" : "zł"}`)
const plusKw = (n: number | null, w: Wal) => (n === null ? "—" : `${n > 0 ? "+" : ""}${kw(n, w)}`)
const kolorZysku = (n: number | null) => (n === null ? "" : n >= 0 ? "text-success" : "text-destructive")
// „12 500,50” → 12500.5; puste → null
const liczba = (s: string) => {
  const t = s.replace(/\s/g, "").replace(",", ".")
  return t === "" || !Number.isFinite(Number(t)) ? null : Number(t)
}
const tekst = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n))

function Pole({ etykieta, children, className }: { etykieta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label>{etykieta}</Label>
      {children}
    </div>
  )
}

function WalutaPola({ value, onChange }: { value: Wal; onChange: (w: Wal) => void }) {
  return (
    <ToggleGroup type="single" variant="outline" size="sm" value={value} onValueChange={(v) => v && onChange(v as Wal)}>
      <ToggleGroupItem value="EUR">€</ToggleGroupItem>
      <ToggleGroupItem value="PLN">zł</ToggleGroupItem>
    </ToggleGroup>
  )
}

// Kwota z walutą obok, jak w MeinBestand: każda kwota ma swoją walutę.
function Kwota({ value, onChange, waluta, onWaluta, placeholder }: { value: string; onChange: (s: string) => void; waluta: Wal; onWaluta?: (w: Wal) => void; placeholder?: string }) {
  return (
    <div className="flex gap-2">
      <Input inputMode="decimal" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {onWaluta ? <WalutaPola value={waluta} onChange={onWaluta} /> : <span className="self-center text-sm text-muted-foreground">{waluta === "EUR" ? "€" : "zł"}</span>}
    </div>
  )
}

function Liczba({ tytul, glowna, mala, className }: { tytul: string; glowna: string; mala?: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border p-2.5 sm:p-3">
      <span className="truncate text-xs text-muted-foreground">{tytul}</span>
      <span className={cn("text-base font-semibold tabular-nums whitespace-nowrap sm:text-xl", className)}>{glowna}</span>
      {mala && <span className="text-xs text-muted-foreground tabular-nums">{mala}</span>}
    </div>
  )
}

type Formularz = {
  nazwa: string; status: Status; rok: string; vin: string; przebieg_km: string; link: string
  zakup_kwota: string; zakup_waluta: Wal; zakup_data: string; przyjazd_data: string
  wystawienie_kwota: string; min_zysk_kwota: string; sprzedaz_waluta: Wal; sprzedaz_kwota: string; sprzedaz_data: string; notatka: string
}
const doFormularza = (a: MojeAuto): Formularz => ({
  nazwa: a.nazwa, status: a.status, rok: tekst(a.rok), vin: a.vin ?? "", przebieg_km: tekst(a.przebieg_km), link: a.link ?? "",
  zakup_kwota: tekst(a.zakup_kwota), zakup_waluta: a.zakup_waluta, zakup_data: a.zakup_data ?? "", przyjazd_data: a.przyjazd_data ?? "",
  wystawienie_kwota: tekst(a.wystawienie_kwota), min_zysk_kwota: tekst(a.min_zysk_kwota), sprzedaz_waluta: a.sprzedaz_waluta,
  sprzedaz_kwota: tekst(a.sprzedaz_kwota), sprzedaz_data: a.sprzedaz_data ?? "", notatka: a.notatka,
})
const zFormularza = (f: Formularz): Partial<MojeAuto> => ({
  nazwa: f.nazwa.trim() || "Auto", status: f.status, rok: liczba(f.rok), vin: f.vin.trim() || null, przebieg_km: liczba(f.przebieg_km), link: f.link.trim() || null,
  zakup_kwota: liczba(f.zakup_kwota), zakup_waluta: f.zakup_waluta, zakup_data: f.zakup_data || null, przyjazd_data: f.przyjazd_data || null,
  wystawienie_kwota: liczba(f.wystawienie_kwota), min_zysk_kwota: liczba(f.min_zysk_kwota), sprzedaz_waluta: f.sprzedaz_waluta,
  sprzedaz_kwota: liczba(f.sprzedaz_kwota), sprzedaz_data: f.sprzedaz_data || null, notatka: f.notatka,
})

// ---------- Zdjęcia i szkody ----------

function Zdjecia({ auto, zdjecia, adresy, zmien }: {
  auto: MojeAuto
  zdjecia: Zdjecie[]
  adresy: Record<string, string>
  zmien: (dodane: Zdjecie[], usuniete: string[], adresy?: Record<string, string>) => void
}) {
  const [tylkoSzkody, ustawTylkoSzkody] = React.useState(false)
  const [postep, ustawPostep] = React.useState<string | null>(null)
  const [duze, ustawDuze] = React.useState<Zdjecie | null>(null)
  const plik = React.useRef<HTMLInputElement>(null)
  const lista = tylkoSzkody ? zdjecia.filter((z) => z.szkoda) : zdjecia

  const wgrajPliki = async (pliki: FileList | null) => {
    if (!pliki?.length) return
    const dodane: Zdjecie[] = []
    let bledy = 0
    for (const [i, p] of [...pliki].entries()) {
      ustawPostep(`Wgrywam ${i + 1}/${pliki.length}…`)
      try {
        dodane.push(await wgraj(auto.id, p, { szkoda: tylkoSzkody, kolejnosc: zdjecia.length + i }))
      } catch {
        bledy++
      }
    }
    ustawPostep(null)
    zmien(dodane, [], await adresyZdjec(dodane))
    if (bledy) toast.error(`Nie udało się wgrać ${bledy} z ${pliki.length} plików.`)
  }

  const popraw = async (z: Zdjecie, zmiany: Partial<Zdjecie>) => {
    try {
      zmien([await zmienZdjecie(z.id, zmiany)], [z.id])
    } catch {
      toast.error("Nie udało się zapisać.")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={postep !== null} onClick={() => plik.current?.click()}><ImagePlusIcon />{postep ?? (tylkoSzkody ? "Dodaj zdjęcia szkód" : "Dodaj zdjęcia")}</Button>
        <input ref={plik} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { wgrajPliki(e.target.files); e.target.value = "" }} />
        <ToggleGroup type="single" variant="outline" size="sm" value={tylkoSzkody ? "szkody" : "wszystkie"} onValueChange={(v) => v && ustawTylkoSzkody(v === "szkody")}>
          <ToggleGroupItem value="wszystkie">Wszystkie ({zdjecia.length})</ToggleGroupItem>
          <ToggleGroupItem value="szkody">Szkody ({zdjecia.filter((z) => z.szkoda).length})</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p className="text-xs text-muted-foreground">Zdjęcia są zmniejszane do 2000 px (szkody widać po przybliżeniu). Można też dodać PDF, np. umowę albo fakturę.</p>
      {!lista.length ? (
        <p className="text-sm text-muted-foreground">{tylkoSzkody ? "Brak zdjęć szkód." : "Brak zdjęć."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {lista.map((z) => (
            <div key={z.id} className="flex min-w-0 flex-col gap-1.5">
              {czyPdf(z) ? (
                <a href={adresy[z.sciezka]} target="_blank" rel="noopener" className="flex aspect-[4/3] items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground"><FileTextIcon className="mr-1 size-4" />PDF</a>
              ) : (
                <button type="button" onClick={() => ustawDuze(z)} className="overflow-hidden rounded-md border">
                  <img src={adresy[z.sciezka]} alt={z.opis || auto.nazwa} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id={`szkoda-${z.id}`} checked={z.szkoda} onCheckedChange={(v) => popraw(z, { szkoda: v === true })} />
                <Label htmlFor={`szkoda-${z.id}`} className="text-xs font-normal">Szkoda</Label>
                <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Usuń zdjęcie" onClick={async () => {
                  try {
                    await usunZdjecie(z)
                    zmien([], [z.id])
                  } catch {
                    toast.error("Nie udało się usunąć.")
                  }
                }}><Trash2Icon /></Button>
              </div>
              {z.szkoda && <Input className="h-8 text-xs" placeholder="Gdzie i co, np. lewe drzwi, rysa" defaultValue={z.opis} onBlur={(e) => e.target.value !== z.opis && popraw(z, { opis: e.target.value })} />}
            </div>
          ))}
        </div>
      )}
      <Dialog open={duze !== null} onOpenChange={(v) => !v && ustawDuze(null)}>
        <DialogContent className="max-h-[95svh] overflow-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{duze?.szkoda ? `Szkoda${duze.opis ? `: ${duze.opis}` : ""}` : auto.nazwa}</DialogTitle>
            <DialogDescription>Na telefonie rozsuń palcami, żeby przybliżyć.</DialogDescription>
          </DialogHeader>
          {duze && <a href={adresy[duze.sciezka]} target="_blank" rel="noopener"><img src={adresy[duze.sciezka]} alt={duze.opis || auto.nazwa} className="mx-auto max-h-[78svh] rounded-md object-contain" /></a>}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Koszty ----------

function Koszty({ auto, koszty, waluta, kurs, zmien }: { auto: MojeAuto; koszty: Koszt[]; waluta: Wal; kurs: number; zmien: (dodane: Koszt[], usuniete: string[]) => void }) {
  const [kategoria, ustawKategorie] = React.useState<Kategoria>("transport")
  const [opis, ustawOpis] = React.useState("")
  const [kwota, ustawKwote] = React.useState("")
  const [wal, ustawWal] = React.useState<Wal>("PLN")
  const r = rachunek(auto, koszty, kurs, waluta)
  const dodaj = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = liczba(kwota)
    if (n === null || n < 0) return
    try {
      zmien([await dodajKoszt({ auto_id: auto.id, kategoria, opis: opis.trim(), kwota: n, waluta: wal, data: dzis() })], [])
      ustawOpis("")
      ustawKwote("")
    } catch {
      toast.error("Nie udało się zapisać kosztu.")
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-[10rem_1fr_auto_auto]" onSubmit={dodaj}>
        <Wybor value={kategoria} onChange={(v) => v && ustawKategorie(v as Kategoria)} opcje={KATEGORIE.map(([id, n]) => [id, n])} puste="Kategoria" />
        <Input placeholder="Opis, np. laweta z Berlina" value={opis} onChange={(e) => ustawOpis(e.target.value)} />
        <Kwota value={kwota} onChange={ustawKwote} waluta={wal} onWaluta={ustawWal} placeholder="Kwota" />
        <Button type="submit" disabled={liczba(kwota) === null}><PlusIcon />Dodaj</Button>
      </form>
      {!koszty.length ? (
        <p className="text-sm text-muted-foreground">Brak kosztów.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableBody>
              {koszty.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="whitespace-normal"><span className="font-medium">{NAZWA_KATEGORII[k.kategoria]}</span>{k.opis && <span className="block text-xs text-muted-foreground">{k.opis}</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{kw(k.kwota, k.waluta)}</TableCell>
                  <TableCell className="w-10"><Button variant="ghost" size="icon-sm" aria-label="Usuń koszt" onClick={async () => {
                    try {
                      await usunKoszt(k.id)
                      zmien([], [k.id])
                    } catch {
                      toast.error("Nie udało się usunąć.")
                    }
                  }}><Trash2Icon /></Button></TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Razem koszty</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{kw(r.koszty, waluta)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ---------- Teczka auta ----------

function Teczka({ auto, koszty, zdjecia, adresy, waluta, kurs, zakladka, zamknij, zapisane, usuniete, zmienKoszty, zmienZdjecia }: {
  auto: MojeAuto; koszty: Koszt[]; zdjecia: Zdjecie[]; adresy: Record<string, string>; waluta: Wal; kurs: number; zakladka: string
  zamknij: () => void; zapisane: (a: MojeAuto) => void; usuniete: (id: string) => void
  zmienKoszty: (dodane: Koszt[], usuniete: string[]) => void; zmienZdjecia: (dodane: Zdjecie[], usuniete: string[], adresy?: Record<string, string>) => void
}) {
  const [f, ustawF] = React.useState(() => doFormularza(auto))
  const [oferta, ustawOferte] = React.useState("")
  const [potwierdz, ustawPotwierdz] = React.useState(false)
  const [zapisuje, ustawZapisuje] = React.useState(false)
  const zmienione = JSON.stringify(f) !== JSON.stringify(doFormularza(auto))
  const pole = (k: keyof Formularz) => ({ value: f[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => ustawF({ ...f, [k]: e.target.value }) })
  // Rachunek na żywo z tego, co wpisane (jeszcze przed zapisem).
  const podglad = { ...auto, ...zFormularza(f) } as MojeAuto
  const r = rachunek(podglad, koszty, kurs, waluta)
  const r2 = rachunek(podglad, koszty, kurs, f.sprzedaz_waluta)
  const kolor = kolorOferty(liczba(oferta), r2.minimalna, r2.wystawienie)
  const lista = auto.lista ?? {}

  const zapisz = async (zmiany: Partial<MojeAuto> = zFormularza(f)) => {
    ustawZapisuje(true)
    try {
      const nowe = await zmienAuto(auto.id, zmiany)
      zapisane(nowe)
      return nowe
    } catch {
      toast.error("Nie udało się zapisać.")
    } finally {
      ustawZapisuje(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6">{f.nazwa || "Auto"}</DialogTitle>
        <DialogDescription>
          {NAZWA_STATUSU[f.status]}
          {auto.zrodlo !== "inne" && ` · ${auto.zrodlo === "auto1" ? "Auto1" : "Dania"}${auto.zrodlo_id ? ` ${auto.zrodlo_id}` : ""}`}
          {dniOd(auto.przyjazd_data, auto.sprzedaz_data) !== null && ` · ${dniOd(auto.przyjazd_data, auto.sprzedaz_data)} dni na placu`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-3 gap-2">
        <Liczba tytul="Koszt całkowity" glowna={kw(r.razem, waluta)} mala={`zakup ${kw(r.zakup, waluta)} + koszty ${kw(r.koszty, waluta)}`} />
        <Liczba tytul="Cena minimalna" glowna={kw(r.minimalna, waluta)} mala={f.min_zysk_kwota ? `z zyskiem ${kw(liczba(f.min_zysk_kwota), f.sprzedaz_waluta)}` : "ustaw minimalny zysk"} />
        <Liczba tytul={r.zakonczone ? "Zysk" : "Zysk przy cenie wystawienia"} glowna={plusKw(r.zysk, waluta)} mala={r.procent === null ? undefined : `${r.procent.toFixed(1).replace(".", ",")}% ceny`} className={kolorZysku(r.zysk)} />
      </div>
      <Tabs defaultValue={zakladka} className="min-w-0">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="dane">Dane</TabsTrigger>
          <TabsTrigger value="zdjecia">Zdjęcia{zdjecia.length ? ` (${zdjecia.length})` : ""}</TabsTrigger>
          <TabsTrigger value="koszty">Koszty{koszty.length ? ` (${koszty.length})` : ""}</TabsTrigger>
          <TabsTrigger value="sprzedaz">Sprzedaż</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="dane" className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <Pole etykieta="Auto" className="sm:col-span-2"><Input placeholder="np. Audi A4 2.0 TDI, czarne" {...pole("nazwa")} /></Pole>
          <Pole etykieta="Status"><Wybor value={f.status} onChange={(v) => v && ustawF({ ...f, status: v as Status })} opcje={STATUSY.map(([id, n]) => [id, n])} puste="Status" /></Pole>
          <Pole etykieta="Rok"><Input inputMode="numeric" {...pole("rok")} /></Pole>
          <Pole etykieta="VIN"><Input className="uppercase" {...pole("vin")} /></Pole>
          <Pole etykieta="Przebieg (km)"><Input inputMode="numeric" {...pole("przebieg_km")} /></Pole>
          <Pole etykieta="Cena zakupu"><Kwota {...pole("zakup_kwota")} onChange={(s) => ustawF({ ...f, zakup_kwota: s })} waluta={f.zakup_waluta} onWaluta={(w) => ustawF({ ...f, zakup_waluta: w })} /></Pole>
          <Pole etykieta="Data zakupu"><Input type="date" {...pole("zakup_data")} /></Pole>
          <Pole etykieta="Przyjazd na plac"><Input type="date" {...pole("przyjazd_data")} /></Pole>
          <Pole etykieta="Link (Auto1, Dania, ogłoszenie)">
            <div className="flex gap-2">
              <Input {...pole("link")} />
              {f.link && <Button asChild variant="outline" size="icon"><a href={f.link} target="_blank" rel="noopener" aria-label="Otwórz link"><ExternalLinkIcon /></a></Button>}
            </div>
          </Pole>
          <Pole etykieta="Notatka" className="sm:col-span-2"><Textarea rows={3} placeholder="Bez danych klientów" {...pole("notatka")} /></Pole>
        </TabsContent>

        <TabsContent value="zdjecia" className="pt-2"><Zdjecia auto={auto} zdjecia={zdjecia} adresy={adresy} zmien={zmienZdjecia} /></TabsContent>
        <TabsContent value="koszty" className="pt-2"><Koszty auto={auto} koszty={koszty} waluta={waluta} kurs={kurs} zmien={zmienKoszty} /></TabsContent>

        <TabsContent value="sprzedaz" className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <Pole etykieta="Waluta sprzedaży" className="sm:col-span-2"><WalutaPola value={f.sprzedaz_waluta} onChange={(w) => ustawF({ ...f, sprzedaz_waluta: w })} /></Pole>
          <Pole etykieta="Cena wystawienia"><Kwota value={f.wystawienie_kwota} onChange={(s) => ustawF({ ...f, wystawienie_kwota: s })} waluta={f.sprzedaz_waluta} /></Pole>
          <Pole etykieta="Minimalny zysk"><Kwota value={f.min_zysk_kwota} onChange={(s) => ustawF({ ...f, min_zysk_kwota: s })} waluta={f.sprzedaz_waluta} placeholder="np. 3000" /></Pole>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <p className="text-sm">Cena minimalna: <span className="font-semibold tabular-nums">{kw(r2.minimalna, f.sprzedaz_waluta)}</span> <span className="text-xs text-muted-foreground">(koszt całkowity {kw(r2.razem, f.sprzedaz_waluta)} + minimalny zysk)</span></p>
            <Pole etykieta="Oferta klienta" className="mt-2">
              <Kwota value={oferta} onChange={ustawOferte} waluta={f.sprzedaz_waluta} placeholder="ile proponuje klient" />
            </Pole>
            {kolor && (
              <p className={cn("mt-2 text-sm font-medium", kolor === "zielona" ? "text-success" : kolor === "pomaranczowa" ? "text-warning" : "text-destructive")}>
                {kolor === "zielona" ? "Dobra oferta: cena wystawienia albo więcej." : kolor === "pomaranczowa" ? "Do negocjacji: powyżej ceny minimalnej, poniżej ceny wystawienia." : `Za mało: ${kw((r2.minimalna ?? 0) - (liczba(oferta) ?? 0), f.sprzedaz_waluta)} poniżej ceny minimalnej.`}
                {" "}Zysk przy tej ofercie: {plusKw(r2.razem === null ? null : (liczba(oferta) ?? 0) - r2.razem, f.sprzedaz_waluta)}
              </p>
            )}
          </div>
          <Pole etykieta="Cena sprzedaży"><Kwota value={f.sprzedaz_kwota} onChange={(s) => ustawF({ ...f, sprzedaz_kwota: s })} waluta={f.sprzedaz_waluta} /></Pole>
          <Pole etykieta="Data sprzedaży"><Input type="date" {...pole("sprzedaz_data")} /></Pole>
          {f.status !== "sprzedane" && liczba(f.sprzedaz_kwota) !== null && (
            <Button variant="outline" className="sm:col-span-2" onClick={() => ustawF({ ...f, status: "sprzedane", sprzedaz_data: f.sprzedaz_data || dzis() })}>Oznacz jako sprzedane</Button>
          )}
        </TabsContent>

        <TabsContent value="lista" className="flex flex-col gap-2 pt-2">
          {LISTA.map(([id, nazwa]) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox id={`lista-${id}`} checked={!!lista[id]} onCheckedChange={(v) => zapisz({ lista: { ...lista, [id]: v === true } })} />
              <Label htmlFor={`lista-${id}`} className="font-normal">{nazwa}</Label>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Zapisuje się od razu po kliknięciu.</p>
        </TabsContent>
      </Tabs>
      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant={potwierdz ? "destructive" : "outline"} onClick={async () => {
          if (!potwierdz) return ustawPotwierdz(true)
          try {
            await usunAuto(auto.id, zdjecia)
            usuniete(auto.id)
          } catch {
            toast.error("Nie udało się usunąć.")
          }
        }}>{potwierdz ? "Na pewno usunąć z kosztami i zdjęciami?" : "Usuń auto"}</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={zamknij}>{zmienione ? "Anuluj" : "Zamknij"}</Button>
          <Button disabled={!zmienione || zapisuje} onClick={async () => {
            const n = await zapisz()
            if (!n) return
            ustawF(doFormularza(n))
            toast.success("Zapisano.")
          }}>{zapisuje ? "Zapisuję…" : "Zapisz"}</Button>
        </div>
      </DialogFooter>
    </>
  )
}

// ---------- Nowe auto (krok 1: dane; potem teczka: zdjęcia i koszty) ----------

function NoweAutoOkno({ otwarte, zamknij, dodane }: { otwarte: boolean; zamknij: () => void; dodane: (a: MojeAuto) => void }) {
  const [nazwa, ustawNazwe] = React.useState("")
  const [kwota, ustawKwote] = React.useState("")
  const [wal, ustawWal] = React.useState<Wal>("EUR")
  const [data, ustawDate] = React.useState(dzis)
  const [czekam, ustawCzekam] = React.useState(false)
  return (
    <Dialog open={otwarte} onOpenChange={(v) => !v && zamknij()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj auto</DialogTitle>
          <DialogDescription>Potem w teczce dodasz zdjęcia, szkody i koszty. Auto z Auto1 albo Danii dodasz szybciej przyciskiem „Kupiłem” w jego oknie.</DialogDescription>
        </DialogHeader>
        <form id="nowe-auto" className="flex flex-col gap-3" onSubmit={async (e) => {
          e.preventDefault()
          ustawCzekam(true)
          try {
            dodane(await dodajAuto({ nazwa: nazwa.trim(), zakup_kwota: liczba(kwota), zakup_waluta: wal, zakup_data: data || null }))
            ustawNazwe("")
            ustawKwote("")
          } catch {
            toast.error("Nie udało się dodać auta.")
          } finally {
            ustawCzekam(false)
          }
        }}>
          <Pole etykieta="Auto"><Input autoFocus placeholder="np. Audi A4 2.0 TDI, czarne" value={nazwa} onChange={(e) => ustawNazwe(e.target.value)} /></Pole>
          <Pole etykieta="Cena zakupu"><Kwota value={kwota} onChange={ustawKwote} waluta={wal} onWaluta={ustawWal} /></Pole>
          <Pole etykieta="Data zakupu"><Input type="date" value={data} onChange={(e) => ustawDate(e.target.value)} /></Pole>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={zamknij}>Anuluj</Button>
          <Button type="submit" form="nowe-auto" disabled={!nazwa.trim() || czekam}>Dalej</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Strona ----------

const W_TOKU = ""
export function MojeAuta({ dane }: { dane: Dane }) {
  const kurs = dane.meta.rate_value
  const [auta, ustawAuta] = React.useState<MojeAuto[] | null>(null)
  const [koszty, ustawKoszty] = React.useState<Koszt[]>([])
  const [zdjecia, ustawZdjecia] = React.useState<Zdjecie[]>([])
  const [adresy, ustawAdresy] = React.useState<Record<string, string>>({})
  const [blad, ustawBlad] = React.useState(false)
  const [waluta, ustawWalute] = React.useState<Wal>("PLN")
  const [filtr, ustawFiltr] = React.useState(W_TOKU)
  const [otwarte, ustawOtwarte] = React.useState<{ id: string; zakladka: string } | null>(null)
  const [nowe, ustawNowe] = React.useState(false)
  const [stare, ustawStare] = React.useState(() => stareAuta().length)
  const wTelefonie = useIsMobile()

  React.useEffect(() => {
    let aktywne = true
    pobierzWszystko().then(async (w) => {
      if (!aktywne) return
      ustawAuta(w.auta)
      ustawKoszty(w.koszty)
      ustawZdjecia(w.zdjecia)
      const id = doOtwarcia()
      if (id && w.auta.some((a) => a.id === id)) ustawOtwarte({ id, zakladka: "zdjecia" })
      const a = await adresyZdjec(w.zdjecia)
      if (aktywne) ustawAdresy(a)
    }).catch(() => aktywne && ustawBlad(true))
    return () => { aktywne = false }
  }, [])

  if (blad) return <p className="text-destructive">Nie udało się wczytać Moich aut. Odśwież stronę.</p>
  if (!auta) return <p className="text-muted-foreground">Wczytuję Moje auta…</p>

  const kosztyAuta = (id: string) => koszty.filter((k) => k.auto_id === id)
  const zdjeciaAuta = (id: string) => zdjecia.filter((z) => z.auto_id === id)
  const miniatura = (id: string) => {
    const z = zdjeciaAuta(id).find((x) => !czyPdf(x) && !x.szkoda) ?? zdjeciaAuta(id).find((x) => !czyPdf(x))
    return z ? adresy[z.sciezka] : undefined
  }
  const rok = String(new Date().getFullYear())
  const wToku = auta.filter((a) => a.status !== "sprzedane")
  const sprzedaneWRoku = auta.filter((a) => a.status === "sprzedane" && a.sprzedaz_data?.startsWith(rok))
  const suma = (lista: MojeAuto[], pole: "razem" | "zysk") => lista.reduce((s, a) => s + (rachunek(a, kosztyAuta(a.id), kurs, waluta)[pole] ?? 0), 0)
  const kafelki: [string, string, string?][] = [
    ["W toku (kupione do zarezerwowanych)", String(wToku.length)],
    ["Zainwestowane w auta w toku", kw(suma(wToku, "razem"), waluta)],
    [`Sprzedane w ${rok}`, String(sprzedaneWRoku.length)],
    [`Zysk w ${rok}`, plusKw(suma(sprzedaneWRoku, "zysk"), waluta), kolorZysku(suma(sprzedaneWRoku, "zysk"))],
  ]
  const lista = filtr === W_TOKU ? wToku : filtr === "wszystkie" ? auta : auta.filter((a) => a.status === filtr)
  const wybrane = otwarte ? auta.find((a) => a.id === otwarte.id) : undefined
  const otworz = (id: string, zakladka = "dane") => ustawOtwarte({ id, zakladka })

  const zmienKoszty = (dodane: Koszt[], usuniete: string[]) => ustawKoszty((k) => [...k.filter((x) => !usuniete.includes(x.id)), ...dodane])
  const zmienZdjecia = (dodane: Zdjecie[], usuniete: string[], noweAdresy?: Record<string, string>) => {
    ustawZdjecia((z) => {
      const poprzednie = new Map(z.map((x) => [x.id, x]))
      const zostaja = z.filter((x) => !usuniete.includes(x.id) || dodane.some((d) => d.id === x.id))
      // Zmienione zdjęcie zostaje na swoim miejscu, nowe na końcu.
      return [...zostaja.map((x) => dodane.find((d) => d.id === x.id) ?? x), ...dodane.filter((d) => !poprzednie.has(d.id))]
    })
    if (noweAdresy) ustawAdresy((a) => ({ ...a, ...noweAdresy }))
  }

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
        <Button size="sm" onClick={() => ustawNowe(true)}><PlusIcon />Dodaj auto</Button>
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
                const n = await przeniesStare()
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
        <p className="text-muted-foreground">{auta.length ? "Brak aut w tym widoku." : "Brak aut. Dodaj pierwsze albo kliknij „Kupiłem” w oknie auta Auto1 lub Danii."}</p>
      ) : wTelefonie ? (
        <div className="flex flex-col gap-3">
          {lista.map((a) => {
            const r = rachunek(a, kosztyAuta(a.id), kurs, waluta)
            return (
              <Card key={a.id} className="cursor-pointer py-0" onClick={() => otworz(a.id)}>
                <CardContent className="flex gap-3 p-3">
                  {miniatura(a.id) ? <img src={miniatura(a.id)} alt="" className="size-20 shrink-0 rounded-md object-cover" /> : <div className="size-20 shrink-0 rounded-md bg-muted" />}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{a.nazwa}</span>
                      <Badge variant={a.status === "sprzedane" ? "secondary" : "outline"}>{NAZWA_STATUSU[a.status]}</Badge>
                    </div>
                    <div className="grid grid-cols-2 text-sm">
                      <span><span className="block text-xs text-muted-foreground">Koszt całkowity</span>{kw(r.razem, waluta)}</span>
                      <span><span className="block text-xs text-muted-foreground">{r.zakonczone ? "Zysk" : "Zysk (wystawienie)"}</span><span className={kolorZysku(r.zysk)}>{plusKw(r.zysk, waluta)}</span></span>
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
                <TableHead className="text-right">Koszt całkowity</TableHead>
                <TableHead className="text-right">Cena wystawienia</TableHead>
                <TableHead className="text-right">Zysk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => {
                const r = rachunek(a, kosztyAuta(a.id), kurs, waluta)
                return (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => otworz(a.id)}>
                    <TableCell>{miniatura(a.id) ? <img src={miniatura(a.id)} alt="" className="h-12 w-16 rounded-md object-cover" /> : <div className="h-12 w-16 rounded-md bg-muted" />}</TableCell>
                    <TableCell className="min-w-40 whitespace-normal">{a.nazwa}<div className="text-xs text-muted-foreground">{a.zrodlo === "auto1" ? "Auto1" : a.zrodlo === "dania" ? "Dania" : "inne"}{a.zrodlo_id ? ` ${a.zrodlo_id}` : ""}</div></TableCell>
                    <TableCell><Badge variant={a.status === "sprzedane" ? "secondary" : "outline"}>{NAZWA_STATUSU[a.status]}</Badge></TableCell>
                    <TableCell className="tabular-nums">{dataLabel(a.zakup_data)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dniOd(a.przyjazd_data, a.sprzedaz_data) ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{kw(r.razem, waluta)}</TableCell>
                    <TableCell className="text-right tabular-nums">{kw(r.wystawienie, waluta)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", kolorZysku(r.zysk))}>{plusKw(r.zysk, waluta)}{!r.zakonczone && r.zysk !== null && <span className="block text-xs text-muted-foreground">przy wystawieniu</span>}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!wybrane} onOpenChange={(v) => !v && ustawOtwarte(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          {wybrane && otwarte && (
            <Teczka
              key={wybrane.id}
              auto={wybrane}
              koszty={kosztyAuta(wybrane.id)}
              zdjecia={zdjeciaAuta(wybrane.id)}
              adresy={adresy}
              waluta={waluta}
              kurs={kurs}
              zakladka={otwarte.zakladka}
              zamknij={() => ustawOtwarte(null)}
              zapisane={(n) => ustawAuta((l) => l!.map((a) => (a.id === n.id ? n : a)))}
              usuniete={(id) => { ustawAuta((l) => l!.filter((a) => a.id !== id)); ustawOtwarte(null) }}
              zmienKoszty={zmienKoszty}
              zmienZdjecia={zmienZdjecia}
            />
          )}
        </DialogContent>
      </Dialog>
      <NoweAutoOkno otwarte={nowe} zamknij={() => ustawNowe(false)} dodane={(a) => { ustawAuta((l) => [a, ...l!]); ustawNowe(false); otworz(a.id, "zdjecia") }} />
    </>
  )
}
