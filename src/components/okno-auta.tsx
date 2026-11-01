import * as React from "react"
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { kwota, offersLabel, pieniadze, specyfikacjaAuta, tekstFacebook, tekstWhatsApp, wyposazenie, type Waluta, type Wiersz } from "@/lib/auta"
import { wczytajSzczegoly, type Szczegoly } from "@/lib/dane"
import { pobierzPaczke, zdjeciaAuta } from "@/lib/paczka"
import { odczytajOferty, zapiszOferte } from "@/lib/pamiec"

function Tekst({ id, rodzaj, domyslny }: { id: string; rodzaj: "whatsapp" | "facebook"; domyslny: string }) {
  const [tresc, ustaw] = React.useState(() => odczytajOferty()[id]?.[rodzaj] ?? domyslny)
  const [skopiowano, ustawSkopiowano] = React.useState(false)
  const kopiuj = () => navigator.clipboard.writeText(tresc).then(() => {
    ustawSkopiowano(true)
    setTimeout(() => ustawSkopiowano(false), 1500)
  })
  return (
    <div className="relative">
      <Textarea rows={11} value={tresc} onChange={(e) => { ustaw(e.target.value); zapiszOferte(id, { [rodzaj]: e.target.value }) }} />
      <Button variant="ghost" size="icon-sm" className="absolute top-1.5 right-1.5" aria-label="Kopiuj tekst" onClick={kopiuj}>
        {skopiowano ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  )
}

function Zdjecia({ auto, zdjecia }: { auto: Wiersz; zdjecia: string[] }) {
  const [wybrane, ustawWybrane] = React.useState<string[]>(() => odczytajOferty()[auto.id]?.zdjecia ?? zdjecia)
  const [postep, ustawPostep] = React.useState<string | null>(null)
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
    <div className="flex flex-col gap-2">
      <Carousel className="mx-10">
        <CarouselContent>
          {zdjecia.map((url, i) => (
            <CarouselItem key={url} className="relative">
              <img src={url} alt={`${auto.title}, zdjęcie ${i + 1}`} loading="lazy" className="mx-auto max-h-[45svh] rounded-lg object-contain" />
              <Checkbox className="absolute top-2 left-6 size-5 bg-background" aria-label={`Wybierz zdjęcie ${i + 1}`} checked={wybrane.includes(url)} onCheckedChange={(v) => zmien(zdjecia.filter((x) => (x === url ? v === true : wybrane.includes(x))))} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious type="button" />
        <CarouselNext type="button" />
      </Carousel>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Wybrane {wybrane.length} z {zdjecia.length}</span>
        <Button variant="ghost" size="sm" onClick={() => zmien(zdjecia)}>Wszystkie</Button>
        <Button variant="ghost" size="sm" onClick={() => zmien([])}>Żadne</Button>
        <Button variant="outline" size="sm" className="ml-auto" disabled={postep !== null} onClick={pobierz}><DownloadIcon />{postep ?? "Pobierz paczkę"}</Button>
      </div>
    </div>
  )
}

export function OknoAuta({ auto, waluta, zamknij, widziany }: { auto: Wiersz | null; waluta: Waluta; zamknij: () => void; widziany: (id: string) => void }) {
  const [szczegoly, ustaw] = React.useState<Record<string, Szczegoly> | null>(null)
  React.useEffect(() => {
    if (auto) wczytajSzczegoly().then(ustaw)
  }, [auto])
  const s = auto ? szczegoly?.[auto.id] : undefined
  const sprzet = wyposazenie(s)
  return (
    <Dialog open={auto !== null} onOpenChange={(open) => !open && zamknij()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
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
            {sprzet.length > 0 && <p className="text-sm text-muted-foreground">{sprzet.join(" · ")}</p>}
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
              <DialogClose asChild><Button>Zamknij</Button></DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
