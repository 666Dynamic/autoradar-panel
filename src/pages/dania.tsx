import * as React from "react"
import { CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, EyeOffIcon, MegaphoneIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fmt } from "@/lib/auta"
import { STATUSY, czytajExcel, czytajListe, doOgloszenia, polacz, wczytajDania, type AutoDK, type PlikDania, type Status } from "@/lib/dania"
import { WZORY, ogloszenie } from "@/lib/ogloszenia"
import { odczytaj, zapisz } from "@/lib/pamiec"
import { cn } from "@/lib/utils"

const KLUCZ_LISTY = "ar_dania_lista"
const KLUCZ_EXCELA = "ar_dania_excel"
type Excel = { nazwa: string; auta: AutoDK[]; nieznane: string[]; brak: string[] }
const KLUCZ_USTAWIEN = "ar_dania"
const KLUCZ_POMINIETYCH = "ar_dania_pominiete"
const WZORY_DANII = WZORY.filter(([id]) => id === "zamowienie" || id === "oferta")
const PALIWO: Record<string, string> = { petrol: "benzyna", diesel: "diesel", hybrid: "hybryda", electric: "elektryczny" }
const KOLEJNOSC: Status[] = ["compared", "pending", "no_search", "error", "filtered", "unparsed", "duplicate", "sold"]

function czytaj<T>(klucz: string, domyslne: T): T {
  try {
    return { ...domyslne, ...JSON.parse(localStorage.getItem(klucz) ?? "{}") }
  } catch {
    return domyslne
  }
}
function pisz(klucz: string, wartosc: unknown) {
  try {
    localStorage.setItem(klucz, typeof wartosc === "string" ? wartosc : JSON.stringify(wartosc))
  } catch {
    // bez pamięci strona działa dalej
  }
}
const eur = (n: number | null | undefined) => (n == null ? "—" : `${fmt(n)} €`)
const rejestracja = (a: AutoDK) => (a.reg ? `${a.reg.slice(5, 7)}.${a.reg.slice(0, 4)}` : "—")

function Roznica({ a }: { a: AutoDK }) {
  if (a.d_eur == null) return <span className="text-muted-foreground">—</span>
  return <span className={cn("font-medium", a.ok ? "text-success" : a.d_eur < 0 && "text-destructive")} title={a.t != null ? `próg ${fmt(a.t)} €` : undefined}>{a.d_eur > 0 ? "+" : ""}{fmt(a.d_eur)} €</span>
}

// Nowy tekst przy innym aucie, wzorze, marży lub kontakcie (klucz), poprawki ręczne do tego czasu zostają.
function Tresc({ poczatek, children }: { poczatek: string; children: (tekst: string) => React.ReactNode }) {
  const [tekst, ustawTekst] = React.useState(poczatek)
  return (
    <>
      <Textarea aria-label="Tekst posta" className="min-h-72 text-sm leading-relaxed" value={tekst} onChange={(e) => ustawTekst(e.target.value)} />
      {children(tekst)}
    </>
  )
}

function Post({ auto, marza, kontakt, wzor, ustawWzor, pomin, zamknij }: { auto: AutoDK | null; marza: number; kontakt: string; wzor: string; ustawWzor: (w: string) => void; pomin: (a: AutoDK) => void; zamknij: () => void }) {
  const [skopiowano, ustawSkopiowano] = React.useState(false)
  const kopiuj = (tekst: string) => navigator.clipboard.writeText(tekst).then(() => {
    ustawSkopiowano(true)
    setTimeout(() => ustawSkopiowano(false), 1500)
  }, () => toast.error("Nie udało się skopiować."))
  return (
    <Dialog open={auto !== null} onOpenChange={(o) => !o && zamknij()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {auto && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{auto.title}</DialogTitle>
              <DialogDescription>
                Cena dostawcy {eur(auto.a_eur)} + marża {eur(marza)} = <b>{eur((auto.a_eur ?? 0) + marza)}</b>{auto.vin ? ` · VIN ${auto.vin}` : ""}
              </DialogDescription>
            </DialogHeader>
            <ToggleGroup type="single" variant="outline" className="w-full" value={wzor} onValueChange={(v) => v && ustawWzor(v)}>
              {WZORY_DANII.map(([id, nazwa]) => <ToggleGroupItem key={id} value={id} className="flex-1">{nazwa}</ToggleGroupItem>)}
            </ToggleGroup>
            <Tresc key={[auto.id, wzor, marza, kontakt].join("|")} poczatek={ogloszenie(doOgloszenia(auto, marza, kontakt), wzor)}>{(tekst) => (<>
            <p className="text-xs text-muted-foreground">Tekst możesz poprawić przed skopiowaniem. Atuty (bezwypadkowe, serwis…) dopisz sam — lista ich nie podaje. „Pobierz zdjęcia” pobiera folder z Dropboxa jako plik zip.</p>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => kopiuj(tekst)}>{skopiowano ? <CheckIcon /> : <CopyIcon />}{skopiowano ? "Skopiowano" : "Kopiuj"}</Button>
              {auto.photos_zip
                ? <Button asChild variant="outline" className="flex-1"><a href={auto.photos_zip} target="_blank" rel="noopener noreferrer"><DownloadIcon />Pobierz zdjęcia</a></Button>
                : <Button variant="outline" className="flex-1" disabled><DownloadIcon />Brak linku do zdjęć</Button>}
              <Button variant="ghost" className="flex-1" onClick={() => { pomin(auto); zamknij() }}><EyeOffIcon />Pomiń</Button>
            </DialogFooter>
            </>)}</Tresc>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function Dania() {
  const [tekst, ustawTekst] = React.useState(() => { try { return localStorage.getItem(KLUCZ_LISTY) ?? "" } catch { return "" } })
  const [wklejany, ustawWklejany] = React.useState("")
  const [excel, ustawExcel] = React.useState<Excel | null>(() => { try { return JSON.parse(localStorage.getItem(KLUCZ_EXCELA) ?? "null") } catch { return null } })
  const [u, ustawU] = React.useState(() => czytaj(KLUCZ_USTAWIEN, { marza: "1000", kontakt: "", wzor: "zamowienie", tylkoOk: true, pokazPominiete: false }))
  const [pominiete, ustawPominiete] = React.useState(() => new Set(odczytaj(KLUCZ_POMINIETYCH)))
  const [noc, ustawNoc] = React.useState<PlikDania | null>(null)
  const [otwarte, ustawOtwarte] = React.useState<AutoDK | null>(null)

  React.useEffect(() => { wczytajDania().then(ustawNoc) }, [])
  React.useEffect(() => pisz(KLUCZ_USTAWIEN, u), [u])
  const pole = <K extends keyof typeof u>(k: K, v: (typeof u)[K]) => ustawU((x) => ({ ...x, [k]: v }))
  const marza = Number(u.marza.replace(/\D/g, "")) || 0

  // Plik Excel ze strony dostawcy ma pierwszeństwo przed wklejonym mailem.
  const auta = React.useMemo(() => polacz(excel ? excel.auta : czytajListe(tekst), noc), [excel, tekst, noc])
  const ile = React.useMemo(() => {
    const m = new Map<Status, number>()
    auta.forEach((a) => m.set(a.status, (m.get(a.status) ?? 0) + 1))
    return m
  }, [auta])
  const zPorownaniem = auta.some((a) => a.status === "compared")
  const kwalifikujace = auta.filter((a) => a.ok).length
  const widoczne = auta
    .filter((a) => (!u.tylkoOk || a.ok) && (u.pokazPominiete || !a.vin || !pominiete.has(a.vin)))
    .sort((a, b) => Number(b.ok) - Number(a.ok) || KOLEJNOSC.indexOf(a.status) - KOLEJNOSC.indexOf(b.status) || (b.d_eur ?? -Infinity) - (a.d_eur ?? -Infinity) || a.pos - b.pos)

  const wczytajPlik = async (plik: File | undefined) => {
    if (!plik) return
    try {
      const w = await czytajExcel(plik)
      if (!w.auta.length) return toast.error(`Nie rozpoznałem aut w pliku. Brakujące kolumny: ${w.brak.join(", ")}. Kolumny w pliku: ${w.nieznane.join(", ") || "brak"}.`)
      const e = { nazwa: plik.name, ...w }
      ustawExcel(e)
      pisz(KLUCZ_EXCELA, e)
      toast.success(`Wczytano ${w.auta.length} aut z pliku ${plik.name}.`)
    } catch {
      toast.error("Nie udało się odczytać pliku. Potrzebny jest plik .xlsx z przycisku „Export to Excel”.")
    }
  }
  const wczytaj = () => {
    const nowe = czytajListe(wklejany)
    if (!nowe.length) return toast.error("Nie znalazłem aut. Wklej całą listę z maila (każde auto zaczyna się datą, np. 2018-10-11).")
    ustawTekst(wklejany)
    pisz(KLUCZ_LISTY, wklejany)
    ustawExcel(null)
    pisz(KLUCZ_EXCELA, "null")
    ustawWklejany("")
    toast.success(`Wczytano ${nowe.length} aut z listy.`)
  }
  const pomin = (a: AutoDK) => {
    if (!a.vin) return
    const s = new Set(pominiete).add(a.vin)
    ustawPominiete(s)
    zapisz(KLUCZ_POMINIETYCH, [...s])
  }
  const przywroc = (a: AutoDK) => {
    const s = new Set(pominiete)
    s.delete(a.vin ?? "")
    ustawPominiete(s)
    zapisz(KLUCZ_POMINIETYCH, [...s])
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Lista Auto Midt</CardTitle>
          <CardDescription>
            Wrzuć plik z przycisku „Export to Excel” na automidt.dk albo wklej listę z maila. Brane są wszystkie auta oprócz „Sold”;
            kwalifikuje się auto z różnicą do średniej Otomoto co najmniej 3.500 € (poniżej 10.000 €) albo 4.500 € (od 10.000 €). Porównanie z Otomoto liczy skaner{noc ? ` (ostatni wynik: ${new Date(noc.meta.stamp_iso).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})` : " — wyniku jeszcze nie ma"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="file" accept=".xlsx" aria-label="Plik Excel z automidt.dk" className="max-w-xs" onChange={(e) => { wczytajPlik(e.target.files?.[0]); e.target.value = "" }} />
            {excel && <span className="text-sm text-muted-foreground">Wczytany plik: {excel.nazwa}</span>}
            {excel && <Button variant="ghost" size="sm" onClick={() => { ustawExcel(null); pisz(KLUCZ_EXCELA, "null") }}><RotateCcwIcon />Usuń plik</Button>}
          </div>
          {excel && (excel.nieznane.length > 0 || excel.brak.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {excel.brak.length > 0 && <>Brak kolumn: {excel.brak.join(", ")}. </>}{excel.nieznane.length > 0 && <>Pominięte kolumny: {excel.nieznane.join(", ")}.</>}
            </p>
          )}
          <Textarea rows={4} aria-label="Lista z maila" placeholder={"Year\nType\nBrand\n…\n2018-10-11\nDiesel\nVolvo\nV60\n2.0 188HP Automatic Inscription\n…"} value={wklejany} onChange={(e) => ustawWklejany(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={wczytaj} disabled={!wklejany.trim()}>Wczytaj listę</Button>
            {tekst && !excel && <Button variant="ghost" size="sm" onClick={() => { ustawTekst(""); pisz(KLUCZ_LISTY, "") }}><RotateCcwIcon />Wyczyść listę</Button>}
            <div className="ml-auto flex flex-wrap gap-1.5">
              {KOLEJNOSC.filter((s) => ile.get(s)).map((s) => <Badge key={s} variant={s === "compared" ? "secondary" : "outline"}>{STATUSY[s]}: {ile.get(s)}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <Toggle variant="outline" size="sm" pressed={u.tylkoOk} onPressedChange={(v) => pole("tylkoOk", v)}>Kwalifikujące się{auta.length ? ` (${kwalifikujace})` : ""}</Toggle>
        <Toggle variant="outline" size="sm" pressed={u.pokazPominiete} onPressedChange={(v) => pole("pokazPominiete", v)}>Pokaż pominięte{pominiete.size ? ` (${pominiete.size})` : ""}</Toggle>
        <div className="flex flex-col gap-1">
          <Label htmlFor="marza" className="text-xs">Marża (€)</Label>
          <Input id="marza" inputMode="numeric" className="h-8 w-24" value={u.marza} onChange={(e) => pole("marza", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="kontakt" className="text-xs">Kontakt w poście</Label>
          <Input id="kontakt" className="h-8 w-40" placeholder="telefon" value={u.kontakt} onChange={(e) => pole("kontakt", e.target.value)} />
        </div>
      </div>

      {u.tylkoOk && auta.length > 0 && kwalifikujace === 0 && (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
          {zPorownaniem ? "Żadne porównane auto nie spełnia progu (3.500 € poniżej 10.000 €, 4.500 € od 10.000 €)." : "Na tej liście nie ma jeszcze porównania z Otomoto, więc nic nie jest kwalifikujące."}{" "}
          <button className="underline" onClick={() => pole("tylkoOk", false)}>Pokaż wszystkie {auta.length} aut z powodami</button>
        </p>
      )}

      {widoczne.length > 0 && (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2">Auto</TableHead>
                  <TableHead className="text-center">Rocznik</TableHead>
                  <TableHead className="text-center">Przebieg</TableHead>
                  <TableHead className="text-center">Moc</TableHead>
                  <TableHead className="text-center">Paliwo</TableHead>
                  <TableHead className="text-center">Dostawca</TableHead>
                  <TableHead className="text-center">Z marżą</TableHead>
                  <TableHead className="text-center">Otomoto</TableHead>
                  <TableHead className="text-center">Różnica</TableHead>
                  <TableHead className="px-2">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {widoczne.map((a) => {
                  const pominiety = !!a.vin && pominiete.has(a.vin)
                  return (
                    <TableRow key={a.id} className={cn(a.ok && "bg-success/5", (pominiety || a.status === "sold") && "opacity-60")}>
                      <TableCell className="max-w-72 px-2">
                        <div className="line-clamp-2 font-medium whitespace-normal">{a.nowe && <Badge variant="secondary" className="mr-1">nowe</Badge>}{a.title || "—"}</div>
                        <div className="text-xs text-muted-foreground">{[a.vin, a.color, a.body_text].filter(Boolean).join(" · ")}</div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{rejestracja(a)}</TableCell>
                      <TableCell className="text-center tabular-nums">{a.km != null ? `${fmt(a.km)} km` : "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">{a.hp != null ? `${a.hp} KM` : "—"}</TableCell>
                      <TableCell className="text-center">{/phev|plug/i.test(a.type) ? "plug-in" : (a.fuel && PALIWO[a.fuel]) || a.type || "—"}{a.gear ? ` · ${a.gear === "automatic" ? "automat" : "manualna"}` : ""}</TableCell>
                      <TableCell className="text-center tabular-nums">{eur(a.a_eur)}</TableCell>
                      <TableCell className="text-center font-medium tabular-nums">{a.a_eur != null ? eur(a.a_eur + marza) : "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        {a.search_url ? <a className="underline-offset-2 hover:underline" href={a.search_url} target="_blank" rel="noopener">{eur(a.o_eur)}</a> : eur(a.o_eur)}
                        {a.total != null && <div className="text-xs text-muted-foreground">{a.compared} z {a.total} ofert</div>}
                      </TableCell>
                      <TableCell className="text-center tabular-nums"><Roznica a={a} /></TableCell>
                      <TableCell className="max-w-56 px-2 text-xs whitespace-normal">
                        <Badge variant={a.ok ? "default" : "outline"}>{a.ok ? "kwalifikuje się" : STATUSY[a.status]}</Badge>
                        {a.reason && !a.ok && <div className="mt-1 text-muted-foreground">{a.reason}</div>}
                      </TableCell>
                      <TableCell className="px-2 text-right">
                        <div className="flex justify-end gap-1">
                          {a.a_eur != null && <Button size="sm" variant={a.ok ? "default" : "outline"} onClick={() => ustawOtwarte(a)}><MegaphoneIcon />Post</Button>}
                          {a.photos_zip && <Button asChild size="icon-sm" variant="ghost" aria-label="Pobierz zdjęcia"><a href={a.photos_zip} target="_blank" rel="noopener noreferrer"><DownloadIcon /></a></Button>}
                          {pominiety && <Button size="sm" variant="ghost" onClick={() => przywroc(a)}>Przywróć</Button>}
                          {a.photos_link && !a.photos_zip && <Button asChild size="icon-sm" variant="ghost" aria-label="Zdjęcia"><a href={a.photos_link} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon /></a></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {!auta.length && <p className="text-sm text-muted-foreground">Wrzuć plik Excel albo wklej listę z maila Auto Midt, żeby zobaczyć auta.</p>}

      <Post auto={otwarte} marza={marza} kontakt={u.kontakt} wzor={u.wzor} ustawWzor={(w) => pole("wzor", w)} pomin={pomin} zamknij={() => ustawOtwarte(null)} />
    </div>
  )
}
