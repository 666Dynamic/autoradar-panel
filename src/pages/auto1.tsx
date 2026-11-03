import * as React from "react"
import { flexRender as renderuj, getCoreRowModel, getPaginationRowModel, useReactTable, type ColumnDef, type PaginationState, type RowSelectionState, type VisibilityState } from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ColumnsIcon, DownloadIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { FiltrLista, FiltrZakres } from "@/components/filtry"
import { OknoAuta } from "@/components/okno-auta"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Wybor } from "@/components/wybor"
import { useIsMobile } from "@/hooks/use-mobile"
import { AUCTION_LABELS, endLabel, hpLabel, kmLabel, kwota, litersLabel, noteLabel, offersLabel, pasuje, pieniadze, porownaj, przygotuj, regLabel, szukane, zmianaCeny, type Sort, type Waluta, type Wiersz } from "@/lib/auta"
import type { Dane } from "@/lib/dane"
import { pobierzPaczke } from "@/lib/paczka"
import { odczytaj, zapisz } from "@/lib/pamiec"
import { cn } from "@/lib/utils"

const POCZATEK = { onlyOk: false, small: false, noBroken: false, zmiany: false, dostawcze: [] as string[], pMin: "", pMax: "", yMin: "", yMax: "", kmMin: "", kmMax: "", offersMin: [] as string[], fuel: [] as string[], gear: [] as string[], auction: [] as string[] }
const VIEWS: [string, string][] = [["24h", "Aukcje i zakup"], ["dealer", "Aukcje dealerskie"], ["all", "Wszystkie"]]
const ROZMIARY: [string, string][] = [["100", "100"], ["300", "300"]]
const CENY: Record<Waluta, number[]> = {
  eur: [1000, 2000, 3000, 4000, 5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000, 40000, 50000],
  pln: [5000, 10000, 15000, 20000, 25000, 35000, 50000, 60000, 75000, 100000, 125000, 150000, 200000, 250000],
}
const PRZEBIEGI = Array.from({ length: 12 }, (_, i) => (i + 1) * 25000)
const OFERTY: [string, string][] = [["1", "co najmniej 1"], ["2", "co najmniej 2"], ["3", "co najmniej 3"], ["4", "co najmniej 4"], ["5", "5"]]
const TYPY: [string, string][] = [["bez", "Bez dostawczych"], ["tylko", "Tylko dostawcze"]]
const NAZWY_KOLUMN: Record<string, string> = { reg: "Rocznik", liters: "Poj.", km: "Przebieg", hp: "Moc", fuel: "Paliwo", gear: "Skrzynia", a: "Auto1", o: "Otomoto", d: "Różnica", bid: "Licytuj do", end: "Koniec", offers: "Ofert", link: "Link" }
const DO_LEWEJ = new Set(["wybor", "name"]) // reszta kolumn wyśrodkowana, nagłówek nad wartością
const liczba = (s: string) => (s === "" ? null : Number(s))
const kroki = (lista: number[], etykieta: (n: number) => string) => lista.map((n): [string, string] => [String(n), etykieta(n)])

// Opis kolumny pokazuje się po najechaniu na nagłówek, tak jak próg na różnicy.
function Opis({ tekst, children }: { tekst?: string; children: React.ReactElement }) {
  if (!tekst) return children
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{tekst}</TooltipContent></Tooltip>
}

const OPISY: Record<string, string> = {
  a: "Cena z nocy, na aukcji mogła już wzrosnąć. Strzałka: zmiana od poprzedniej nocy",
  d: "Na zielono: auto spełnia próg",
  offers: "Ile ofert policzono do średniej, z ilu znalezionych",
  link: "Te same wyszukiwanie w Otomoto, z którego jest średnia",
}

// Cena Auto1 i jej zmiana od poprzedniej nocy: taniej na zielono.
function CenaAuto1({ r, waluta, kurs }: { r: Wiersz; waluta: Waluta; kurs: number }) {
  const zmiana = zmianaCeny(r)
  return (
    <>
      {pieniadze(kwota(r, "a", waluta), waluta)}
      {zmiana !== 0 && (
        <span className={cn("block text-xs", zmiana < 0 ? "text-success" : "text-muted-foreground")}>
          {zmiana < 0 ? "↓" : "↑"} {pieniadze(Math.abs(waluta === "eur" ? zmiana : zmiana * kurs), waluta)}
        </span>
      )}
    </>
  )
}

function Niezdatne() {
  return <Tooltip><TooltipTrigger asChild><TriangleAlertIcon role="img" aria-label="Niezdatne do jazdy" className="ml-1 inline size-4 text-destructive" /></TooltipTrigger><TooltipContent>Niezdatne do jazdy</TooltipContent></Tooltip>
}

function Roznica({ r, waluta, kurs }: { r: Wiersz; waluta: Waluta; kurs: number }) {
  if (r.d_eur === null) return <span className="text-xs text-muted-foreground">{noteLabel(r.note)}</span>
  const prog = waluta === "pln" && r.t !== null ? r.t * kurs : r.t
  const kwotaRoznicy = pieniadze(kwota(r, "d", waluta), waluta)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {r.ok ? <Badge className="bg-success/15 text-success">{kwotaRoznicy}</Badge> : <span>{kwotaRoznicy}</span>}
      </TooltipTrigger>
      <TooltipContent>Próg: {pieniadze(prog, waluta)}</TooltipContent>
    </Tooltip>
  )
}

// Podgląd zamyka się przy kliknięciu: otwarte okno auta zasłania wiersz i podgląd nie dostałby zdarzenia wyjścia myszy.
// Otwarte okno auta: podgląd zdjęcia, którego opóźnienie minęło już po kliknięciu, nie wychodzi nad okno.
const OknoOtwarte = React.createContext(false)

function Nazwa({ r, otworz }: { r: Wiersz; otworz: (r: Wiersz) => void }) {
  const [podglad, ustawPodglad] = React.useState(false)
  const okno = React.useContext(OknoOtwarte)
  return (
    <HoverCard open={podglad && !okno} onOpenChange={(v) => ustawPodglad(v && !okno)} openDelay={200} closeDelay={0}>
      <HoverCardTrigger asChild>
        <button className="inline text-left font-medium hover:underline" onClick={() => { ustawPodglad(false); otworz(r) }}>{r.title || r.id}</button>
      </HoverCardTrigger>
      {r.image && <HoverCardContent side="right" className="w-72 p-1"><img src={r.image} alt={r.title} className="rounded-md" /></HoverCardContent>}
    </HoverCard>
  )
}

// Sortowanie idzie przez kontekst: kolumny tworzone raz nie przebudowują tabeli i przycisk nie gubi fokusu.
const Sortowanie = React.createContext<{ sort: Sort; sortuj: (key: string) => void }>({ sort: { key: "rank", dir: -1 }, sortuj: () => {} })

function Naglowek({ klucz, children }: { klucz: string; children: React.ReactNode }) {
  const { sort, sortuj } = React.useContext(Sortowanie)
  const aktywny = sort.key === klucz || (sort.key === "rank" && klucz === "d")
  return (
    <Opis tekst={OPISY[klucz]}>
      <Button variant="ghost" size="sm" className={cn("px-2", klucz === "name" && "-ml-2")} onClick={() => sortuj(klucz)}>
        {children}
        {aktywny && (sort.dir === 1 ? <ArrowUpIcon /> : <ArrowDownIcon />)}
      </Button>
    </Opis>
  )
}

function PasekPaczki({ wybrane, wyczysc }: { wybrane: Wiersz[]; wyczysc: () => void }) {
  const [postep, ustawPostep] = React.useState<string | null>(null)
  const pobierz = async () => {
    ustawPostep("Pakuję…")
    try {
      const { zdjecia, bledy } = await pobierzPaczke(wybrane, (g, razem) => ustawPostep(`Pobieram zdjęcia ${g}/${razem}`))
      if (bledy) toast.error(`Nie udało się pobrać ${bledy} z ${zdjecia} zdjęć.`)
    } catch {
      toast.error("Nie udało się przygotować paczki.")
    } finally {
      ustawPostep(null)
    }
  }
  return (
    <Card className="sticky bottom-4 z-20 py-2 shadow-lg">
      <CardContent className="flex flex-wrap items-center gap-2 text-sm">
        Zaznaczone: {wybrane.length}
        <span className="ml-auto flex gap-2">
          <Button size="sm" disabled={postep !== null} onClick={pobierz}><DownloadIcon />{postep ?? "Pobierz paczkę"}</Button>
          <Button size="sm" variant="outline" onClick={wyczysc}>Wyczyść</Button>
        </span>
      </CardContent>
    </Card>
  )
}

export function Auto1({ dane }: { dane: Dane }) {
  const auta =React.useMemo(() => przygotuj(dane.rows), [dane])
  const wTelefonie = useIsMobile()
  const [widok, ustawWidok] = React.useState("24h")
  const [waluta, ustawWalute] = React.useState<Waluta>("eur")
  const [sort, ustawSort] = React.useState<Sort>({ key: "rank", dir: -1 })
  const [f, ustawF] = React.useState(POCZATEK)
  const [tekst, ustawTekst] = React.useState("")
  const [strona, ustawStrone] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [otwarte, ustawOtwarte] = React.useState<Wiersz | null>(null)
  const [zaznaczone, ustawZaznaczone] = React.useState<RowSelectionState>(() => Object.fromEntries(odczytaj("ar_picked").map((id) => [id, true])))
  const [widziane, ustawWidziane] = React.useState(() => new Set(odczytaj("ar_seen")))
  const [ukryte, ustawUkryte] = React.useState<VisibilityState>({})
  const poczatekListy = React.useRef<HTMLDivElement>(null)

  const pierwsza =() => ustawStrone((s) => ({ ...s, pageIndex: 0 }))
  const pole = <K extends keyof typeof POCZATEK>(k: K, v: (typeof POCZATEK)[K]) => { ustawF((s) => ({ ...s, [k]: v })); pierwsza() }
  const dealerski = widok === "dealer"
  const wWidoku = React.useCallback((r: Wiersz) => widok === "all" || dealerski === r._dealer, [widok, dealerski])
  // Nowe: pierwszy raz w ostatniej nocy. Pierwsza noc historii nie ma z czym porównać, więc tam nic nie jest nowe.
  const nowe = React.useMemo(() => {
    const pierwsza = auta.reduce<string | undefined>((m, r) => (r.since && (!m || r.since < m) ? r.since : m), undefined)
    const ostatnia = dane.nights.find((n) => n.status === "done")?.day // noc bez nowych aut nie zostawia znaczka na wczorajszych
    return (r: Wiersz) => !!ostatnia && ostatnia !== pierwsza && r.since === ostatnia
  }, [auta, dane])
  const zHistoria = React.useMemo(() => auta.some((r) => r.a_prev_eur != null), [auta])
  const odroczonyTekst = React.useDeferredValue(tekst) // przy 300 wierszach pisanie nie czeka na tabelę
  const s = React.useMemo(() => szukane(odroczonyTekst), [odroczonyTekst])

  const lista = React.useMemo(() => {
    const [pMin, pMax, yMin, yMax, kmMin, kmMax, offersMin] = [f.pMin, f.pMax, f.yMin, f.yMax, f.kmMin, f.kmMax, f.offersMin[0] ?? ""].map(liczba)
    return auta.filter((r) => wWidoku(r) && (!f.onlyOk || r.ok)
      && (!f.small || r.liters == null || r.liters <= 2)
      && (pMin === null || (kwota(r, "a", waluta) ?? -1) >= pMin) && (pMax === null || (kwota(r, "a", waluta) ?? Infinity) <= pMax)
      && (yMin === null || (r._year !== null && r._year >= yMin)) && (yMax === null || (r._year !== null && r._year <= yMax))
      && (kmMin === null || (r.km != null && r.km >= kmMin)) && (kmMax === null || (r.km != null && r.km <= kmMax))
      && (offersMin === null || (r.compared ?? 0) >= offersMin)
      && (f.dostawcze[0] !== "bez" || r.body !== "commercial") && (f.dostawcze[0] !== "tylko" || r.body === "commercial") && (!f.noBroken || !r.unroadworthy) && (!f.zmiany || nowe(r) || zmianaCeny(r) !== 0)
      && (!f.fuel.length || f.fuel.includes(r._fuel)) && (!f.gear.length || f.gear.includes(r._gear)) && (!f.auction.length || f.auction.includes(r._label))
      && pasuje(r, s)).sort((a, b) => porownaj(a, b, sort, waluta))
  }, [auta, wWidoku, f, s, sort, waluta, nowe])

  const opcje = (klucz: "_fuel" | "_gear") => [...new Set(auta.map((r) => r[klucz]))].sort((a, b) => a.localeCompare(b, "pl")).map((x): [string, string] => [x, x])
  const typy = React.useMemo(() => {
    const miejsce = (l: string) => (l === "nieznany" ? AUCTION_LABELS.length + 1 : AUCTION_LABELS.includes(l) ? AUCTION_LABELS.indexOf(l) : AUCTION_LABELS.length)
    return [...new Set(auta.filter(wWidoku).map((r) => r._label))].sort((a, b) => miejsce(a) - miejsce(b) || a.localeCompare(b)).map((x): [string, string] => [x, x])
  }, [auta, wWidoku])
  const lata = React.useMemo(() => [...new Set(auta.map((r) => r._year).filter((x) => x !== null))].sort((a, b) => b - a).map((x): [string, string] => [String(x), String(x)]), [auta])
  // Numer auta, które jest tylko w drugim widoku: filtry mogą je ukrywać, więc tu się nie liczą.
  const drugiWidok = dealerski ? "24h" : "dealer"
  const wDrugim = widok !== "all" && s.id.length >= 3 && !auta.some((r) => wWidoku(r) && pasuje(r, s)) && auta.some((r) => !wWidoku(r) && r._id.includes(s.id))

  const zmienWidok = (v: string) => {
    ustawWidok(v)
    ustawF((x) => ({ ...x, auction: [] }))
    if (v !== "dealer" && (sort.key === "bid" || sort.key === "end")) ustawSort({ key: "rank", dir: -1 })
    pierwsza()
  }
  const zmienWalute = (v: string) => {
    if (!v) return
    ustawWalute(v as Waluta)
    ustawF((x) => ({ ...x, pMin: "", pMax: "" })) // progi cen różnią się między walutami
  }
  const sortowanie = React.useMemo(() => ({
    sort,
    sortuj: (key: string) => { ustawSort((x) => ({ key, dir: x.key === key || (x.key === "rank" && key === "d") ? (x.dir === 1 ? -1 : 1) : -1 })); ustawStrone((x) => ({ ...x, pageIndex: 0 })) },
  }), [sort])
  const zmienZaznaczenie = (zmiana: React.SetStateAction<RowSelectionState>) => ustawZaznaczone((x) => {
    const n = typeof zmiana === "function" ? zmiana(x) : zmiana
    zapisz("ar_picked", Object.keys(n))
    return n
  })
  const widziany = (id: string) => ustawWidziane((x) => {
    const n = new Set(x).add(id)
    zapisz("ar_seen", [...n])
    return n
  })
  const wybrane = React.useMemo(() => auta.filter((r) => zaznaczone[r.id]), [auta, zaznaczone])
  const aktywneFiltry = JSON.stringify(f) !== JSON.stringify(POCZATEK) || tekst !== ""
  const zmienStrone = (krok: number) => {
    tabela.setPageIndex((i) => i + krok)
    poczatekListy.current?.querySelector("[data-slot=table-container]")?.scrollTo(0, 0)
    poczatekListy.current?.scrollIntoView({ block: "start" })
  }

  const kolumny = React.useMemo((): ColumnDef<Wiersz>[] => {
    const zwykla = (id: string, wartosc: (r: Wiersz) => React.ReactNode): ColumnDef<Wiersz> => ({ id, header: () => <Naglowek klucz={id}>{NAZWY_KOLUMN[id]}</Naglowek>, cell: ({ row }) => wartosc(row.original) })
    return [
      { id: "wybor", enableHiding: false,
        header: ({ table }) => <Checkbox aria-label="Zaznacz stronę" checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)} />,
        cell: ({ row }) => <Checkbox aria-label={`Zaznacz ${row.id}`} checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(v === true)} /> },
      { id: "name", enableHiding: false, header: () => <Naglowek klucz="name">Auto</Naglowek>,
        cell: ({ row: { original: r } }) => (
          <div className="min-w-44 whitespace-normal">
            <Nazwa r={r} otworz={ustawOtwarte} />{r.unroadworthy && <Niezdatne />}
            <div className="text-xs text-muted-foreground">{r.id} · {r._label}{nowe(r) && <Badge variant="secondary" className="ml-1.5">nowe</Badge>}</div>
          </div>
        ) },
      zwykla("reg", regLabel), zwykla("liters", litersLabel), zwykla("km", kmLabel), zwykla("hp", hpLabel), zwykla("fuel", (r) => r._fuel), zwykla("gear", (r) => r._gear),
      zwykla("a", (r) => <CenaAuto1 r={r} waluta={waluta} kurs={dane.meta.rate_value} />),
      zwykla("o", (r) => pieniadze(kwota(r, "o", waluta), waluta)),
      zwykla("d", (r) => <Roznica r={r} waluta={waluta} kurs={dane.meta.rate_value} />),
      zwykla("bid", (r) => <span className="font-medium">{pieniadze(kwota(r, "bid", waluta), waluta)}</span>), zwykla("end", endLabel),
      zwykla("offers", offersLabel),
      { id: "link", header: () => <Opis tekst={OPISY.link}><span className="px-2">Link</span></Opis>, cell: ({ row: { original: r } }) => (r.search_url ? <a className="underline" href={r.search_url} target="_blank" rel="noopener" onClick={() => widziany(r.id)}>Otomoto</a> : "—") },
    ]
  }, [waluta, dane, nowe])

  const tabela = useReactTable({
    data: lista, columns: kolumny, getRowId: (r) => r.id, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    state: { pagination: strona, rowSelection: zaznaczone, columnVisibility: { ...ukryte, ...(dealerski ? {} : { bid: false, end: false }) } },
    onPaginationChange: ustawStrone, onRowSelectionChange: zmienZaznaczenie, onColumnVisibilityChange: ustawUkryte, autoResetPageIndex: false,
  })
  const wiersze = tabela.getRowModel().rows

  return (
    <>
      <Tabs value={widok} onValueChange={zmienWidok}>
        <TabsList>
          {VIEWS.map(([id, nazwa]) => <TabsTrigger key={id} value={id}>{nazwa}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-9 w-full sm:h-7 sm:w-64" type="search" placeholder="Numer, marka, model" aria-label="Szukaj" value={tekst} onChange={(e) => { ustawTekst(e.target.value); pierwsza() }} />
        <FiltrLista tytul="Typ aukcji" opcje={typy} wybrane={f.auction} zmien={(v) => pole("auction", v)} />
        <FiltrLista tytul="Paliwo" opcje={opcje("_fuel")} wybrane={f.fuel} zmien={(v) => pole("fuel", v)} />
        <FiltrLista tytul="Skrzynia" opcje={opcje("_gear")} wybrane={f.gear} zmien={(v) => pole("gear", v)} />
        <FiltrLista tytul="Typ auta" opcje={TYPY} wybrane={f.dostawcze} zmien={(v) => pole("dostawcze", v)} jeden />
        <FiltrZakres tytul={`Cena Auto1 (${waluta === "eur" ? "€" : "zł"})`} opcje={kroki(CENY[waluta], (n) => pieniadze(n, waluta))} od={f.pMin} do={f.pMax} zmienOd={(v) => pole("pMin", v)} zmienDo={(v) => pole("pMax", v)} />
        <FiltrZakres tytul="Rocznik" opcje={lata} od={f.yMin} do={f.yMax} zmienOd={(v) => pole("yMin", v)} zmienDo={(v) => pole("yMax", v)} />
        <FiltrZakres tytul="Przebieg" opcje={kroki(PRZEBIEGI, (n) => `${n / 1000} tys. km`)} od={f.kmMin} do={f.kmMax} zmienOd={(v) => pole("kmMin", v)} zmienDo={(v) => pole("kmMax", v)} />
        <FiltrLista tytul="Ofert Otomoto" opcje={OFERTY} wybrane={f.offersMin} zmien={(v) => pole("offersMin", v)} jeden />
        <Toggle variant="outline" size="sm" pressed={f.onlyOk} onPressedChange={(v) => pole("onlyOk", v)}>Kwalifikujące się</Toggle>
        <Tooltip>
          <TooltipTrigger asChild><Toggle variant="outline" size="sm" pressed={f.small} onPressedChange={(v) => pole("small", v)}>Do 2 l</Toggle></TooltipTrigger>
          <TooltipContent>Auta bez podanej pojemności zostają na liście</TooltipContent>
        </Tooltip>
        <Toggle variant="outline" size="sm" pressed={f.noBroken} onPressedChange={(v) => pole("noBroken", v)}>Bez niezdatnych</Toggle>
        {zHistoria && <Toggle variant="outline" size="sm" pressed={f.zmiany} onPressedChange={(v) => pole("zmiany", v)}>Nowe i zmiany cen</Toggle>}
        {aktywneFiltry && <Button variant="ghost" size="sm" onClick={() => { ustawF(POCZATEK); ustawTekst(""); pierwsza() }}>Wyczyść filtry<XIcon /></Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Pokazano {lista.length} z {auta.length}</span>
        {wDrugim && <Button size="sm" variant="outline" onClick={() => { ustawF(POCZATEK); zmienWidok(drugiWidok) }}>To auto jest w widoku: {VIEWS.find((v) => v[0] === drugiWidok)?.[1]}</Button>}
        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup type="single" variant="outline" size="sm" value={waluta} onValueChange={zmienWalute}>
            <ToggleGroupItem value="eur">EUR</ToggleGroupItem>
            <ToggleGroupItem value="pln">PLN</ToggleGroupItem>
          </ToggleGroup>
          {!wTelefonie && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><ColumnsIcon />Kolumny</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Pokaż kolumny</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tabela.getAllColumns().filter((k) => k.getCanHide() && (dealerski || !["bid", "end"].includes(k.id))).map((k) => (
                  <DropdownMenuCheckboxItem key={k.id} checked={k.getIsVisible()} onCheckedChange={(v) => k.toggleVisibility(v)}>{NAZWY_KOLUMN[k.id]}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {wTelefonie ? (
        <div ref={poczatekListy} className="flex scroll-mt-16 flex-col gap-3">
          {wiersze.map(({ original: r }) => (
            <Card key={r.id} className={cn(widziane.has(r.id) && "opacity-60", zaznaczone[r.id] && "ring-2 ring-primary")}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox className="mt-1" aria-label={`Zaznacz ${r.id}`} checked={!!zaznaczone[r.id]} onCheckedChange={(v) => tabela.getRow(r.id).toggleSelected(v === true)} />
                  <div><button className="text-left font-medium" onClick={() => ustawOtwarte(r)}>{r.title || r.id}</button>{r.unroadworthy && <Niezdatne />}{nowe(r) && <Badge variant="secondary" className="ml-1.5">nowe</Badge>}</div>
                </div>
                <p className="text-xs text-muted-foreground">{r.id} · {r._label}<br />{[regLabel(r), kmLabel(r), litersLabel(r), hpLabel(r), r._fuel, r._gear].filter((x) => x !== "—").join(" · ")}</p>
                <div className="grid grid-cols-3 gap-y-2 text-sm">
                  <span><span className="block text-xs text-muted-foreground">Auto1</span><CenaAuto1 r={r} waluta={waluta} kurs={dane.meta.rate_value} /></span>
                  <span><span className="block text-xs text-muted-foreground">Otomoto</span>{pieniadze(kwota(r, "o", waluta), waluta)}</span>
                  <span><span className="block text-xs text-muted-foreground">Ofert</span>{offersLabel(r)}</span>
                  {dealerski && <span><span className="block text-xs text-muted-foreground">Licytuj do</span>{pieniadze(kwota(r, "bid", waluta), waluta)}</span>}
                  {dealerski && <span className="col-span-2"><span className="block text-xs text-muted-foreground">Koniec</span>{endLabel(r)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Roznica r={r} waluta={waluta} kurs={dane.meta.rate_value} />
                    {r.d_eur !== null && r.t !== null && <span className="text-xs text-muted-foreground">próg {pieniadze(waluta === "pln" ? r.t * dane.meta.rate_value : r.t, waluta)}</span>}
                  </span>
                  {r.search_url && <a className="text-sm underline" href={r.search_url} target="_blank" rel="noopener" onClick={() => widziany(r.id)}>Otomoto</a>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div ref={poczatekListy} className="scroll-mt-16 rounded-lg border [&>[data-slot=table-container]]:max-h-[calc(100svh-5rem)] [&>[data-slot=table-container]]:overflow-auto">
          <Sortowanie.Provider value={sortowanie}>
            <OknoOtwarte.Provider value={otwarte !== null}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                {tabela.getHeaderGroups().map((g) => (
                  <TableRow key={g.id}>
                    {g.headers.map((h) => <TableHead key={h.id} className={cn("px-1", !DO_LEWEJ.has(h.column.id) && "text-center")}>{h.isPlaceholder ? null : renderuj(h.column.columnDef.header, h.getContext())}</TableHead>)}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {wiersze.map((w) => (
                  <TableRow key={w.id} className={cn(widziane.has(w.id) && "opacity-60", w.original.ok && "bg-success/5")} data-state={w.getIsSelected() ? "selected" : undefined}>
                    {w.getVisibleCells().map((c) => <TableCell key={c.id} className={cn("px-1 tabular-nums", !DO_LEWEJ.has(c.column.id) && "text-center")}>{renderuj(c.column.columnDef.cell, c.getContext())}</TableCell>)}
                  </TableRow>
                ))}
                {lista.length === 0 && <TableRow><TableCell colSpan={tabela.getVisibleLeafColumns().length} className="h-24 text-center text-muted-foreground">Brak aut dla tych filtrów.</TableCell></TableRow>}
              </TableBody>
            </Table>
            </OknoOtwarte.Provider>
          </Sortowanie.Provider>
        </div>
      )}
      {wTelefonie && lista.length === 0 && <p className="text-muted-foreground">Brak aut dla tych filtrów.</p>}

      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        <span className="text-muted-foreground">Na stronie</span>
        <Wybor size="sm" className="w-20" value={strona.pageSize === 50 ? "" : String(strona.pageSize)} opcje={ROZMIARY} puste="50" onChange={(v) => { tabela.setPageSize(Number(v || 50)); pierwsza() }} />
        <span className="text-muted-foreground">Strona {strona.pageIndex + 1} z {tabela.getPageCount() || 1}</span>
        <Button variant="outline" size="icon-sm" aria-label="Poprzednia strona" disabled={!tabela.getCanPreviousPage()} onClick={() => zmienStrone(-1)}><ChevronLeftIcon /></Button>
        <Button variant="outline" size="icon-sm" aria-label="Następna strona" disabled={!tabela.getCanNextPage()} onClick={() => zmienStrone(1)}><ChevronRightIcon /></Button>
      </div>

      {wybrane.length > 0 && <PasekPaczki wybrane={wybrane} wyczysc={() => zmienZaznaczenie({})} />}
      <OknoAuta auto={otwarte} waluta={waluta} kurs={dane.meta.rate_value} zamknij={() => ustawOtwarte(null)} widziany={widziany} />
    </>
  )
}
