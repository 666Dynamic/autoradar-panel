import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { OknoAuta } from "@/components/okno-auta"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wybor } from "@/components/wybor"
import { useIsMobile } from "@/hooks/use-mobile"
import { AUCTION_LABELS, endLabel, fmt, FUEL, GEAR, hpLabel, kmLabel, kwota, litersLabel, noteLabel, offersLabel, pasuje, porownaj, przygotuj, regLabel, szukane, type Sort, type Waluta, type Wiersz } from "@/lib/auta"
import type { Dane } from "@/lib/dane"
import { pobierzExcel } from "@/lib/eksport"
import { odczytaj, zapisz } from "@/lib/pamiec"

const PAGE_SIZE = 300
const POCZATEK = { onlyOk: false, small: false, noVans: false, noBroken: false, pMin: "", pMax: "", yMin: "", yMax: "", kmMin: "", kmMax: "", offersMin: "", fuel: "", gear: "", auction: "" }
const SORTS: [string, 1 | -1, string, boolean?][] = [
  ["rank", -1, "Najlepsza różnica"], ["a", 1, "Cena Auto1 rosnąco"], ["reg", -1, "Najnowszy rocznik"], ["km", 1, "Najmniejszy przebieg"],
  ["hp", -1, "Największa moc"], ["liters", 1, "Najmniejsza pojemność"], ["bid", -1, "Najwyższe „Licytuj do”", true], ["end", 1, "Najbliższy koniec aukcji", true],
]
const VIEWS: [string, string][] = [["24h", "Aukcje 24h"], ["dealer", "Aukcje dealerskie"], ["all", "Wszystkie"]]
const liczba = (s: string) => (s === "" ? null : Number(s))

function Pole({ etykieta, children }: { etykieta: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><Label className="text-xs text-muted-foreground">{etykieta}</Label>{children}</div>
}

function Zakres({ etykieta, od, do: doo, ustawOd, ustawDo }: { etykieta: string; od: string; do: string; ustawOd: (v: string) => void; ustawDo: (v: string) => void }) {
  return (
    <Pole etykieta={etykieta}>
      <div className="flex gap-1">
        <Input type="number" inputMode="numeric" placeholder="od" value={od} onChange={(e) => ustawOd(e.target.value)} />
        <Input type="number" inputMode="numeric" placeholder="do" value={doo} onChange={(e) => ustawDo(e.target.value)} />
      </div>
    </Pole>
  )
}

function Roznica({ r, waluta, kurs }: { r: Wiersz; waluta: Waluta; kurs: number }) {
  if (r.d_eur === null) return <span className="text-xs text-muted-foreground">{noteLabel(r.note)}</span>
  const prog = waluta === "pln" && r.t !== null ? r.t * kurs : r.t
  return <><Badge variant={r.ok ? "default" : "outline"}>{fmt(kwota(r, "d", waluta))}</Badge> <span className="text-xs text-muted-foreground">/ {fmt(prog)}</span></>
}

export function Auto1({ dane }: { dane: Dane }) {
  const auta = React.useMemo(() => przygotuj(dane.rows), [dane])
  const wTelefonie = useIsMobile()
  const [widok, ustawWidok] = React.useState("24h")
  const [waluta, ustawWalute] = React.useState<Waluta>("eur")
  const [sort, ustawSort] = React.useState<Sort>({ key: "rank", dir: -1 })
  const [f, ustawF] = React.useState(POCZATEK)
  const [tekst, ustawTekst] = React.useState("")
  const [ile, ustawIle] = React.useState(PAGE_SIZE)
  const [otwarte, ustawOtwarte] = React.useState<Wiersz | null>(null)
  const [zaznaczone, ustawZaznaczone] = React.useState(() => new Set(odczytaj("ar_picked")))
  const [widziane, ustawWidziane] = React.useState(() => new Set(odczytaj("ar_seen")))

  const pole = <K extends keyof typeof POCZATEK>(k: K, v: (typeof POCZATEK)[K]) => { ustawF((s) => ({ ...s, [k]: v })); ustawIle(PAGE_SIZE) }
  const dealerski = widok === "dealer"
  const wWidoku = React.useCallback((r: Wiersz) => widok === "all" || dealerski === r._dealer, [widok, dealerski])
  const s = React.useMemo(() => szukane(tekst), [tekst])

  const lista = React.useMemo(() => {
    const [pMin, pMax, yMin, yMax, kmMin, kmMax, offersMin] = [f.pMin, f.pMax, f.yMin, f.yMax, f.kmMin, f.kmMax, f.offersMin].map(liczba)
    return auta.filter((r) => wWidoku(r) && (!f.onlyOk || r.ok)
      && (!f.small || r.liters == null || r.liters <= 2)
      && (pMin === null || (r.a_eur ?? -1) >= pMin) && (pMax === null || (r.a_eur ?? Infinity) <= pMax)
      && (yMin === null || (r._year !== null && r._year >= yMin)) && (yMax === null || (r._year !== null && r._year <= yMax))
      && (kmMin === null || (r.km != null && r.km >= kmMin)) && (kmMax === null || (r.km != null && r.km <= kmMax))
      && (offersMin === null || (r.compared ?? 0) >= offersMin)
      && (!f.noVans || r.body !== "commercial") && (!f.noBroken || !r.unroadworthy)
      && (!f.fuel || r._fuel === f.fuel) && (!f.gear || r._gear === f.gear) && (!f.auction || r._label === f.auction)
      && pasuje(r, s)).sort((a, b) => porownaj(a, b, sort, waluta))
  }, [auta, wWidoku, f, s, sort, waluta])

  const opcje = (klucz: "_fuel" | "_gear") => [...new Set(auta.map((r) => r[klucz]))].sort((a, b) => a.localeCompare(b, "pl")).map((x): [string, string] => [x, x])
  const typy = React.useMemo(() => {
    const miejsce = (l: string) => (l === "nieznany" ? AUCTION_LABELS.length + 1 : AUCTION_LABELS.includes(l) ? AUCTION_LABELS.indexOf(l) : AUCTION_LABELS.length)
    return [...new Set(auta.filter(wWidoku).map((r) => r._label))].sort((a, b) => miejsce(a) - miejsce(b) || a.localeCompare(b)).map((x): [string, string] => [x, x])
  }, [auta, wWidoku])
  // Numer auta, które jest tylko w drugim widoku: filtry mogą je ukrywać, więc tu się nie liczą.
  const drugiWidok = dealerski ? "24h" : "dealer"
  const wDrugim = widok !== "all" && s.id.length >= 3 && !auta.some((r) => wWidoku(r) && pasuje(r, s)) && auta.some((r) => !wWidoku(r) && r._id.includes(s.id))

  const zmienWidok = (v: string) => {
    ustawWidok(v)
    ustawF((x) => ({ ...x, auction: "" }))
    if (v !== "dealer" && (sort.key === "bid" || sort.key === "end")) ustawSort({ key: "rank", dir: -1 })
    ustawIle(PAGE_SIZE)
  }
  const sortuj = (key: string) => ustawSort((x) => ({ key, dir: x.key === key || (x.key === "rank" && key === "d") ? (x.dir === 1 ? -1 : 1) : -1 }))
  const zaznacz = (id: string, tak: boolean) => ustawZaznaczone((x) => {
    const n = new Set(x)
    if (tak) n.add(id); else n.delete(id)
    zapisz("ar_picked", [...n])
    return n
  })
  const wyczysc = () => { ustawZaznaczone(new Set()); zapisz("ar_picked", []) }
  const widziany = (id: string) => ustawWidziane((x) => {
    const n = new Set(x).add(id)
    zapisz("ar_seen", [...n])
    return n
  })
  const wybrane = auta.filter((r) => zaznaczone.has(r.id))
  const widoczne = lista.slice(0, ile)

  const Naglowek = ({ klucz, children, prawo }: { klucz: string; children: React.ReactNode; prawo?: boolean }) => {
    const aktywny = sort.key === klucz || (sort.key === "rank" && klucz === "d")
    return (
      <TableHead className={prawo ? "text-right" : undefined}>
        <button className="inline-flex items-center gap-1 font-medium" onClick={() => sortuj(klucz)}>
          {children}
          {aktywny && (sort.dir === 1 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
        </button>
      </TableHead>
    )
  }

  return (
    <>
      <Tabs value={widok} onValueChange={zmienWidok}>
        <TabsList>
          {VIEWS.map(([id, nazwa]) => <TabsTrigger key={id} value={id}>{nazwa}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <div className="col-span-2 md:col-span-2"><Pole etykieta="Szukaj"><Input type="search" placeholder="Numer, marka, model" value={tekst} onChange={(e) => { ustawTekst(e.target.value); ustawIle(PAGE_SIZE) }} /></Pole></div>
        <Pole etykieta="Sortuj">
          <Wybor value={`${sort.key}:${sort.dir}`} puste="Inne (kolumna)" onChange={(v) => { if (v) { const [key, dir] = v.split(":"); ustawSort({ key, dir: Number(dir) as 1 | -1 }) } }}
            opcje={SORTS.filter((x) => !x[3] || dealerski).map((x): [string, string] => [`${x[0]}:${x[1]}`, x[2]])} />
        </Pole>
        <Pole etykieta="Typ aukcji"><Wybor value={f.auction} onChange={(v) => pole("auction", v)} opcje={typy} /></Pole>
        <Pole etykieta="Paliwo"><Wybor value={f.fuel} onChange={(v) => pole("fuel", v)} opcje={opcje("_fuel")} /></Pole>
        <Pole etykieta="Skrzynia"><Wybor value={f.gear} onChange={(v) => pole("gear", v)} opcje={opcje("_gear")} /></Pole>
        <Zakres etykieta="Cena Auto1 (EUR)" od={f.pMin} do={f.pMax} ustawOd={(v) => pole("pMin", v)} ustawDo={(v) => pole("pMax", v)} />
        <Zakres etykieta="Rocznik" od={f.yMin} do={f.yMax} ustawOd={(v) => pole("yMin", v)} ustawDo={(v) => pole("yMax", v)} />
        <Zakres etykieta="Przebieg (km)" od={f.kmMin} do={f.kmMax} ustawOd={(v) => pole("kmMin", v)} ustawDo={(v) => pole("kmMax", v)} />
        <Pole etykieta="Ofert Otomoto co najmniej"><Input type="number" inputMode="numeric" min={1} max={5} value={f.offersMin} onChange={(e) => pole("offersMin", e.target.value)} /></Pole>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {([["onlyOk", "tylko kwalifikujące się"], ["small", "tylko do 2 l"], ["noVans", "bez dostawczych"], ["noBroken", "bez niezdatnych do jazdy"]] as const).map(([k, nazwa]) => (
          <Label key={k} className="font-normal"><Checkbox checked={f[k]} onCheckedChange={(v) => pole(k, v === true)} />{nazwa}</Label>
        ))}
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant={waluta === "eur" ? "default" : "outline"} onClick={() => ustawWalute("eur")}>EUR</Button>
          <Button size="sm" variant={waluta === "pln" ? "default" : "outline"} onClick={() => ustawWalute("pln")}>PLN</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Pokazano {lista.length} z {auta.length}</span>
        {wDrugim && <Button size="sm" variant="outline" onClick={() => { ustawF(POCZATEK); zmienWidok(drugiWidok) }}>To auto jest w widoku: {VIEWS.find((v) => v[0] === drugiWidok)?.[1]}</Button>}
        {wybrane.length > 0 && (
          <span className="ml-auto flex items-center gap-2">
            Zaznaczone: {wybrane.length}
            <Button size="sm" onClick={() => pobierzExcel(wybrane)}>Pobierz Excel</Button>
            <Button size="sm" variant="outline" onClick={wyczysc}>Wyczyść</Button>
          </span>
        )}
      </div>

      {wTelefonie ? (
        <div className="flex flex-col gap-3">
          {widoczne.map((r) => (
            <Card key={r.id} className={widziane.has(r.id) ? "opacity-60" : undefined}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox className="mt-1" aria-label={`Zaznacz ${r.id}`} checked={zaznaczone.has(r.id)} onCheckedChange={(v) => zaznacz(r.id, v === true)} />
                  <button className="text-left font-medium" onClick={() => ustawOtwarte(r)}>{r.title || r.id}</button>
                </div>
                <p className="text-xs text-muted-foreground">{[regLabel(r), kmLabel(r), litersLabel(r), hpLabel(r), r._fuel, r._gear].join(" · ")}</p>
                <div className="grid grid-cols-3 text-sm">
                  <span><span className="block text-xs text-muted-foreground">Auto1</span>{fmt(kwota(r, "a", waluta))}</span>
                  <span><span className="block text-xs text-muted-foreground">Otomoto</span>{fmt(kwota(r, "o", waluta))}</span>
                  <span><span className="block text-xs text-muted-foreground">Ofert</span>{offersLabel(r)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span><Roznica r={r} waluta={waluta} kurs={dane.meta.rate_value} /></span>
                  {r.search_url && <a className="text-sm underline" href={r.search_url} target="_blank" rel="noopener" onClick={() => widziany(r.id)}>Otomoto</a>}
                </div>
                {r.unroadworthy && <Badge variant="destructive">niezdatne do jazdy</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <Naglowek klucz="name">Auto</Naglowek>
                <Naglowek klucz="reg">Rocznik</Naglowek>
                <Naglowek klucz="liters" prawo>Pojemność</Naglowek>
                <Naglowek klucz="km" prawo>Przebieg</Naglowek>
                <Naglowek klucz="hp" prawo>Moc</Naglowek>
                <Naglowek klucz="fuel">Paliwo</Naglowek>
                <Naglowek klucz="gear">Skrzynia</Naglowek>
                <Naglowek klucz="a" prawo>Auto1</Naglowek>
                <Naglowek klucz="o" prawo>Otomoto</Naglowek>
                <Naglowek klucz="d" prawo>Różnica</Naglowek>
                {dealerski && <Naglowek klucz="bid" prawo>Licytuj do</Naglowek>}
                {dealerski && <Naglowek klucz="end" prawo>Koniec aukcji</Naglowek>}
                <Naglowek klucz="offers" prawo>Ofert</Naglowek>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {widoczne.map((r) => (
                <TableRow key={r.id} className={widziane.has(r.id) ? "opacity-60" : undefined} data-state={zaznaczone.has(r.id) ? "selected" : undefined}>
                  <TableCell><Checkbox aria-label={`Zaznacz ${r.id}`} checked={zaznaczone.has(r.id)} onCheckedChange={(v) => zaznacz(r.id, v === true)} /></TableCell>
                  <TableCell className="max-w-72 whitespace-normal">
                    <HoverCard openDelay={200} closeDelay={0}>
                      <HoverCardTrigger asChild>
                        <button className="text-left font-medium hover:underline" onClick={() => ustawOtwarte(r)}>{r.title || r.id}</button>
                      </HoverCardTrigger>
                      {r.image && <HoverCardContent side="right" className="w-72 p-1"><img src={r.image} alt={r.title} className="rounded-md" /></HoverCardContent>}
                    </HoverCard>
                    {r.unroadworthy && <Badge variant="destructive" className="ml-1">niezdatne</Badge>}
                    <div className="text-xs text-muted-foreground">{r.id} · {r._label}</div>
                  </TableCell>
                  <TableCell>{regLabel(r)}</TableCell>
                  <TableCell className="text-right tabular-nums">{litersLabel(r)}</TableCell>
                  <TableCell className="text-right tabular-nums">{kmLabel(r)}</TableCell>
                  <TableCell className="text-right tabular-nums">{hpLabel(r)}</TableCell>
                  <TableCell>{(r.fuel && FUEL[r.fuel]) || r.fuel || "—"}</TableCell>
                  <TableCell>{(r.gear && GEAR[r.gear]) || r.gear || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(kwota(r, "a", waluta))}{r._dealer && <div className="text-xs text-muted-foreground">cena z nocy</div>}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(kwota(r, "o", waluta))}</TableCell>
                  <TableCell className="max-w-44 text-right whitespace-normal tabular-nums"><Roznica r={r} waluta={waluta} kurs={dane.meta.rate_value} /></TableCell>
                  {dealerski && <TableCell className="text-right font-medium tabular-nums">{fmt(kwota(r, "bid", waluta))}</TableCell>}
                  {dealerski && <TableCell className="text-right tabular-nums">{endLabel(r)}</TableCell>}
                  <TableCell className="text-right tabular-nums">{offersLabel(r)}</TableCell>
                  <TableCell>{r.search_url ? <a className="underline" href={r.search_url} target="_blank" rel="noopener" onClick={() => widziany(r.id)}>Otomoto</a> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {lista.length === 0 && <p className="text-muted-foreground">Brak aut dla tych filtrów.</p>}
      {ile < lista.length && <Button variant="outline" onClick={() => ustawIle(ile + PAGE_SIZE)}>Pokaż kolejne {Math.min(PAGE_SIZE, lista.length - ile)} (na liście {ile} z {lista.length})</Button>}
      <OknoAuta auto={otwarte} waluta={waluta} zamknij={() => ustawOtwarte(null)} />
    </>
  )
}
