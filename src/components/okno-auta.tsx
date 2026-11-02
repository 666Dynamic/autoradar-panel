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
import { kwota, offersLabel, pieniadze, specyfikacjaAuta, tekstFacebook, tekstWhatsApp, wyposazenieOkna, type Waluta, type Wiersz } from "@/lib/auta"
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
              <DialogDescription>{auto.id} · {auto._label}{auto.unroadworthy ? " · niezdatne do jazdy" : ""}</DialogDescription>
            </DialogHeader>
            {szczegoly ? <Zdjecia key={auto.id} auto={auto} zdjecia={zdjeciaAuta(auto, s)} /> : <p className="text-sm text-muted-foreground">Wczytuję zdjęcia…</p>}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {[...specyfikacjaAuta(auto),
                ["Auto1", pieniadze(kwota(auto, "a", waluta), waluta)], ["Otomoto", pieniadze(kwota(auto, "o", waluta), waluta)],
                ["Różnica", pieniadze(kwota(auto, "d", waluta), waluta)], ["Ofert", offersLabel(auto)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
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
