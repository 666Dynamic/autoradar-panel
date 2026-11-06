import * as React from "react"
import { CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, FolderOpenIcon, MegaphoneIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { dodatki, endLabel, kwota, lokalizacja, offersLabel, oplatyAuto1, pieniadze, specyfikacjaAuta, stawkaAkcyzy, tekstFacebook, tekstWhatsApp, wyposazenieOkna, type Waluta, type Wiersz } from "@/lib/auta"
import { MARZA, OPIS_TYPU, doOgloszenia, type AutoDania } from "@/lib/dania"
import { wczytajSzczegoly, type Szczegoly } from "@/lib/dane"
import { linkMobile } from "@/lib/mobile"
import { ogloszenie, zrobOgloszenie } from "@/lib/ogloszenia"
import { pobierzPaczke, zdjeciaAuta } from "@/lib/paczka"
import { odczytajOferty, odczytajTransport, zapiszOferte, zapiszTransport } from "@/lib/pamiec"
import { cn } from "@/lib/utils"

const dzien = (d: string) => d.slice(8, 10) + "." + d.slice(5, 7)

function Tekst({ id, rodzaj, domyslny }: { id: string; rodzaj: "whatsapp" | "facebook"; domyslny: string }) {
  const [tresc, ustaw] = React.useState(() => odczytajOferty()[id]?.[rodzaj] ?? domyslny)
  const [skopiowano, ustawSkopiowano] = React.useState(false)
  const kopiuj = () => navigator.clipboard.writeText(tresc).then(() => {
    ustawSkopiowano(true)
    setTimeout(() => ustawSkopiowano(false), 1500)
  }, () => toast.error("Nie udało się skopiować."))
  return (
    <div className="relative">
      <Textarea className="max-h-40 pr-10" value={tresc} onChange={(e) => { ustaw(e.target.value); zapiszOferte(id, { [rodzaj]: e.target.value }) }} />
      <Button variant="ghost" size="icon-sm" className="absolute top-1.5 right-1.5" aria-label="Kopiuj tekst" onClick={kopiuj}>
        {skopiowano ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  )
}

function Zdjecia({ auto, zdjecia }: { auto: Wiersz; zdjecia: string[] }) {
  const [wybrane, ustawWybrane] = React.useState<string[]>(() => odczytajOferty()[auto.id]?.zdjecia ?? [])
  const [postep, ustawPostep] = React.useState<string | null>(null)
  const [api, ustawApi] = React.useState<CarouselApi>()
  const [biezace, ustawBiezace] = React.useState(0)
  const miniatury = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!api) return
    const pokaz = () => {
      ustawBiezace(api.selectedScrollSnap())
      miniatury.current?.children[api.selectedScrollSnap()]?.scrollIntoView({ block: "nearest", inline: "nearest" })
    }
    api.on("select", pokaz)
    return () => { api.off("select", pokaz) }
  }, [api])
  const zmien = (lista: string[]) => { ustawWybrane(lista); zapiszOferte(auto.id, { zdjecia: lista }) }
  const pobierz = async () => {
    ustawPostep("Pakuję…")
    try {
      const { zdjecia: razem, bledy } = await pobierzPaczke([auto], (g, r) => ustawPostep(`Pobieram zdjęcia ${g}/${r}`))
      if (bledy) toast.error(`Nie udało się pobrać ${bledy} z ${razem} zdjęć.`)
    } catch {
      toast.error("Nie udało się przygotować paczki.")
    } finally {
      ustawPostep(null)
    }
  }
  if (!zdjecia.length) return <p className="text-sm text-muted-foreground">Brak zdjęć.</p>
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Carousel className="mx-10" opts={{ loop: true }} setApi={ustawApi}>
        <CarouselContent>
          {zdjecia.map((url, i) => (
            <CarouselItem key={url} className="relative">
              <img src={url} alt={`${auto.title}, zdjęcie ${i + 1}`} loading="lazy" className="mx-auto max-h-[38svh] rounded-lg object-contain" />
              <Checkbox className="absolute top-2 left-6 size-5 bg-background max-md:size-6" aria-label={`Wybierz zdjęcie ${i + 1}`} checked={wybrane.includes(url)} onCheckedChange={(v) => zmien(zdjecia.filter((x) => (x === url ? v === true : wybrane.includes(x))))} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious type="button" />
        <CarouselNext type="button" />
      </Carousel>
      {zdjecia.length > 1 && (
        <div ref={miniatury} className="flex gap-1.5 overflow-x-auto p-0.5 pb-1">
          {zdjecia.map((url, i) => (
            <button key={url} type="button" aria-label={`Pokaż zdjęcie ${i + 1}`} onClick={() => api?.scrollTo(i)}
              className={cn("relative shrink-0 overflow-hidden rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50", i === biezace ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100")}>
              <img src={url} alt="" loading="lazy" className="h-12 w-16 object-cover" />
              {wybrane.includes(url) && <CheckIcon className="absolute top-0.5 left-0.5 size-3.5 rounded-sm bg-primary p-0.5 text-primary-foreground" />}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Wybrane {wybrane.length} z {zdjecia.length}</span>
        <Button variant="ghost" size="sm" onClick={() => zmien(zdjecia)}>Wszystkie</Button>
        {wybrane.length > 0 && <Button variant="ghost" size="sm" onClick={() => zmien([])}>Żadne</Button>}
        <Button variant="outline" size="sm" className="ml-auto" disabled={postep !== null} onClick={pobierz}>
          <DownloadIcon />{postep ?? (wybrane.length ? `Pobierz wybrane (${wybrane.length})` : `Pobierz wszystkie (${zdjecia.length})`)}
        </Button>
      </div>
    </div>
  )
}

// Noce, w których zmieniła się cena Auto1 albo średnia Otomoto; najnowsza na górze.
function HistoriaCeny({ ceny, waluta, kurs }: { ceny: [string, number | null, number | null][]; waluta: Waluta; kurs: number }) {
  if (ceny.length === 1) return <p className="text-sm text-muted-foreground">Ceny bez zmian od {dzien(ceny[0][0])}.</p>
  const auto1 = (eur: number | null) => pieniadze(eur === null ? null : waluta === "eur" ? eur : eur * kurs, waluta)
  const otomoto = (pln: number | null) => pieniadze(pln === null ? null : waluta === "pln" ? pln : pln / kurs, waluta)
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zmiana ceny</TableHead>
            <TableHead className="text-right">Auto1</TableHead>
            <TableHead className="text-right">Otomoto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...ceny].reverse().map(([noc, a, o]) => (
            <TableRow key={noc}>
              <TableCell>{dzien(noc)}</TableCell>
              <TableCell className="text-right tabular-nums">{auto1(a)}</TableCell>
              <TableCell className="text-right tabular-nums">{otomoto(o)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Lista({ tytul, wiersze }: { tytul: string; wiersze: [string, React.ReactNode][] }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <h3 className="font-medium">{tytul}</h3>
      <dl className="flex flex-col gap-1">
        {wiersze.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const druga = (waluta: Waluta): Waluta => (waluta === "eur" ? "pln" : "eur")
const kolor = (n: number | null) => (n === null ? "" : n >= 0 ? "text-success" : "text-destructive")

// Jedna z trzech głównych liczb na górze okna: duża w wybranej walucie, pod nią mała w drugiej.
function Liczba({ tytul, opis, glowna, mala, className }: { tytul: string; opis?: string; glowna: string; mala?: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border p-2.5 sm:p-3">
      <span className="truncate text-xs text-muted-foreground">{tytul}{opis && <span className="max-sm:hidden"> · {opis}</span>}</span>
      <span className={cn("text-base font-semibold tabular-nums whitespace-nowrap sm:text-xl", className)}>{glowna}</span>
      {mala && <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{mala}</span>}
    </div>
  )
}

function Ceny({ auto, waluta }: { auto: Wiersz; waluta: Waluta }) {
  const d = kwota(auto, "d", waluta) ?? null
  const plus = (n: number | null, w: Waluta) => (n !== null && n > 0 ? "+" : "") + pieniadze(n, w)
  return (
    <div className="grid grid-cols-3 gap-2">
      <Liczba tytul={auto.dania ? "Dostawca" : "Auto1"} opis={auto.dania?.typCeny ?? undefined} glowna={pieniadze(kwota(auto, "a", waluta), waluta)} mala={pieniadze(kwota(auto, "a", druga(waluta)), druga(waluta))} />
      <Liczba tytul="Otomoto" opis={auto.compared ? `średnia z ${auto.compared}` : undefined} glowna={pieniadze(kwota(auto, "o", waluta), waluta)} mala={pieniadze(kwota(auto, "o", druga(waluta)), druga(waluta))} />
      <Liczba tytul="Różnica" glowna={plus(d, waluta)} mala={plus(kwota(auto, "d", druga(waluta)) ?? null, druga(waluta))} className={kolor(d)} />
    </div>
  )
}

// Ile naprawdę kosztuje auto z Auto1 w Polsce: cena (z opłatą aukcyjną) + stałe opłaty Auto1 + transport + akcyza.
// Tylko informacja w oknie: nie zmienia różnicy w tabeli, progu ani kwalifikacji aut. Akcyza liczona od ceny w złotych.
function KosztCalkowity({ auto, s, waluta, kurs }: { auto: Wiersz; s?: Szczegoly; waluta: Waluta; kurs: number }) {
  const [transport, ustawTransport] = React.useState(odczytajTransport)
  // Gdy tytuł nie podaje pojemności, stawkę akcyzy wybiera się tutaj.
  const [ponad2l, ustawPonad2l] = React.useState<boolean | null>(null)
  const oplaty = oplatyAuto1(s)
  const stawka = stawkaAkcyzy(auto, ponad2l)
  const akcyzaEur = stawka === null || auto.a_pln === null ? null : auto.a_pln * stawka / 100 / kurs
  const razemEur = auto.a_eur === null || akcyzaEur === null ? null : auto.a_eur + oplaty.obsluga + oplaty.dokumenty + (transport ?? 0) + akcyzaEur
  const roznicaEur = razemEur === null || auto.o_pln === null ? null : auto.o_pln / kurs - razemEur
  const w = (eur: number | null, wal: Waluta = waluta) => (eur === null ? null : wal === "eur" ? eur : eur * kurs)
  const k = (eur: number | null) => pieniadze(w(eur), waluta)
  const wyborPojemnosci = auto.liters == null && auto.fuel !== "electro" && (
    <ToggleGroup type="single" variant="outline" size="sm" value={ponad2l === null ? "" : ponad2l ? "duzy" : "maly"} onValueChange={(v) => v && ustawPonad2l(v === "duzy")}>
      <ToggleGroupItem value="maly">do 2,0 l</ToggleGroupItem>
      <ToggleGroupItem value="duzy">ponad 2,0 l</ToggleGroupItem>
    </ToggleGroup>
  )
  const wiersz = (nazwa: React.ReactNode, wartosc: React.ReactNode, className?: string) => (
    <div className={cn("flex min-h-7 items-center justify-between gap-3", className)}>
      <dt className="text-muted-foreground">{nazwa}</dt>
      <dd className="text-right tabular-nums whitespace-nowrap">{wartosc}</dd>
    </div>
  )
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <h3 className="text-sm font-medium">Koszt całkowity</h3>
      <dl className="flex flex-col gap-0.5 text-sm">
        {wiersz("Cena Auto1", k(auto.a_eur))}
        {wiersz(`Obsługa Auto1${oplaty.kraj ? ` (${oplaty.kraj})` : ""}`, k(oplaty.obsluga))}
        {wiersz(`Dokumenty (${oplaty.krajowe ? "krajowe" : "zagraniczne"})`, k(oplaty.dokumenty))}
        {wiersz("Transport", (
          <span className="flex items-center gap-1.5">
            <Input type="number" inputMode="numeric" min={0} step={10} placeholder="wpisz" aria-label="Transport w euro" className="h-7 w-24 text-right"
              value={transport ?? ""} onChange={(e) => {
                const n = e.target.value === "" ? null : Math.max(0, Number(e.target.value))
                ustawTransport(n)
                zapiszTransport(n)
              }} />
            €
          </span>
        ))}
        {wiersz(<>Akcyza{stawka !== null && ` ${String(stawka).replace(".", ",")}%`}</>, akcyzaEur === null ? <span className="text-muted-foreground">wybierz pojemność</span> : k(akcyzaEur))}
        {wyborPojemnosci && <div className="flex justify-end">{wyborPojemnosci}</div>}
        {wiersz("Razem koszt", k(razemEur), "mt-1 border-t pt-1.5 font-medium [&_dt]:text-foreground")}
        {wiersz("Otomoto (średnia)", pieniadze(kwota(auto, "o", waluta), waluta))}
        {wiersz("Różnica po kosztach", (
          <span className="flex flex-col items-end">
            <span className={cn("text-base font-semibold", kolor(roznicaEur))}>{k(roznicaEur)}</span>
            {roznicaEur !== null && <span className="text-xs text-muted-foreground">{pieniadze(w(roznicaEur, druga(waluta)), druga(waluta))}</span>}
          </span>
        ), "mt-1 border-t pt-1.5 font-medium [&_dt]:text-foreground")}
      </dl>
      <p className="text-xs text-muted-foreground">
        {!oplaty.pewne && <><strong className="text-foreground">Szacunek, sprawdź w Auto1:</strong> {oplaty.kraj ? `brak stawek dla kraju ${oplaty.kraj}` : "brak kraju auta w danych"}, przyjęto stawki dla Niemiec. </>}
        {transport === null && <><strong className="text-foreground">Bez transportu</strong>: wpisz kwotę, zapamiętamy ją w tej przeglądarce dla wszystkich aut. </>}
        Opłaty Auto1 wg cennika z 08.04.2026, netto, bez VAT, tak jak reszta cen. Opłata aukcyjna jest już w cenie Auto1. Ostateczna kwota jest na potwierdzeniu zakupu w Auto1.
      </p>
    </div>
  )
}

// Dania: gotowy post do ręcznej publikacji (cena dostawcy + marża) i zdjęcia z folderu dostawcy.
// Tekst można poprawić; zostaje w tej przeglądarce jak teksty aut z Auto1.
function PostDania({ auto }: { auto: AutoDania }) {
  const o = doOgloszenia(auto)
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <h3 className="text-sm font-medium">Post</h3>
      <Tabs defaultValue="facebook">
        <TabsList>
          <TabsTrigger value="facebook">Możliwość sprowadzenia</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="facebook"><Tekst id={auto.id} rodzaj="facebook" domyslny={ogloszenie(o, "zamowienie")} /></TabsContent>
        <TabsContent value="whatsapp"><Tekst id={auto.id} rodzaj="whatsapp" domyslny={ogloszenie(o, "whatsapp")} /></TabsContent>
      </Tabs>
      <div className="flex flex-wrap gap-2">
        {/* Zip z Dropboxa (dl=1) pobiera przeglądarka, serwer niczego z Dropboxa nie pobiera. */}
        {auto.dania.zip && <Button asChild size="sm" className="flex-1"><a href={auto.dania.zip} target="_blank" rel="noopener"><DownloadIcon />Pobierz zdjęcia</a></Button>}
      </div>
      <p className="text-xs text-muted-foreground">
        Cena w poście: cena dostawcy + {pieniadze(MARZA, "eur")}.{!auto.dania.folder && " Dostawca nie podał folderu zdjęć."}
      </p>
    </div>
  )
}

export function OknoAuta({ auto, waluta, kurs, zamknij, widziany }: { auto: Wiersz | null; waluta: Waluta; kurs: number; zamknij: () => void; widziany: (id: string) => void }) {
  const [szczegoly, ustaw] = React.useState<Record<string, Szczegoly> | null>(null)
  React.useEffect(() => {
    if (auto && !auto.dania) wczytajSzczegoly().then(ustaw) // Dania nie ma szczegoly.json
  }, [auto])
  const dk = auto?.dania ? (auto as AutoDania) : null
  const s = auto ? szczegoly?.[auto.id] : undefined
  const mobile = auto ? linkMobile(auto) : null
  const sprzet = wyposazenieOkna(s)
  return (
    <Dialog open={auto !== null} onOpenChange={(open) => !open && zamknij()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {auto && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{auto.title || auto.id}</DialogTitle>
              <DialogDescription>{auto.id}{auto.unroadworthy ? " · niezdatne do jazdy" : ""}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {auto.auto1_url && <Button asChild variant="outline" size="sm" className="flex-1"><a href={auto.auto1_url} target="_blank" rel="noopener">Auto1<ExternalLinkIcon /></a></Button>}
              {auto.search_url && <Button asChild variant="outline" size="sm" className="flex-1"><a href={auto.search_url} target="_blank" rel="noopener" onClick={() => widziany(auto.id)}>Otomoto<ExternalLinkIcon /></a></Button>}
              {mobile && <Button asChild variant="outline" size="sm" className="flex-1"><a href={mobile} target="_blank" rel="noopener">mobile.de<ExternalLinkIcon /></a></Button>}
              {s?.report && <Button asChild variant="outline" size="sm" className="flex-1"><a href={s.report} target="_blank" rel="noopener">Raport<ExternalLinkIcon /></a></Button>}
              {!dk && <Button size="sm" className="flex-1" onClick={() => { zamknij(); zrobOgloszenie(auto.id) }}><MegaphoneIcon />Zrób ogłoszenie</Button>}
            </div>
            <Ceny auto={auto} waluta={waluta} />
            {dk ? (
              // Dania: jedno zdjęcie ze strony dostawcy; komplet jest w jego folderze Dropbox.
              <div className="flex flex-col gap-2">
                {zdjeciaAuta(auto).length ? <img src={zdjeciaAuta(auto)[0]} alt={auto.title} className="mx-auto max-h-[38svh] rounded-lg object-contain" />
                  : <p className="text-sm text-muted-foreground">Dostawca nie ma jeszcze zdjęcia tego auta na stronie.</p>}
                {dk.dania.folder && <Button asChild variant="outline" size="sm"><a href={dk.dania.folder} target="_blank" rel="noopener"><FolderOpenIcon />Więcej zdjęć (Dropbox)<ExternalLinkIcon /></a></Button>}
              </div>
            )
              : szczegoly ? <Zdjecia key={`zdjecia-${auto.id}`} auto={auto} zdjecia={zdjeciaAuta(auto, s)} /> : <p className="text-sm text-muted-foreground">Wczytuję zdjęcia…</p>}
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Lista tytul="Auto" wiersze={dk ? [...specyfikacjaAuta(auto), ["Wersja", dk.dania.wersja || "—"], ["Kolor", dk.dania.kolor ?? "—"], ["VIN", dk.dania.vin ?? "—"]]
                : [...specyfikacjaAuta(auto), ...dodatki(s), ["Lokalizacja", lokalizacja(s)]]} />
              {dk ? <Lista tytul="Dostawca" wiersze={[["Dostawca", "Auto Midt (Dania)"],
                ["Typ ceny", dk.dania.typCeny ? `${dk.dania.typCeny}, ${OPIS_TYPU[dk.dania.typCeny] ?? ""}`.replace(/, $/, "") : "—"],
                ...(dk.a_prev_eur != null && dk.a_prev_eur !== dk.a_eur ? [["Poprzednia cena", pieniadze(waluta === "eur" ? dk.a_prev_eur : dk.a_prev_eur * kurs, waluta)] as [string, string]] : []),
                ["Próg różnicy", pieniadze(auto.t === null ? null : waluta === "eur" ? auto.t : auto.t * kurs, waluta)],
                ["Ofert Otomoto", offersLabel(auto)], ...(dk.dania.powod ? [["Bez porównania", dk.dania.powod] as [string, string]] : [])]} />
              : <Lista tytul="Aukcja" wiersze={[["Typ aukcji", auto._label],
                ...(auto.end_ms != null ? [["Koniec aukcji", endLabel(auto)] as [string, string]] : []),
                ...(auto._dealer ? [["Licytuj do", pieniadze(kwota(auto, "bid", waluta), waluta)] as [string, string]] : []),
                ["Próg różnicy", pieniadze(auto.t === null ? null : waluta === "eur" ? auto.t : auto.t * kurs, waluta)],
                ["Ofert Otomoto", offersLabel(auto)]]} />}
            </div>
            {dk && <PostDania key={`post-${auto.id}`} auto={dk} />}
            {!dk && <KosztCalkowity key={`koszt-${auto.id}`} auto={auto} s={s} waluta={waluta} kurs={kurs} />}
            {sprzet.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sprzet.map(([nazwa, rzadkie]) => <Badge key={nazwa} variant={rzadkie ? "secondary" : "outline"}>{nazwa}</Badge>)}
              </div>
            )}
            {s?.prices?.length ? <HistoriaCeny ceny={s.prices} waluta={waluta} kurs={kurs} /> : null}
            {szczegoly && !dk && (
              <Tabs key={`teksty-${auto.id}`} defaultValue="whatsapp">
                <TabsList>
                  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                  <TabsTrigger value="facebook">Facebook</TabsTrigger>
                </TabsList>
                <TabsContent value="whatsapp"><Tekst id={auto.id} rodzaj="whatsapp" domyslny={tekstWhatsApp(auto, s)} /></TabsContent>
                <TabsContent value="facebook"><Tekst id={auto.id} rodzaj="facebook" domyslny={tekstFacebook(auto, s)} /></TabsContent>
              </Tabs>
            )}
            <DialogFooter>
              <DialogClose asChild><Button className="w-full">Zamknij</Button></DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
