import * as React from "react"
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { dodatki, endLabel, kwota, lokalizacja, offersLabel, pieniadze, specyfikacjaAuta, stawkaAkcyzy, tekstFacebook, tekstWhatsApp, wyposazenieOkna, type Waluta, type Wiersz } from "@/lib/auta"
import { wczytajSzczegoly, type Szczegoly } from "@/lib/dane"
import { pobierzPaczke, zdjeciaAuta } from "@/lib/paczka"
import { odczytajOferty, zapiszOferte } from "@/lib/pamiec"
import { cn } from "@/lib/utils"

const dzien = (d: string) => d.slice(8, 10) + "." + d.slice(5, 7)

function Tekst({ id, rodzaj, domyslny }: { id: string; rodzaj: "whatsapp" | "facebook"; domyslny: string }) {
  const [tresc, ustaw] = React.useState(() => odczytajOferty()[id]?.[rodzaj] ?? domyslny)
  const [skopiowano, ustawSkopiowano] = React.useState(false)
  const kopiuj = () => navigator.clipboard.writeText(tresc).then(() => {
    ustawSkopiowano(true)
    setTimeout(() => ustawSkopiowano(false), 1500)
  })
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
              <Checkbox className="absolute top-2 left-6 size-5 bg-background" aria-label={`Wybierz zdjęcie ${i + 1}`} checked={wybrane.includes(url)} onCheckedChange={(v) => zmien(zdjecia.filter((x) => (x === url ? v === true : wybrane.includes(x))))} />
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

// Kwota w wybranej walucie, obok w drugiej.
function Obie({ auto, pole, waluta }: { auto: Wiersz; pole: "a" | "o" | "d" | "bid"; waluta: Waluta }) {
  const druga: Waluta = waluta === "eur" ? "pln" : "eur"
  if (kwota(auto, pole, waluta) == null) return "—"
  return <>{pieniadze(kwota(auto, pole, waluta), waluta)} <span className="text-muted-foreground">· {pieniadze(kwota(auto, pole, druga), druga)}</span></>
}

// Akcyza od ceny Auto1 w złotych, tylko informacyjnie. Gdy tytuł nie podaje pojemności, stawkę wybiera się tutaj.
function Akcyza({ auto }: { auto: Wiersz }) {
  const [ponad2l, ustaw] = React.useState<boolean | null>(null)
  const stawka = stawkaAkcyzy(auto, ponad2l)
  const wybor = auto.liters == null && auto.fuel !== "electro" && (
    <ToggleGroup type="single" variant="outline" size="sm" className="ml-auto" value={ponad2l === null ? "" : ponad2l ? "duzy" : "maly"} onValueChange={(v) => v && ustaw(v === "duzy")}>
      <ToggleGroupItem value="maly">do 2,0 l</ToggleGroupItem>
      <ToggleGroupItem value="duzy">ponad 2,0 l</ToggleGroupItem>
    </ToggleGroup>
  )
  if (stawka === null || auto.a_pln === null) return wybor || "—"
  return (
    <span className="flex flex-col items-end gap-1">
      <span>{pieniadze(auto.a_pln * stawka / 100, "pln")} <span className="text-muted-foreground">· {String(stawka).replace(".", ",")}%</span></span>
      {wybor}
    </span>
  )
}

export function OknoAuta({ auto, waluta, kurs, zamknij, widziany }: { auto: Wiersz | null; waluta: Waluta; kurs: number; zamknij: () => void; widziany: (id: string) => void }) {
  const [szczegoly, ustaw] = React.useState<Record<string, Szczegoly> | null>(null)
  React.useEffect(() => {
    if (auto) wczytajSzczegoly().then(ustaw)
  }, [auto])
  const s = auto ? szczegoly?.[auto.id] : undefined
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
            {szczegoly ? <Zdjecia key={auto.id} auto={auto} zdjecia={zdjeciaAuta(auto, s)} /> : <p className="text-sm text-muted-foreground">Wczytuję zdjęcia…</p>}
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Lista tytul="Auto" wiersze={[...specyfikacjaAuta(auto), ...dodatki(s), ["Lokalizacja", lokalizacja(s)], ["Typ aukcji", auto._label],
                ...(auto.end_ms != null ? [["Koniec aukcji", endLabel(auto)] as [string, string]] : [])]} />
              <Lista tytul="Ceny i koszty" wiersze={[
                ["Auto1", <Obie key="a" auto={auto} pole="a" waluta={waluta} />], ["Otomoto (średnia)", <Obie key="o" auto={auto} pole="o" waluta={waluta} />],
                ["Różnica", <Obie key="d" auto={auto} pole="d" waluta={waluta} />], ["Próg", pieniadze(auto.t === null ? null : waluta === "eur" ? auto.t : auto.t * kurs, waluta)],
                ["Ofert", offersLabel(auto)], ...(auto._dealer ? [["Licytuj do", <Obie key="bid" auto={auto} pole="bid" waluta={waluta} />] as [string, React.ReactNode]] : []),
                ["Akcyza", <Akcyza key={auto.id} auto={auto} />]]} />
            </div>
            {sprzet.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sprzet.map(([nazwa, rzadkie]) => <Badge key={nazwa} variant={rzadkie ? "secondary" : "outline"}>{nazwa}</Badge>)}
              </div>
            )}
            {s?.prices?.length ? <HistoriaCeny ceny={s.prices} waluta={waluta} kurs={kurs} /> : null}
            <div className="flex flex-wrap gap-2">
              {auto.auto1_url && <Button asChild variant="outline" className="flex-1"><a href={auto.auto1_url} target="_blank" rel="noopener">Auto1</a></Button>}
              {auto.search_url && <Button asChild variant="outline" className="flex-1"><a href={auto.search_url} target="_blank" rel="noopener" onClick={() => widziany(auto.id)}>Otomoto</a></Button>}
              {s?.report && <Button asChild variant="outline" className="flex-1"><a href={s.report} target="_blank" rel="noopener">Raport</a></Button>}
            </div>
            {szczegoly && (
              <Tabs key={auto.id} defaultValue="whatsapp">
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
