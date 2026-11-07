import * as React from "react"
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ExternalLinkIcon, FileTextIcon, ImagePlusIcon,
  Maximize2Icon, PlusIcon, SquareIcon, StarIcon, Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Wybor } from "@/components/wybor"
import { useIsMobile } from "@/hooks/use-mobile"
import { pasuje, pieniadze, przygotuj, szukane, type Wiersz } from "@/lib/auta"
import { wczytajSzczegoly, type Dane } from "@/lib/dane"
import { wczytajDania } from "@/lib/dania"
import {
  adresyZdjec, czyPdf, dataLabel, dniOd, dodajAuto, dodajKoszt, doOtwarcia, dzis, KATEGORIE, kupilem, LISTA, naPolska, NAZWA_KATEGORII, NAZWA_STATUSU,
  oczekujaceZdjecia, pamietanaWaluta, pobierzWszystko, poKolei, przelicz, przeniesStare, przesun, rachunek, RODZAJE, stareAuta, STATUSY, usunAuto,
  usunKoszt, usunZdjecie, wgraj, zapamietajWalute, zmienAuto, zmienZdjecie, zPolskiej,
  type Kategoria, type Koszt, type MojeAuto, type Rodzaj, type Status, type Wal, type Zdjecie,
} from "@/lib/moje-auta"
import { pobierzZdjecie } from "@/lib/paczka"
import { cn } from "@/lib/utils"

// Kwoty jak w reszcie panelu: „21.725 €”.
const kw = (n: number | null | undefined, w: Wal) => pieniadze(n, w === "EUR" ? "eur" : "pln")
const plusKw = (n: number | null, w: Wal) => (n === null ? "—" : `${n > 0 ? "+" : ""}${kw(n, w)}`)
const kolorZysku = (n: number | null) => (!n ? "" : n > 0 ? "text-success" : "text-destructive")
const druga = (w: Wal): Wal => (w === "EUR" ? "PLN" : "EUR")
// „12 500,50” → 12500.5; puste → null
const liczba = (s: string) => {
  const t = s.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
  return t === "" || !Number.isFinite(Number(t)) ? null : Number(t)
}
const tekst = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n))

const KLUCZ_WIDOKU = "ar_moje_waluta" // waluta, w której liczą się sumy i zysk
const KLUCZ_KOSZTU = "ar_moje_waluta_kosztu" // ostatnio wybrana waluta nowego kosztu
const KLUCZ_SPRZEDAZY = "ar_moje_waluta_sprzedazy"

// ---------- Drobne elementy ----------

function WalutaPola({ value, onChange, size = "sm" }: { value: Wal; onChange: (w: Wal) => void; size?: "sm" | "default" }) {
  return (
    <ToggleGroup type="single" variant="outline" size={size} value={value} onValueChange={(v) => v && onChange(v as Wal)}>
      <ToggleGroupItem value="EUR" aria-label="Euro">€</ToggleGroupItem>
      <ToggleGroupItem value="PLN" aria-label="Złote">zł</ToggleGroupItem>
    </ToggleGroup>
  )
}

// Jedna z trzech liczb na górze okna, jak w oknie Auto1: duża w walucie widoku, mała w drugiej.
function Liczba({ tytul, glowna, mala, className }: { tytul: string; glowna: string; mala?: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border p-2.5 sm:p-3">
      <span className="truncate text-xs text-muted-foreground">{tytul}</span>
      <span className={cn("text-base font-semibold tabular-nums whitespace-nowrap sm:text-xl", className)}>{glowna}</span>
      {mala && <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{mala}</span>}
    </div>
  )
}

// Wiersz „nazwa … wartość” jak w listach okna Auto1.
function Rzad({ etykieta, children, className }: { etykieta: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-9 items-center justify-between gap-3", className)}>
      <dt className="min-w-0 text-muted-foreground">{etykieta}</dt>
      <dd className="flex shrink-0 items-center justify-end gap-1.5 text-right tabular-nums">{children}</dd>
    </div>
  )
}

// Pole zapisywane samo po wyjściu z niego (albo Enter).
function Pole({ wartosc, zapisz, className, ...reszta }: { wartosc: string; zapisz: (s: string) => void } & Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onBlur">) {
  return (
    <Input key={wartosc} defaultValue={wartosc} className={cn("h-8 w-40 text-right sm:w-44", className)} {...reszta}
      onBlur={(e) => e.target.value.trim() !== wartosc && zapisz(e.target.value.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
  )
}

function PoleDaty({ wartosc, zapisz, className }: { wartosc: string | null; zapisz: (iso: string | null) => void; className?: string }) {
  return (
    <Pole wartosc={naPolska(wartosc)} placeholder="dd.mm.rrrr" inputMode="numeric" className={className} zapisz={(t) => {
      if (!t) return zapisz(null)
      const iso = zPolskiej(t)
      if (iso) zapisz(iso)
      else toast.error("Wpisz datę jak 07.11.2026.")
    }} />
  )
}

function PoleKwoty({ wartosc, waluta, zapisz, zmienWalute }: { wartosc: number | null; waluta: Wal; zapisz: (n: number | null) => void; zmienWalute: (w: Wal) => void }) {
  return (
    <>
      <Pole wartosc={wartosc === null ? "" : wartosc.toLocaleString("de-DE", { maximumFractionDigits: 2 })} inputMode="decimal" placeholder="kwota" className="w-28 sm:w-32" zapisz={(t) => {
        const n = liczba(t)
        if (t && n === null) toast.error("Wpisz samą kwotę, np. 12500.")
        else zapisz(n)
      }} />
      <WalutaPola value={waluta} onChange={zmienWalute} />
    </>
  )
}

// ---------- Zdjęcia: trzy grupy, galeria jak w oknie Auto1 ----------

export type Wgrywanie = { autoId: string; rodzaj: Rodzaj; gotowe: number; razem: number; bledy: number }

async function pobierzZip(nazwa: string, zdjecia: Zdjecie[], adresy: Record<string, string>) {
  const { default: Zip } = await import("jszip")
  const zip = new Zip()
  let bledy = 0
  await Promise.all(zdjecia.map(async (z, i) => {
    try {
      const o = await fetch(adresy[z.sciezka])
      if (!o.ok) throw new Error(String(o.status))
      zip.file(`${String(i + 1).padStart(2, "0")}.${czyPdf(z) ? "pdf" : "jpg"}`, await o.blob())
    } catch {
      bledy++
    }
  }))
  const link = document.createElement("a")
  link.href = URL.createObjectURL(await zip.generateAsync({ type: "blob" }))
  link.download = `${nazwa.replace(/[^\p{L}\p{N} .-]/gu, "").trim() || "auto"}.zip`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 60000)
  return bledy
}

function PelnyEkran({ zdjecia, adresy, start, zamknij }: { zdjecia: Zdjecie[]; adresy: Record<string, string>; start: number | null; zamknij: () => void }) {
  const [i, ustawI] = React.useState(start ?? 0)
  const n = zdjecia.length
  const z = zdjecia[i]
  const krok = (o: number) => ustawI((x) => (x + o + n) % n)
  return (
    <Dialog open={start !== null} onOpenChange={(v) => !v && zamknij()}>
      <DialogContent className="h-[95svh] max-w-[calc(100vw-1rem)] grid-rows-[auto_1fr] p-3 sm:max-w-[95vw]"
        onKeyDown={(e) => { if (e.key === "ArrowLeft") krok(-1); if (e.key === "ArrowRight") krok(1) }}>
        <DialogHeader>
          <DialogTitle className="text-sm">{i + 1} z {n}{z?.opis ? ` · ${z.opis}` : ""}</DialogTitle>
          <DialogDescription className="sr-only">Zdjęcie na pełnym ekranie; strzałki przełączają zdjęcia.</DialogDescription>
        </DialogHeader>
        <div className="relative flex min-h-0 items-center justify-center">
          {z && (czyPdf(z)
            ? <a href={adresy[z.sciezka]} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm underline"><FileTextIcon className="size-5" />Otwórz PDF</a>
            : <img src={adresy[z.sciezka]} alt="" className="max-h-full max-w-full rounded-md object-contain" />)}
          {n > 1 && (
            <>
              <Button variant="outline" size="icon" className="absolute left-1 rounded-full" aria-label="Poprzednie" onClick={() => krok(-1)}><ChevronLeftIcon /></Button>
              <Button variant="outline" size="icon" className="absolute right-1 rounded-full" aria-label="Następne" onClick={() => krok(1)}><ChevronRightIcon /></Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Galeria({ auto, zdjecia, adresy, wgrywanie, wgrajDo, zatrzymaj, zmien }: {
  auto: MojeAuto
  zdjecia: Zdjecie[]
  adresy: Record<string, string>
  wgrywanie: Wgrywanie | null
  wgrajDo: (autoId: string, rodzaj: Rodzaj, zadania: (File | string)[]) => void
  zatrzymaj: () => void
  zmien: (zmienione: Zdjecie[], usuniete: string[]) => void
}) {
  const ileW = (r: Rodzaj) => zdjecia.filter((z) => z.rodzaj === r).length
  const [rodzaj, ustawRodzaj] = React.useState<Rodzaj>(() => RODZAJE.find(([r]) => ileW(r))?.[0] ?? "sprzedawca")
  const lista = zdjecia.filter((z) => z.rodzaj === rodzaj).sort(poKolei)
  const [api, ustawApi] = React.useState<CarouselApi>()
  const [biezace, ustawBiezace] = React.useState(0)
  const [wybrane, ustawWybrane] = React.useState<string[]>([])
  const [usunPewne, ustawUsunPewne] = React.useState(false)
  const [pelny, ustawPelny] = React.useState<number | null>(null)
  const [pobieram, ustawPobieram] = React.useState(false)
  const plik = React.useRef<HTMLInputElement>(null)
  const miniatury = React.useRef<HTMLDivElement>(null)
  const tuWgrywa = wgrywanie?.autoId === auto.id
  const i = Math.min(biezace, Math.max(lista.length - 1, 0))
  const z = lista[i]

  React.useEffect(() => {
    if (!api) return
    const pokaz = () => {
      ustawBiezace(api.selectedScrollSnap())
      miniatury.current?.children[api.selectedScrollSnap()]?.scrollIntoView({ block: "nearest", inline: "nearest" })
    }
    api.on("select", pokaz).on("reInit", pokaz)
    return () => { api.off("select", pokaz).off("reInit", pokaz) }
  }, [api])

  const zmienGrupe = (r: Rodzaj) => {
    ustawRodzaj(r)
    ustawWybrane([])
    ustawUsunPewne(false)
    ustawBiezace(0)
    api?.scrollTo(0, true)
  }
  const zapiszZmiany = async (zmiany: { id: string; zmiany: Partial<Zdjecie> }[]) => {
    try {
      zmien(await Promise.all(zmiany.map((x) => zmienZdjecie(x.id, x.zmiany))), [])
    } catch {
      toast.error("Nie udało się zapisać.")
    }
  }
  const przestaw = async (na: number) => {
    await zapiszZmiany(przesun(lista, i, na).map((x) => ({ id: x.id, zmiany: { kolejnosc: x.kolejnosc } })))
    requestAnimationFrame(() => api?.scrollTo(na, true))
  }
  const usun = async (doUsuniecia: Zdjecie[]) => {
    const usuniete: string[] = []
    for (const x of doUsuniecia) {
      try {
        await usunZdjecie(x)
        usuniete.push(x.id)
      } catch {
        toast.error("Nie udało się usunąć zdjęcia.")
      }
    }
    zmien([], usuniete)
    ustawWybrane((w) => w.filter((id) => !usuniete.includes(id)))
    ustawUsunPewne(false)
  }
  const przeniesDo = async (r: Rodzaj) => {
    const docel = zdjecia.filter((x) => x.rodzaj === r).length
    await zapiszZmiany(lista.filter((x) => wybrane.includes(x.id)).map((x, n) => ({ id: x.id, zmiany: { rodzaj: r, kolejnosc: docel + n } })))
    ustawWybrane([])
  }
  const zaznaczone = lista.filter((x) => wybrane.includes(x.id))

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" variant="outline" size="sm" value={rodzaj} onValueChange={(v) => v && zmienGrupe(v as Rodzaj)}>
          {RODZAJE.map(([r, n]) => <ToggleGroupItem key={r} value={r} className="px-2.5">{n} ({ileW(r)})</ToggleGroupItem>)}
        </ToggleGroup>
        <Button size="sm" variant="outline" className="ml-auto" disabled={!!wgrywanie} onClick={() => plik.current?.click()}><ImagePlusIcon />Dodaj</Button>
        <input ref={plik} type="file" multiple accept={rodzaj === "moje" ? "image/*,application/pdf" : "image/*"} className="hidden"
          onChange={(e) => { if (e.target.files?.length) wgrajDo(auto.id, rodzaj, [...e.target.files]); e.target.value = "" }} />
      </div>

      {wgrywanie && (
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span>{tuWgrywa ? `Wgrywam ${wgrywanie.gotowe}/${wgrywanie.razem}` : "Wgrywam zdjęcia innego auta"}{wgrywanie.bledy ? `, nieudane: ${wgrywanie.bledy}` : ""}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(wgrywanie.gotowe / Math.max(wgrywanie.razem, 1)) * 100}%` }} /></div>
          </div>
          <Button size="sm" variant="outline" onClick={zatrzymaj}><SquareIcon />Zatrzymaj</Button>
        </div>
      )}

      {!lista.length ? (
        <button type="button" onClick={() => !wgrywanie && plik.current?.click()}
          className="flex aspect-[16/7] flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/50">
          <ImagePlusIcon className="size-5" />
          {rodzaj === "szkoda" ? "Dodaj zdjęcia szkód" : rodzaj === "sprzedawca" ? "Dodaj zdjęcia od sprzedawcy" : "Dodaj swoje zdjęcia albo PDF (umowa, faktura)"}
        </button>
      ) : (
        <>
          <Carousel key={rodzaj} className="mx-10" setApi={ustawApi}>
            <CarouselContent>
              {lista.map((x, n) => (
                <CarouselItem key={x.id} className="relative">
                  {czyPdf(x) ? (
                    <a href={adresy[x.sciezka]} target="_blank" rel="noopener" className="mx-auto flex h-[30svh] max-w-md items-center justify-center gap-2 rounded-lg border bg-muted text-sm"><FileTextIcon className="size-5" />Otwórz PDF</a>
                  ) : (
                    <button type="button" className="mx-auto block" onClick={() => ustawPelny(n)} aria-label="Pełny ekran">
                      <img src={adresy[x.sciezka]} alt={`${auto.nazwa}, zdjęcie ${n + 1}`} loading="lazy" className="mx-auto max-h-[38svh] rounded-lg object-contain" />
                    </button>
                  )}
                  <Checkbox className="absolute top-2 left-6 size-5 bg-background max-md:size-6" aria-label={`Wybierz zdjęcie ${n + 1}`} checked={wybrane.includes(x.id)}
                    onCheckedChange={(v) => ustawWybrane((w) => (v === true ? [...w, x.id] : w.filter((id) => id !== x.id)))} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious type="button" />
            <CarouselNext type="button" />
          </Carousel>

          {lista.length > 1 && (
            <div ref={miniatury} className="flex gap-1.5 overflow-x-auto p-0.5 pb-1">
              {lista.map((x, n) => (
                <button key={x.id} type="button" aria-label={`Pokaż zdjęcie ${n + 1}`} onClick={() => api?.scrollTo(n)}
                  className={cn("relative shrink-0 overflow-hidden rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50", n === i ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100")}>
                  {czyPdf(x) ? <span className="flex h-12 w-16 items-center justify-center bg-muted"><FileTextIcon className="size-4" /></span>
                    : <img src={adresy[x.sciezka]} alt="" loading="lazy" className="h-12 w-16 object-cover" />}
                  {wybrane.includes(x.id) && <CheckIcon className="absolute top-0.5 left-0.5 size-3.5 rounded-sm bg-primary p-0.5 text-primary-foreground" />}
                </button>
              ))}
            </div>
          )}

          {/* Bieżące zdjęcie: miejsce w kolejności, pełny ekran, opis szkody. */}
          {z && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span className="mr-1 tabular-nums">{i + 1} z {lista.length}</span>
              <Button variant="outline" size="icon-sm" aria-label="Przesuń w lewo" disabled={i === 0} onClick={() => przestaw(i - 1)}><ArrowLeftIcon /></Button>
              <Button variant="outline" size="icon-sm" aria-label="Przesuń w prawo" disabled={i === lista.length - 1} onClick={() => przestaw(i + 1)}><ArrowRightIcon /></Button>
              <Button variant="outline" size="sm" disabled={i === 0} onClick={() => przestaw(0)}><StarIcon />Na początek</Button>
              {!czyPdf(z) && <Button variant="outline" size="sm" onClick={() => ustawPelny(i)}><Maximize2Icon />Pełny ekran</Button>}
              <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Usuń to zdjęcie" onClick={() => usun([z])}><Trash2Icon /></Button>
            </div>
          )}
          {z && rodzaj === "szkoda" && (
            <Pole key={z.id} wartosc={z.opis} placeholder="Gdzie i co, np. lewe drzwi, rysa" className="h-9 w-full text-left sm:w-full"
              zapisz={(t) => zapiszZmiany([{ id: z.id, zmiany: { opis: t } }])} />
          )}

          {/* Zaznaczone zdjęcia: jak w oknie Auto1. */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Wybrane {zaznaczone.length} z {lista.length}</span>
            <Button variant="ghost" size="sm" onClick={() => ustawWybrane(lista.map((x) => x.id))}>Wszystkie</Button>
            {zaznaczone.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={() => ustawWybrane([])}>Żadne</Button>
                <Wybor size="sm" className="w-44" value="" puste="Przenieś do…" onChange={(v) => v && przeniesDo(v as Rodzaj)} opcje={RODZAJE.filter(([r]) => r !== rodzaj).map(([r, n]) => [r, n])} />
                <Button variant={usunPewne ? "destructive" : "ghost"} size="sm" onClick={() => (usunPewne ? usun(zaznaczone) : ustawUsunPewne(true))}>
                  <Trash2Icon />{usunPewne ? `Na pewno usunąć ${zaznaczone.length}?` : "Usuń"}
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="ml-auto" disabled={pobieram} onClick={async () => {
              ustawPobieram(true)
              const bledy = await pobierzZip(auto.nazwa, zaznaczone.length ? zaznaczone : lista, adresy).catch(() => -1)
              ustawPobieram(false)
              if (bledy) toast.error(bledy < 0 ? "Nie udało się przygotować paczki." : `Nie udało się pobrać ${bledy} plików.`)
            }}><DownloadIcon />{pobieram ? "Pakuję…" : zaznaczone.length ? `Pobierz wybrane (${zaznaczone.length})` : `Pobierz wszystkie (${lista.length})`}</Button>
          </div>
        </>
      )}
      <PelnyEkran key={pelny ?? -1} zdjecia={lista} adresy={adresy} start={pelny} zamknij={() => ustawPelny(null)} />
    </div>
  )
}

// ---------- Koszty ----------

function Koszty({ auto, koszty, waluta, kurs, zmien }: { auto: MojeAuto; koszty: Koszt[]; waluta: Wal; kurs: number; zmien: (dodane: Koszt[], usuniete: string[]) => void }) {
  const [kategoria, ustawKategorie] = React.useState<Kategoria>("transport")
  const [opis, ustawOpis] = React.useState("")
  const [kwota, ustawKwote] = React.useState("")
  const [wal, ustawWal] = React.useState<Wal>(() => pamietanaWaluta(KLUCZ_KOSZTU, "EUR"))
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
  const wPrzeliczeniu = (k: Koszt) => (k.waluta === waluta ? null : kw(k.kwota, k.waluta))
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <h3 className="text-sm font-medium">Koszty</h3>
      <dl className="flex flex-col text-sm">
        <Rzad etykieta="Zakup">{kw(r.zakup, waluta)}</Rzad>
        {koszty.map((k) => (
          <Rzad key={k.id} etykieta={<>{NAZWA_KATEGORII[k.kategoria]}{k.opis && <span className="text-foreground"> · {k.opis}</span>}</>}>
            <span className="flex flex-col items-end">
              {kw(przelicz(k.kwota, k.waluta, waluta, kurs), waluta)}
              {wPrzeliczeniu(k) && <span className="text-xs text-muted-foreground">{wPrzeliczeniu(k)}</span>}
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="Usuń koszt" onClick={async () => {
              try {
                await usunKoszt(k.id)
                zmien([], [k.id])
              } catch {
                toast.error("Nie udało się usunąć.")
              }
            }}><Trash2Icon /></Button>
          </Rzad>
        ))}
        <Rzad etykieta="Razem" className="mt-1 border-t pt-1.5 font-medium [&_dt]:text-foreground">
          <span className="flex flex-col items-end">{kw(r.razem, waluta)}<span className="text-xs font-normal text-muted-foreground">{kw(przelicz(r.razem, waluta, druga(waluta), kurs), druga(waluta))}</span></span>
        </Rzad>
      </dl>
      <form className="flex flex-wrap gap-2 border-t pt-3" onSubmit={dodaj}>
        <Select value={kategoria} onValueChange={(v) => ustawKategorie(v as Kategoria)}>
          <SelectTrigger size="sm" className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{KATEGORIE.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="h-8 w-full sm:w-auto sm:flex-1" placeholder="Opis, np. laweta z Berlina" value={opis} onChange={(e) => ustawOpis(e.target.value)} />
        <Input className="h-8 w-24 flex-1 text-right sm:flex-none" inputMode="decimal" placeholder="kwota" value={kwota} onChange={(e) => ustawKwote(e.target.value)} />
        <WalutaPola value={wal} onChange={(w) => { ustawWal(w); zapamietajWalute(KLUCZ_KOSZTU, w) }} />
        <Button type="submit" size="sm" disabled={liczba(kwota) === null}><PlusIcon />Dodaj</Button>
      </form>
    </div>
  )
}

// ---------- Okno auta ----------

function OknoMojegoAuta({ auto, koszty, zdjecia, adresy, waluta, ustawWalute, kurs, wgrywanie, wgrajDo, zatrzymaj, zapisane, usuniete, zmienKoszty, zmienZdjecia }: {
  auto: MojeAuto; koszty: Koszt[]; zdjecia: Zdjecie[]; adresy: Record<string, string>; waluta: Wal; ustawWalute: (w: Wal) => void; kurs: number
  wgrywanie: Wgrywanie | null; wgrajDo: (autoId: string, rodzaj: Rodzaj, zadania: (File | string)[]) => void; zatrzymaj: () => void
  zapisane: (a: MojeAuto) => void; usuniete: (id: string) => void
  zmienKoszty: (dodane: Koszt[], usuniete: string[]) => void; zmienZdjecia: (zmienione: Zdjecie[], usuniete: string[]) => void
}) {
  const [potwierdz, ustawPotwierdz] = React.useState(false)
  const r = rachunek(auto, koszty, kurs, waluta)
  const w2 = druga(waluta)
  const r2 = rachunek(auto, koszty, kurs, w2)
  const lista = auto.lista ?? {}
  const dni = dniOd(auto.przyjazd_data, auto.sprzedaz_data)

  const zapisz = async (zmiany: Partial<MojeAuto>) => {
    // Cena sprzedaży oznacza auto jako sprzedane (data: dziś, jeśli pusta).
    if (zmiany.sprzedaz_kwota != null && auto.status !== "sprzedane") Object.assign(zmiany, { status: "sprzedane", sprzedaz_data: auto.sprzedaz_data ?? dzis() })
    try {
      zapisane(await zmienAuto(auto.id, zmiany))
    } catch {
      toast.error("Nie udało się zapisać.")
    }
  }
  const walutaSprzedazy = (w: Wal) => { zapamietajWalute(KLUCZ_SPRZEDAZY, w); zapisz({ sprzedaz_waluta: w }) }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6">{auto.nazwa}</DialogTitle>
        <DialogDescription>
          {auto.zrodlo === "auto1" ? "Auto1" : auto.zrodlo === "dania" ? "Dania" : "Dodane ręcznie"}{auto.zrodlo_id ? ` ${auto.zrodlo_id}` : ""}
          {dni !== null && ` · ${dni} dni na placu`}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={auto.status} onValueChange={(v) => zapisz({ status: v as Status })}>
          <SelectTrigger size="sm" className="w-44" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSY.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}</SelectContent>
        </Select>
        {auto.link && <Button asChild variant="outline" size="sm"><a href={auto.link} target="_blank" rel="noopener">{auto.zrodlo === "auto1" ? "Auto1" : "Ogłoszenie"}<ExternalLinkIcon /></a></Button>}
        <ToggleGroup type="single" variant="outline" size="sm" className="ml-auto" value={waluta} onValueChange={(v) => v && ustawWalute(v as Wal)}>
          <ToggleGroupItem value="EUR">EUR</ToggleGroupItem>
          <ToggleGroupItem value="PLN">PLN</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Liczba tytul="Koszt" glowna={kw(r.razem, waluta)} mala={kw(r2.razem, w2)} />
        <Liczba tytul={r.zakonczone ? "Sprzedane" : "Wystawione"} glowna={kw(r.cena, waluta)} mala={r.cena === null ? "wpisz niżej" : kw(r2.cena, w2)} />
        <Liczba tytul="Zysk" glowna={plusKw(r.zysk, waluta)} mala={r.zysk === null ? undefined : plusKw(r2.zysk, w2)} className={kolorZysku(r.zysk)} />
      </div>

      <Galeria auto={auto} zdjecia={zdjecia} adresy={adresy} wgrywanie={wgrywanie} wgrajDo={wgrajDo} zatrzymaj={zatrzymaj} zmien={zmienZdjecia} />

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium">Auto</h3>
          <dl className="flex flex-col">
            <Rzad etykieta="Nazwa"><Pole wartosc={auto.nazwa} zapisz={(t) => zapisz({ nazwa: t || "Auto" })} /></Rzad>
            <Rzad etykieta="Rocznik"><Pole wartosc={tekst(auto.rok)} inputMode="numeric" zapisz={(t) => zapisz({ rok: liczba(t) })} /></Rzad>
            <Rzad etykieta="Przebieg (km)"><Pole wartosc={tekst(auto.przebieg_km)} inputMode="numeric" zapisz={(t) => zapisz({ przebieg_km: liczba(t) })} /></Rzad>
            <Rzad etykieta="VIN"><Pole wartosc={auto.vin ?? ""} className="uppercase" zapisz={(t) => zapisz({ vin: t.toUpperCase() || null })} /></Rzad>
            <Rzad etykieta="Link"><Pole wartosc={auto.link ?? ""} placeholder="Auto1, ogłoszenie" zapisz={(t) => zapisz({ link: t || null })} /></Rzad>
          </dl>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-medium">Zakup</h3>
          <dl className="flex flex-col">
            <Rzad etykieta="Cena zakupu"><PoleKwoty wartosc={auto.zakup_kwota} waluta={auto.zakup_waluta} zapisz={(n) => zapisz({ zakup_kwota: n })} zmienWalute={(w) => zapisz({ zakup_waluta: w })} /></Rzad>
            <Rzad etykieta="Data zakupu"><PoleDaty wartosc={auto.zakup_data} zapisz={(d) => zapisz({ zakup_data: d })} /></Rzad>
            <Rzad etykieta="Przyjazd na plac"><PoleDaty wartosc={auto.przyjazd_data} zapisz={(d) => zapisz({ przyjazd_data: d })} /></Rzad>
          </dl>
        </div>
      </div>

      <Koszty auto={auto} koszty={koszty} waluta={waluta} kurs={kurs} zmien={zmienKoszty} />

      <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
        <h3 className="font-medium">Sprzedaż</h3>
        <dl className="flex flex-col">
          <Rzad etykieta="Cena wystawienia"><PoleKwoty wartosc={auto.wystawienie_kwota} waluta={auto.sprzedaz_waluta} zapisz={(n) => zapisz({ wystawienie_kwota: n })} zmienWalute={walutaSprzedazy} /></Rzad>
          <Rzad etykieta="Cena sprzedaży"><PoleKwoty wartosc={auto.sprzedaz_kwota} waluta={auto.sprzedaz_waluta} zapisz={(n) => zapisz({ sprzedaz_kwota: n })} zmienWalute={walutaSprzedazy} /></Rzad>
          <Rzad etykieta="Data sprzedaży"><PoleDaty wartosc={auto.sprzedaz_data} zapisz={(d) => zapisz({ sprzedaz_data: d })} /></Rzad>
          <Rzad etykieta={r.zakonczone ? "Zysk" : "Zysk przy cenie wystawienia"} className="mt-1 border-t pt-1.5 font-medium [&_dt]:text-foreground">
            <span className="flex flex-col items-end">
              <span className={cn("text-base font-semibold", kolorZysku(r.zysk))}>{plusKw(r.zysk, waluta)}</span>
              {r.zysk !== null && <span className="text-xs font-normal text-muted-foreground">{plusKw(r2.zysk, w2)}</span>}
            </span>
          </Rzad>
        </dl>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <h3 className="font-medium">Przed sprzedażą</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {LISTA.map(([id, nazwa]) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox id={`lista-${id}`} checked={!!lista[id]} onCheckedChange={(v) => zapisz({ lista: { ...lista, [id]: v === true } })} />
              <Label htmlFor={`lista-${id}`} className="font-normal">{nazwa}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <h3 className="font-medium">Notatka</h3>
        <Textarea key={auto.notatka} rows={3} defaultValue={auto.notatka} placeholder="Bez danych klientów" onBlur={(e) => e.target.value !== auto.notatka && zapisz({ notatka: e.target.value })} />
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant={potwierdz ? "destructive" : "ghost"} onClick={async () => {
          if (!potwierdz) return ustawPotwierdz(true)
          try {
            await usunAuto(auto.id, zdjecia)
            usuniete(auto.id)
          } catch {
            toast.error("Nie udało się usunąć.")
          }
        }}><Trash2Icon />{potwierdz ? "Na pewno usunąć z kosztami i zdjęciami?" : "Usuń auto"}</Button>
        <DialogClose asChild><Button className="sm:w-40">Zamknij</Button></DialogClose>
      </DialogFooter>
    </>
  )
}

// ---------- Dodaj auto: z listy Auto1 / Danii albo ręcznie, jeden krok ----------

function NoweAutoOkno({ otwarte, zamknij, dane, auta, dodane }: {
  otwarte: boolean; zamknij: () => void; dane: Dane; auta: MojeAuto[]
  dodane: (a: MojeAuto, zdjecia: string[]) => void
}) {
  const [skad, ustawSkad] = React.useState<"lista" | "recznie">("lista")
  const [fraza, ustawFraze] = React.useState("")
  const [dania, ustawDanie] = React.useState<Wiersz[]>([])
  const [wybrane, ustawWybrane] = React.useState<Wiersz | null>(null)
  const [nazwa, ustawNazwe] = React.useState("")
  const [kwota, ustawKwote] = React.useState("")
  const [wal, ustawWal] = React.useState<Wal>("EUR")
  const [data, ustawDate] = React.useState(() => naPolska(dzis()))
  const [czekam, ustawCzekam] = React.useState(false)
  const auto1 = React.useMemo(() => przygotuj(dane.rows), [dane])
  React.useEffect(() => {
    if (otwarte && !dania.length) wczytajDania().then((d) => ustawDanie(przygotuj(d.rows))).catch(() => {})
  }, [otwarte, dania.length])
  const juz = new Set(auta.map((a) => a.zrodlo_id).filter(Boolean))
  const s = szukane(fraza)
  const wyniki = fraza.trim().length < 2 ? [] : [...auto1, ...dania].filter((r) => pasuje(r, s)).slice(0, 8)
  const wybierz = (r: Wiersz) => {
    ustawWybrane(r)
    ustawKwote(tekst(r.a_eur))
    ustawWal("EUR")
  }
  const wyczysc = () => {
    ustawWybrane(null)
    ustawFraze("")
    ustawNazwe("")
    ustawKwote("")
    ustawDate(naPolska(dzis()))
  }
  const dataIso = zPolskiej(data)
  const gotowe = (skad === "lista" ? !!wybrane : !!nazwa.trim()) && (!data || !!dataIso) && (!kwota || liczba(kwota) !== null)

  const dodaj = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gotowe) return
    ustawCzekam(true)
    const zakup = { zakup_kwota: liczba(kwota), zakup_waluta: wal, zakup_data: dataIso }
    try {
      if (wybrane) {
        const sz = wybrane.dania ? undefined : (await wczytajSzczegoly())[wybrane.id]
        const { auto, adresy } = await kupilem(wybrane, sz, zakup)
        dodane(auto, adresy)
      } else {
        dodane(await dodajAuto({ nazwa: nazwa.trim(), ...zakup }), [])
      }
      wyczysc()
    } catch {
      toast.error("Nie udało się dodać auta.")
    } finally {
      ustawCzekam(false)
    }
  }

  return (
    <Dialog open={otwarte} onOpenChange={(v) => { if (!v) { wyczysc(); zamknij() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj auto</DialogTitle>
          <DialogDescription>Auto z Auto1 albo Danii wybierz z listy: dane i zdjęcia przejdą same.</DialogDescription>
        </DialogHeader>
        <form id="nowe-auto" className="flex flex-col gap-3" onSubmit={dodaj}>
          <ToggleGroup type="single" variant="outline" size="sm" className="w-full" value={skad} onValueChange={(v) => { if (v) { ustawSkad(v as "lista" | "recznie"); ustawWybrane(null) } }}>
            <ToggleGroupItem value="lista" className="flex-1">Z listy Auto1 / Dania</ToggleGroupItem>
            <ToggleGroupItem value="recznie" className="flex-1">Wpiszę sam</ToggleGroupItem>
          </ToggleGroup>

          {skad === "lista" && !wybrane && (
            <div className="flex flex-col gap-2">
              <Input autoFocus placeholder="Numer, marka, model" value={fraza} onChange={(e) => ustawFraze(e.target.value)} />
              {fraza.trim().length >= 2 && !wyniki.length && <p className="text-sm text-muted-foreground">Nic nie znaleziono. Auto spoza list dodasz przez „Wpiszę sam”.</p>}
              <div className="flex max-h-72 flex-col overflow-y-auto rounded-lg border empty:hidden">
                {wyniki.map((r) => (
                  <button key={r.id} type="button" onClick={() => wybierz(r)} className="flex items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60">
                    {r.image ? <img src={r.image} alt="" className="h-10 w-14 shrink-0 rounded object-cover" /> : <span className="h-10 w-14 shrink-0 rounded bg-muted" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r.dania ? "Dania" : "Auto1"} {r.id}{juz.has(r.id) && " · już w Moich autach"}</span>
                    </span>
                    <span className="tabular-nums">{pieniadze(r.a_eur, "eur")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {skad === "lista" && wybrane && (
            <div className="flex items-center gap-3 rounded-lg border p-2 text-sm">
              {wybrane.image ? <img src={wybrane.image} alt="" className="h-12 w-16 shrink-0 rounded object-cover" /> : <span className="h-12 w-16 shrink-0 rounded bg-muted" />}
              <span className="min-w-0 flex-1"><span className="block font-medium">{wybrane.title}</span><span className="text-xs text-muted-foreground">{wybrane.dania ? "Dania" : "Auto1"} {wybrane.id}</span></span>
              <Button type="button" variant="ghost" size="sm" onClick={() => ustawWybrane(null)}>Zmień</Button>
            </div>
          )}

          {skad === "recznie" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="nowe-nazwa">Auto</Label>
              <Input id="nowe-nazwa" autoFocus placeholder="np. Audi A4 2.0 TDI, czarne" value={nazwa} onChange={(e) => ustawNazwe(e.target.value)} />
            </div>
          )}

          {(skad === "recznie" || wybrane) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="nowe-kwota">Cena zakupu</Label>
                <div className="flex gap-2">
                  <Input id="nowe-kwota" inputMode="decimal" value={kwota} onChange={(e) => ustawKwote(e.target.value)} />
                  <WalutaPola value={wal} onChange={ustawWal} size="default" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="nowe-data">Data zakupu</Label>
                <Input id="nowe-data" inputMode="numeric" placeholder="dd.mm.rrrr" value={data} onChange={(e) => ustawDate(e.target.value)} aria-invalid={!!data && !dataIso} />
              </div>
            </div>
          )}
        </form>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Anuluj</Button></DialogClose>
          <Button type="submit" form="nowe-auto" disabled={!gotowe || czekam}>{czekam ? "Dodaję…" : "Dodaj auto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Strona ----------

const W_TOKU = ""
const NARAZ = 3

export function MojeAuta({ dane }: { dane: Dane }) {
  const kurs = dane.meta.rate_value
  const [auta, ustawAuta] = React.useState<MojeAuto[] | null>(null)
  const [koszty, ustawKoszty] = React.useState<Koszt[]>([])
  const [zdjecia, ustawZdjecia] = React.useState<Zdjecie[]>([])
  const [adresy, ustawAdresy] = React.useState<Record<string, string>>({})
  const [blad, ustawBlad] = React.useState(false)
  const [waluta, ustawWaluteStan] = React.useState<Wal>(() => pamietanaWaluta(KLUCZ_WIDOKU, "PLN"))
  const [filtr, ustawFiltr] = React.useState(W_TOKU)
  const [otwarte, ustawOtwarte] = React.useState<string | null>(null)
  const [nowe, ustawNowe] = React.useState(false)
  const [stare, ustawStare] = React.useState(() => stareAuta().length)
  const [wgrywanie, ustawWgrywanie] = React.useState<Wgrywanie | null>(null)
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
  const wgrajDo = React.useCallback(async (autoId: string, rodzaj: Rodzaj, zadania: (File | string)[]) => {
    if (!zadania.length) return
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
  }, [zmienZdjecia])

  React.useEffect(() => {
    let aktywne = true
    pobierzWszystko().then(async (w) => {
      if (!aktywne) return
      ustawAuta(w.auta)
      ustawKoszty(w.koszty)
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

  const kosztyAuta = (id: string) => koszty.filter((k) => k.auto_id === id)
  const zdjeciaAuta = (id: string) => zdjecia.filter((z) => z.auto_id === id)
  const miniatura = (id: string) => {
    const wlasne = zdjeciaAuta(id).filter((x) => !czyPdf(x)).sort(poKolei)
    const z = wlasne.find((x) => x.rodzaj === "sprzedawca") ?? wlasne.find((x) => x.rodzaj === "moje") ?? wlasne[0]
    return z ? adresy[z.sciezka] : undefined
  }
  const rok = String(new Date().getFullYear())
  const wToku = auta.filter((a) => a.status !== "sprzedane")
  const sprzedaneWRoku = auta.filter((a) => a.status === "sprzedane" && a.sprzedaz_data?.startsWith(rok))
  const suma = (lista: MojeAuto[], pole: "razem" | "zysk") => lista.reduce((s, a) => s + (rachunek(a, kosztyAuta(a.id), kurs, waluta)[pole] ?? 0), 0)
  const kafelki: [string, string, string?][] = [
    ["Auta w toku", String(wToku.length)],
    ["Zainwestowane w auta w toku", kw(suma(wToku, "razem"), waluta)],
    [`Sprzedane w ${rok}`, String(sprzedaneWRoku.length)],
    [`Zysk w ${rok}`, plusKw(suma(sprzedaneWRoku, "zysk"), waluta), kolorZysku(suma(sprzedaneWRoku, "zysk"))],
  ]
  const lista = filtr === W_TOKU ? wToku : filtr === "wszystkie" ? auta : auta.filter((a) => a.status === filtr)
  const wybrane = otwarte ? auta.find((a) => a.id === otwarte) : undefined
  const zmienKoszty = (dodane: Koszt[], usuniete: string[]) => ustawKoszty((k) => [...k.filter((x) => !usuniete.includes(x.id)), ...dodane])

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
        <p className="text-muted-foreground">{auta.length ? "Brak aut w tym widoku." : "Brak aut. Kliknij „Dodaj auto” albo „Kupiłem” w oknie auta Auto1 lub Danii."}</p>
      ) : wTelefonie ? (
        <div className="flex flex-col gap-3">
          {lista.map((a) => {
            const r = rachunek(a, kosztyAuta(a.id), kurs, waluta)
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
                const r = rachunek(a, kosztyAuta(a.id), kurs, waluta)
                return (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => ustawOtwarte(a.id)}>
                    <TableCell>{miniatura(a.id) ? <img src={miniatura(a.id)} alt="" className="h-12 w-16 rounded-md object-cover" /> : <div className="h-12 w-16 rounded-md bg-muted" />}</TableCell>
                    <TableCell className="min-w-40 whitespace-normal">{a.nazwa}<div className="text-xs text-muted-foreground">{a.zrodlo === "auto1" ? "Auto1" : a.zrodlo === "dania" ? "Dania" : "dodane ręcznie"}{a.zrodlo_id ? ` ${a.zrodlo_id}` : ""}</div></TableCell>
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

      <Dialog open={!!wybrane} onOpenChange={(v) => !v && ustawOtwarte(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          {wybrane && (
            <OknoMojegoAuta
              key={wybrane.id}
              auto={wybrane}
              koszty={kosztyAuta(wybrane.id)}
              zdjecia={zdjeciaAuta(wybrane.id)}
              adresy={adresy}
              waluta={waluta}
              ustawWalute={ustawWalute}
              kurs={kurs}
              wgrywanie={wgrywanie}
              wgrajDo={wgrajDo}
              zatrzymaj={() => { stop.current = true }}
              zapisane={(n) => ustawAuta((l) => l!.map((a) => (a.id === n.id ? n : a)))}
              usuniete={(id) => { ustawAuta((l) => l!.filter((a) => a.id !== id)); ustawOtwarte(null) }}
              zmienKoszty={zmienKoszty}
              zmienZdjecia={zmienZdjecia}
            />
          )}
        </DialogContent>
      </Dialog>
      <NoweAutoOkno otwarte={nowe} zamknij={() => ustawNowe(false)} dane={dane} auta={auta}
        dodane={(a, adresyZdjec) => {
          ustawAuta((l) => [a, ...l!])
          ustawNowe(false)
          ustawOtwarte(a.id)
          wgrajDo(a.id, "sprzedawca", adresyZdjec)
        }} />
    </>
  )
}
