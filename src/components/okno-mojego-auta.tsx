// Okno „Dodaj auto” / auto z Moich aut: 3 kroki (Dane, Stan, Zdjęcia) według makiety zatwierdzonej przez właściciela 10.11.2026.
// To samo okno służy do dodawania i do poprawiania auta. „Zapisz” jest na każdym kroku i zamyka okno.
import * as React from "react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, ImageIcon, SquareIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { OknoAuta } from "@/components/okno-auta"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Wybor } from "@/components/wybor"
import { przygotuj, type Wiersz } from "@/lib/auta"
import type { Dane } from "@/lib/dane"
import { linkOtomoto, MARKI, PALIWA, SKRZYNIE, ZRODLA } from "@/lib/marki"
import {
  czyPdf, dodajAuto, kwotaLiczba, kwotaNaTekst, kwotaTekst, naPolska, pamietanaWaluta, poKolei, przesun, RODZAJE, STATUSY,
  usunAuto, usunZdjecie, zAuta1, zapamietajWalute, zmienAuto, zmienZdjecie, zPolskiej,
  type MojeAuto, type NoweAuto, type Rodzaj, type Status, type Szkoda, type Wal, type Zdjecie,
} from "@/lib/moje-auta"
import { cn } from "@/lib/utils"
import { czystyVin, rozpoznajVin } from "@/lib/vin"

export type Wgrywanie = { autoId: string; rodzaj: Rodzaj; gotowe: number; razem: number; bledy: number }

const KLUCZ_WALUTY = "ar_moje_waluta_auta" // ostatnio wybrana waluta nowego auta
const MIESIACE = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"]
const ROK = new Date().getFullYear()
const LATA = Array.from({ length: ROK - 1989 }, (_, i) => String(ROK - i))
const KROKI = [["Dane", "auto i ceny"], ["Stan", "szkody, lakier, notatki"], ["Zdjęcia", "wrzuć i ułóż"]] as const
const ile = (n: number) => (n === 1 ? "zdjęcie" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "zdjęcia" : "zdjęć")
// Kwota z groszami, gdy są: „7.900,50 €”.
const kw = (n: number | null, w: Wal) =>
  n === null ? "—" : `${n.toLocaleString("de-DE", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} ${w === "EUR" ? "€" : "zł"}`

// ---------- Formularz ----------

type Formularz = {
  status: Status; zrodlo: MojeAuto["zrodlo"]; zrodlo_id: string; vin: string; marka: string; model: string; rok: string
  rej_miesiac: string; rej_rok: string; paliwo: string; skrzynia: string; moc: string; przebieg: string; wlasciciele: string
  zakup_data: string | null; przyjazd_data: string | null; waluta: Wal; zakup: number | null; transport: number | null
  docelowa: number | null; sprzedaz: number | null; sprzedaz_data: string | null; ogloszenie: string
  szkody: Szkoda[]; lakier: string; notatka: string
}
const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v))
const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\D/g, "")) || null)

function zAuta(a: MojeAuto | null): Formularz {
  return {
    status: a?.status ?? "kupione", zrodlo: a?.zrodlo ?? "auto1", zrodlo_id: s(a?.zrodlo_id), vin: s(a?.vin), marka: s(a?.marka), model: s(a?.model),
    rok: s(a?.rok), rej_miesiac: s(a?.rej_miesiac), rej_rok: s(a?.rej_rok), paliwo: s(a?.paliwo), skrzynia: s(a?.skrzynia), moc: s(a?.moc_km),
    przebieg: s(a?.przebieg_km), wlasciciele: s(a?.wlasciciele), zakup_data: a?.zakup_data ?? null, przyjazd_data: a?.przyjazd_data ?? null,
    waluta: a?.zakup_waluta ?? pamietanaWaluta(KLUCZ_WALUTY, "EUR"), zakup: a?.zakup_kwota ?? null, transport: a?.transport_kwota ?? null,
    docelowa: a?.wystawienie_kwota ?? null, sprzedaz: a?.sprzedaz_kwota ?? null, sprzedaz_data: a?.sprzedaz_data ?? null, ogloszenie: s(a?.ogloszenie),
    szkody: a?.szkody ?? [], lakier: a?.lakier ?? "", notatka: a?.notatka ?? "",
  }
}

function doBazy(f: Formularz, stara: MojeAuto | null): NoweAuto {
  const nazwa = [f.marka, f.model].filter(Boolean).join(" ").trim() || stara?.nazwa || "Auto bez nazwy"
  return {
    nazwa, status: f.status, zrodlo: f.zrodlo, zrodlo_id: f.zrodlo === "auto1" ? f.zrodlo_id.trim().toUpperCase() || null : stara?.zrodlo_id ?? null,
    vin: f.vin || null, marka: f.marka.trim() || null, model: f.model.trim() || null, rok: n(f.rok), rej_miesiac: n(f.rej_miesiac), rej_rok: n(f.rej_rok),
    paliwo: f.paliwo || null, skrzynia: f.skrzynia || null, moc_km: n(f.moc), przebieg_km: n(f.przebieg), wlasciciele: f.wlasciciele || null,
    zakup_data: f.zakup_data, przyjazd_data: f.przyjazd_data, zakup_waluta: f.waluta, sprzedaz_waluta: f.waluta, zakup_kwota: f.zakup,
    transport_kwota: f.transport, wystawienie_kwota: f.docelowa, sprzedaz_kwota: f.status === "sprzedane" ? f.sprzedaz : null,
    sprzedaz_data: f.status === "sprzedane" ? f.sprzedaz_data : null, ogloszenie: f.ogloszenie.trim() || null,
    szkody: f.szkody, lakier: f.lakier, notatka: f.notatka,
  }
}

// ---------- Pola ----------

function Pole({ id, etykieta, children, className }: { id?: string; etykieta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{etykieta}</Label>
      {children}
    </div>
  )
}

function ZJednostka({ jednostka, children }: { jednostka: string; children: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
      {children}
      <span className="pr-3 text-sm text-muted-foreground">{jednostka}</span>
    </div>
  )
}
const wJednostce = "h-full border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"

// Kwota z groszami; kropki tysięcy pojawiają się same.
function PoleKwoty({ id, wartosc, ustaw, waluta }: { id: string; wartosc: number | null; ustaw: (v: number | null) => void; waluta: Wal }) {
  const [t, ustawT] = React.useState(() => kwotaNaTekst(wartosc))
  const [poprzednia, ustawPoprzednia] = React.useState(wartosc)
  if (wartosc !== poprzednia) { // kwota zmieniona z zewnątrz (np. z nocnego skanu)
    ustawPoprzednia(wartosc)
    if (kwotaLiczba(t) !== wartosc) ustawT(kwotaNaTekst(wartosc))
  }
  return (
    <ZJednostka jednostka={waluta === "EUR" ? "€" : "zł"}>
      <Input id={id} inputMode="decimal" autoComplete="off" className={wJednostce} value={t}
        onChange={(e) => { const x = kwotaTekst(e.target.value); ustawT(x); ustaw(kwotaLiczba(x)) }} />
    </ZJednostka>
  )
}

// Liczba całkowita (przebieg, moc) z kropkami tysięcy.
function PoleLiczby({ id, wartosc, ustaw, jednostka, maks = 9 }: { id: string; wartosc: string; ustaw: (v: string) => void; jednostka: string; maks?: number }) {
  return (
    <ZJednostka jednostka={jednostka}>
      <Input id={id} inputMode="numeric" autoComplete="off" className={wJednostce} value={wartosc ? Number(wartosc).toLocaleString("de-DE") : ""}
        onChange={(e) => ustaw(e.target.value.replace(/\D/g, "").slice(0, maks))} />
    </ZJednostka>
  )
}

// Data: wpisujesz („8.11”, „08.11.2026”) albo wybierasz z kalendarza z listą miesięcy i lat.
function PoleDaty({ id, iso, ustaw }: { id: string; iso: string | null; ustaw: (v: string | null) => void }) {
  const [t, ustawT] = React.useState(naPolska(iso))
  const [blad, ustawBlad] = React.useState(false)
  const [otwarty, ustawOtwarty] = React.useState(false)
  const start = iso ? new Date(iso) : new Date()
  const [widok, ustawWidok] = React.useState({ r: start.getFullYear(), m: start.getMonth() })
  const [poprzednia, ustawPoprzednia] = React.useState(iso)
  if (iso !== poprzednia) { ustawPoprzednia(iso); ustawT(naPolska(iso)) }
  const zatwierdz = () => {
    if (!t.trim()) { ustawBlad(false); return ustaw(null) }
    const x = zPolskiej(t)
    ustawBlad(!x)
    if (x) { ustaw(x); ustawT(naPolska(x)) }
  }
  const wybierz = (d: number) => {
    const x = `${widok.r}-${String(widok.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    ustaw(x); ustawT(naPolska(x)); ustawBlad(false); ustawOtwarty(false)
  }
  const pierwszy = (new Date(widok.r, widok.m, 1).getDay() + 6) % 7
  const dni = new Date(widok.r, widok.m + 1, 0).getDate()
  const dzis = new Date()
  const przesunM = (o: number) => ustawWidok(({ r, m }) => { const d = new Date(r, m + o, 1); return { r: d.getFullYear(), m: d.getMonth() } })
  return (
    <>
      <div className="flex h-9 items-center rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
        <Input id={id} inputMode="numeric" autoComplete="off" className={wJednostce} value={t} onChange={(e) => ustawT(e.target.value)}
          onBlur={zatwierdz} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), zatwierdz())} />
        <Popover open={otwarty} onOpenChange={(v) => { ustawOtwarty(v); if (v) ustawWidok({ r: (iso ? new Date(iso) : dzis).getFullYear(), m: (iso ? new Date(iso) : dzis).getMonth() }) }}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="mr-1" aria-label="Kalendarz"><CalendarIcon /></Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Poprzedni miesiąc" onClick={() => przesunM(-1)}><ChevronLeftIcon /></Button>
              <select aria-label="Miesiąc" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-1 text-sm" value={widok.m} onChange={(e) => ustawWidok((w) => ({ ...w, m: Number(e.target.value) }))}>
                {MIESIACE.map((x, i) => <option key={x} value={i}>{x}</option>)}
              </select>
              <select aria-label="Rok" className="h-8 rounded-md border bg-background px-1 text-sm" value={widok.r} onChange={(e) => ustawWidok((w) => ({ ...w, r: Number(e.target.value) }))}>
                {[String(ROK + 1), ...LATA].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Następny miesiąc" onClick={() => przesunM(1)}><ChevronRightIcon /></Button>
            </div>
            <div className="grid grid-cols-7 text-center text-sm">
              {["pn", "wt", "śr", "cz", "pt", "so", "nd"].map((x) => <span key={x} className="py-1 text-xs text-muted-foreground">{x}</span>)}
              {Array.from({ length: pierwszy }, (_, i) => <span key={"p" + i} />)}
              {Array.from({ length: dni }, (_, i) => i + 1).map((d) => (
                <button key={d} type="button" onClick={() => wybierz(d)}
                  className={cn("h-8 rounded-md hover:bg-muted", widok.r === dzis.getFullYear() && widok.m === dzis.getMonth() && d === dzis.getDate() && "font-semibold underline")}>{d}</button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => { ustawWidok({ r: dzis.getFullYear(), m: dzis.getMonth() }); setTimeout(() => wybierz(dzis.getDate())) }}>Dziś</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { ustaw(null); ustawT(""); ustawOtwarty(false) }}>Wyczyść</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {blad && <span className="text-xs text-destructive">Wpisz datę jako dzień.miesiąc, np. 08.11 albo 08.11.2026</span>}
    </>
  )
}

// Pole z listą do wyboru i wyszukiwaniem (marka, model). Można też wpisać coś spoza listy.
function PoleZListy({ id, wartosc, ustaw, opcje, disabled }: { id: string; wartosc: string; ustaw: (v: string) => void; opcje: string[]; disabled?: boolean }) {
  const [otwarta, ustawOtwarta] = React.useState(false)
  const [szukam, ustawSzukam] = React.useState(false)
  const [akt, ustawAkt] = React.useState(0)
  const q = wartosc.trim().toLowerCase()
  const wyniki = szukam && q ? opcje.filter((o) => o.toLowerCase().includes(q)) : opcje
  const wybierz = (o: string) => { ustaw(o); ustawOtwarta(false) }
  return (
    <div className="relative">
      <Input id={id} autoComplete="off" disabled={disabled} value={wartosc}
        onFocus={() => { ustawOtwarta(true); ustawSzukam(false); ustawAkt(0) }}
        onBlur={() => setTimeout(() => ustawOtwarta(false), 120)}
        onChange={(e) => { ustaw(e.target.value); ustawOtwarta(true); ustawSzukam(true); ustawAkt(0) }}
        onKeyDown={(e) => {
          if (!otwarta) return
          if (e.key === "ArrowDown") { e.preventDefault(); ustawAkt((a) => Math.min(a + 1, wyniki.length - 1)) }
          else if (e.key === "ArrowUp") { e.preventDefault(); ustawAkt((a) => Math.max(a - 1, 0)) }
          else if (e.key === "Enter" && wyniki[akt]) { e.preventDefault(); wybierz(wyniki[akt]) }
          else if (e.key === "Escape") ustawOtwarta(false)
        }} />
      {otwarta && !disabled && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {wyniki.length ? wyniki.map((o, i) => (
            <button key={o} type="button" onMouseDown={(e) => { e.preventDefault(); wybierz(o) }}
              className={cn("block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted", i === akt && "bg-muted")}>{o}</button>
          )) : <p className="px-2 py-1.5 text-sm text-muted-foreground">Brak na liście. Zostanie tak, jak wpisałeś.</p>}
        </div>
      )}
    </div>
  )
}

function Podpowiedz({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md bg-muted px-3 py-2 text-sm">{children}</div>
}

// ---------- Okno ----------

export function OknoMojegoAuta({ auto, otwarte, zamknij, dane, kurs, zdjecia, adresy, wgrywanie, wgrajDo, zatrzymaj, zmienZdjecia, zapisane, usuniete }: {
  auto: MojeAuto | null // null = nowe auto
  otwarte: boolean
  zamknij: () => void
  dane: Dane
  kurs: number
  zdjecia: Zdjecie[] // zdjęcia tego auta
  adresy: Record<string, string>
  wgrywanie: Wgrywanie | null
  wgrajDo: (autoId: string, rodzaj: Rodzaj, pliki: (File | string)[]) => Promise<Zdjecie[]>
  zatrzymaj: () => void
  zmienZdjecia: (zmienione: Zdjecie[], usuniete: string[]) => void
  zapisane: (a: MojeAuto, czyNowe: boolean) => void
  usuniete: (id: string) => void
}) {
  const [f, ustawF] = React.useState<Formularz>(() => zAuta(auto))
  const [krok, ustawKrok] = React.useState(0)
  const [zmienione, ustawZmienione] = React.useState(false)
  const [czekam, ustawCzekam] = React.useState(false)
  const [pytanie, ustawPytanie] = React.useState<"zamknij" | "usun" | null>(null)
  const [zVin, ustawZVin] = React.useState<{ marka: string; model: string; rok: string }>({ marka: "", model: "", rok: "" })
  const [oferty, ustawOferty] = React.useState<Wiersz | null>(null)
  const id = React.useRef<string | null>(auto?.id ?? null) // do zapisów (asynchronicznie)
  const [wBazie, ustawWBazie] = React.useState(!!auto) // do wyświetlania
  const zmien = (z: Partial<Formularz>) => { ustawF((x) => ({ ...x, ...z })); ustawZmienione(true) }

  const auta1 = React.useMemo(() => przygotuj(dane.rows), [dane])
  const zSkanu = f.zrodlo === "auto1" && f.zrodlo_id.trim() ? auta1.find((r) => r.id.toUpperCase() === f.zrodlo_id.trim().toUpperCase()) : undefined
  const vin = rozpoznajVin(f.vin)

  const zapiszWBazie = async (): Promise<MojeAuto> => {
    const rekord = doBazy(f, auto)
    const nowe = !id.current
    const a = nowe ? await dodajAuto(rekord) : await zmienAuto(id.current!, rekord)
    id.current = a.id
    ustawWBazie(true)
    if (nowe) zapamietajWalute(KLUCZ_WALUTY, f.waluta)
    zapisane(a, nowe)
    ustawZmienione(false)
    return a
  }
  const zapisz = async () => {
    ustawCzekam(true)
    try {
      await zapiszWBazie()
      toast.success("Zapisano.")
      zamknij()
    } catch {
      toast.error("Nie udało się zapisać. Spróbuj jeszcze raz.")
    } finally {
      ustawCzekam(false)
    }
  }
  // Zdjęcia potrzebują auta w bazie: nowe auto zapisuje się samo przy pierwszym zdjęciu.
  const autoDoZdjec = async () => id.current ?? (await zapiszWBazie()).id

  const wpiszVin = (t: string) => {
    const v = czystyVin(t)
    const r = rozpoznajVin(v)
    const z: Partial<Formularz> = { vin: v }
    // nowy VIN podmienia to, co wpisał poprzedni VIN; tego, co wybrałeś sam, nie rusza
    const podmien = (k: "marka" | "model" | "rok", w: string) => { if (w && (!f[k] || f[k] === zVin[k])) z[k] = w; else if (!w && f[k] && f[k] === zVin[k]) z[k] = "" }
    if (r) {
      podmien("marka", r.marka ?? "")
      podmien("model", r.model ?? "")
      podmien("rok", r.rok ? String(r.rok) : "")
      ustawZVin({ marka: r.marka ?? "", model: r.model ?? "", rok: r.rok ? String(r.rok) : "" })
    }
    zmien(z)
  }
  const wpiszNumer = (t: string) => {
    const nr = t.toUpperCase().replace(/\s/g, "")
    const r = auta1.find((x) => x.id.toUpperCase() === nr)
    const z: Partial<Formularz> = { zrodlo_id: nr }
    if (r) {
      const d = zAuta1(r)
      Object.assign(z, {
        marka: d.marka ?? f.marka, model: d.model ?? f.model, rok: s(d.rok) || f.rok, rej_miesiac: s(d.rej_miesiac) || f.rej_miesiac,
        rej_rok: s(d.rej_rok) || f.rej_rok, paliwo: d.paliwo ?? f.paliwo, skrzynia: d.skrzynia ?? f.skrzynia, moc: s(d.moc_km) || f.moc,
        przebieg: s(d.przebieg_km) || f.przebieg,
      })
      if (f.zakup === null && r.a_eur !== null && f.waluta === "EUR") z.zakup = r.a_eur
    }
    zmien(z)
  }

  const tytul = [f.marka, f.model].filter(Boolean).join(" ") || auto?.nazwa || "Dodaj auto"
  const razem = f.zakup === null && f.transport === null ? null : (f.zakup ?? 0) + (f.transport ?? 0)
  const dalej = () => { ustawKrok((k) => Math.min(2, k + 1)); document.getElementById("okno-mojego-auta")?.scrollTo(0, 0) }
  const wstecz = () => { ustawKrok((k) => Math.max(0, k - 1)); document.getElementById("okno-mojego-auta")?.scrollTo(0, 0) }

  // ---- Krok 1: Dane ----
  const krok1 = (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Pole id="ma-skad" etykieta="Skąd auto" className="sm:col-span-2">
          <Wybor value={f.zrodlo === "dania" ? "inne" : f.zrodlo} onChange={(v) => zmien({ zrodlo: (v || "inne") as Formularz["zrodlo"] })} puste="wybierz" opcje={ZRODLA.map(([a, b]) => [a, b])} />
        </Pole>
        {f.zrodlo === "auto1" && (
          <Pole id="ma-numer" etykieta="Numer Auto1" className="sm:col-span-2">
            <Input id="ma-numer" autoComplete="off" spellCheck={false} className="uppercase" value={f.zrodlo_id} onChange={(e) => wpiszNumer(e.target.value)} />
            {zSkanu ? (
              <Podpowiedz>Auto z nocnego skanu: {zSkanu.title}. Dane niżej są wypełnione, możesz je poprawić.</Podpowiedz>
            ) : f.zrodlo_id.trim().length >= 7 ? (
              <Podpowiedz>Tego numeru nie ma w ostatnim nocnym skanie. Dane wpisz albo wybierz niżej.</Podpowiedz>
            ) : null}
          </Pole>
        )}
        <Pole id="ma-vin" etykieta="VIN" className="sm:col-span-2">
          <Input id="ma-vin" autoComplete="off" spellCheck={false} className="tracking-wide uppercase" value={f.vin} onChange={(e) => wpiszVin(e.target.value)} />
          {vin && (
            <Podpowiedz>
              {!vin.marka ? "Nie rozpoznano tego VIN. Wybierz markę i model z listy." : (
                <>
                  Z numeru VIN: {[vin.marka, vin.model, vin.rok && `rocznik ${vin.rok}`].filter(Boolean).join(", ")}.{" "}
                  {vin.kandydaci.length ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">Ten VIN pasuje do dwóch modeli, wybierz:
                      {vin.kandydaci.map((k) => <Button key={k} type="button" size="xs" variant={f.model === k ? "default" : "outline"} onClick={() => zmien({ model: k })}>{k}</Button>)}
                    </span>
                  ) : [!vin.model && "model", !vin.rok && "rocznik"].filter(Boolean).length ? `${[!vin.model && "Model", !vin.rok && (vin.model ? "Rocznik" : "rocznik")].filter(Boolean).join(" i ")} wybierz z listy.` : ""}
                </>
              )}
            </Podpowiedz>
          )}
        </Pole>
        <Pole id="ma-marka" etykieta="Marka">
          <PoleZListy id="ma-marka" wartosc={f.marka} opcje={Object.keys(MARKI)} ustaw={(v) => zmien(v === f.marka ? {} : { marka: v, model: MARKI[v] ? "" : f.model })} />
        </Pole>
        <Pole id="ma-model" etykieta="Model">
          <PoleZListy id="ma-model" wartosc={f.model} opcje={MARKI[f.marka] ?? []} disabled={!f.marka} ustaw={(v) => zmien({ model: v })} />
        </Pole>
        <Pole id="ma-rok" etykieta="Rocznik">
          <Wybor value={f.rok} onChange={(v) => zmien({ rok: v })} puste="wybierz" opcje={LATA.map((r) => [r, r])} />
        </Pole>
        <Pole etykieta="Pierwsza rejestracja">
          <div className="grid grid-cols-2 gap-2">
            <Wybor value={f.rej_miesiac} onChange={(v) => zmien({ rej_miesiac: v })} puste="miesiąc" opcje={MIESIACE.map((m, i) => [String(i + 1), `${i + 1}. ${m}`])} />
            <Wybor value={f.rej_rok} onChange={(v) => zmien({ rej_rok: v })} puste="rok" opcje={LATA.map((r) => [r, r])} />
          </div>
        </Pole>
        <Pole etykieta="Paliwo"><Wybor value={f.paliwo} onChange={(v) => zmien({ paliwo: v })} puste="wybierz" opcje={PALIWA.map((x) => [x, x])} /></Pole>
        <Pole etykieta="Skrzynia"><Wybor value={f.skrzynia} onChange={(v) => zmien({ skrzynia: v })} puste="wybierz" opcje={SKRZYNIE.map((x) => [x, x])} /></Pole>
        <Pole id="ma-moc" etykieta="Moc"><PoleLiczby id="ma-moc" wartosc={f.moc} ustaw={(v) => zmien({ moc: v })} jednostka="KM" maks={4} /></Pole>
        <Pole id="ma-km" etykieta="Przebieg"><PoleLiczby id="ma-km" wartosc={f.przebieg} ustaw={(v) => zmien({ przebieg: v })} jednostka="km" maks={7} /></Pole>
        <Pole etykieta="Liczba właścicieli"><Wybor value={f.wlasciciele} onChange={(v) => zmien({ wlasciciele: v })} puste="wybierz" opcje={["1", "2", "3", "4", "5+"].map((x) => [x, x])} /></Pole>
        <Pole etykieta="Status"><Wybor value={f.status} onChange={(v) => zmien({ status: (v || "kupione") as Status })} puste="wybierz" opcje={STATUSY.map(([a, b]) => [a, b])} /></Pole>
        <Pole id="ma-zakup-data" etykieta="Data zakupu"><PoleDaty id="ma-zakup-data" iso={f.zakup_data} ustaw={(v) => zmien({ zakup_data: v })} /></Pole>
        <Pole id="ma-przyjazd" etykieta="Przyjazd auta"><PoleDaty id="ma-przyjazd" iso={f.przyjazd_data} ustaw={(v) => zmien({ przyjazd_data: v })} /></Pole>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Ceny</h3>
          <ToggleGroup type="single" variant="outline" size="sm" value={f.waluta} onValueChange={(v) => v && zmien({ waluta: v as Wal })}>
            <ToggleGroupItem value="EUR" aria-label="Euro">€</ToggleGroupItem>
            <ToggleGroupItem value="PLN" aria-label="Złote">zł</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Pole id="ma-zakup" etykieta="Cena zakupu"><PoleKwoty id="ma-zakup" wartosc={f.zakup} waluta={f.waluta} ustaw={(v) => zmien({ zakup: v })} /></Pole>
          <Pole id="ma-transport" etykieta="Transport"><PoleKwoty id="ma-transport" wartosc={f.transport} waluta={f.waluta} ustaw={(v) => zmien({ transport: v })} /></Pole>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium">Razem z transportem</span>
            <span className="text-base font-semibold tabular-nums">{razem === null ? "—" : kw(razem, f.waluta)}</span>
          </div>
          <div className="sm:col-span-2"><Rynek f={f} zSkanu={zSkanu} kurs={kurs} pokaz={ustawOferty} /></div>
          <Pole id="ma-docelowa" etykieta="Cena, za którą chcę sprzedać" className="sm:col-span-2"><PoleKwoty id="ma-docelowa" wartosc={f.docelowa} waluta={f.waluta} ustaw={(v) => zmien({ docelowa: v })} /></Pole>
          {f.status === "sprzedane" && (
            <>
              <Pole id="ma-sprzedaz" etykieta="Cena sprzedaży"><PoleKwoty id="ma-sprzedaz" wartosc={f.sprzedaz} waluta={f.waluta} ustaw={(v) => zmien({ sprzedaz: v })} /></Pole>
              <Pole id="ma-sprzedaz-data" etykieta="Data sprzedaży"><PoleDaty id="ma-sprzedaz-data" iso={f.sprzedaz_data} ustaw={(v) => zmien({ sprzedaz_data: v })} /></Pole>
            </>
          )}
          <Pole id="ma-ogloszenie" etykieta="Link do ogłoszenia" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input id="ma-ogloszenie" type="url" autoComplete="off" value={f.ogloszenie} onChange={(e) => zmien({ ogloszenie: e.target.value })} />
              {/^https?:\/\//.test(f.ogloszenie.trim()) && <Button asChild variant="outline" size="icon" aria-label="Otwórz ogłoszenie"><a href={f.ogloszenie.trim()} target="_blank" rel="noopener"><ExternalLinkIcon /></a></Button>}
            </div>
          </Pole>
        </div>
      </section>
    </div>
  )

  return (
    <>
      <Dialog open={otwarte} onOpenChange={(v) => { if (!v) { if (zmienione) ustawPytanie("zamknij"); else zamknij() } }}>
        <DialogContent id="okno-mojego-auta" className="flex max-h-[92svh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="gap-4 px-4 pt-4 sm:px-6 sm:pt-5">
            <DialogTitle className="pr-8">{tytul}</DialogTitle>
            <DialogDescription className="sr-only">Dane auta w trzech krokach: dane i ceny, stan, zdjęcia.</DialogDescription>
            <nav className="grid grid-cols-3 gap-2">
              {KROKI.map(([t, o], i) => (
                <button key={t} type="button" onClick={() => ustawKrok(i)} aria-current={i === krok ? "step" : undefined}
                  className={cn("border-b-2 pb-2 text-left text-xs text-muted-foreground", i === krok ? "border-primary text-foreground" : "border-border")}>
                  <span className="block text-sm font-medium">{i + 1}. {t}</span>{o}
                </button>
              ))}
            </nav>
          </DialogHeader>

          <div className="px-4 py-5 sm:px-6">
            {krok === 0 && krok1}
            {krok === 1 && <Stan f={f} zmien={zmien} zdjecia={zdjecia} adresy={adresy} dodajZdjecie={async (p) => (await wgrajDo(await autoDoZdjec(), "inne", [p]))[0]} />}
            {krok === 2 && (
              <Zdjecia nazwa={tytul} zdjecia={zdjecia} adresy={adresy} wgrywanie={wgrywanie} zatrzymaj={zatrzymaj} zmienZdjecia={zmienZdjecia}
                wgraj={async (r, pliki) => {
                  try {
                    await wgrajDo(await autoDoZdjec(), r, pliki)
                  } catch {
                    toast.error("Nie udało się zapisać auta przed wgraniem zdjęć.")
                  }
                }} />
            )}
          </div>

          <div className="sticky bottom-0 flex items-center gap-2 border-t bg-background px-4 py-3 sm:px-6">
            <Button variant="outline" disabled={krok === 0} onClick={wstecz}>Wstecz</Button>
            {wBazie && (
              <Button variant="ghost" size="icon" aria-label="Usuń auto" onClick={() => ustawPytanie("usun")}><Trash2Icon /></Button>
            )}
            <span className="flex-1" />
            <Button variant="outline" disabled={czekam} onClick={zapisz}>{czekam ? "Zapisuję…" : "Zapisz"}</Button>
            {krok < 2 && <Button onClick={dalej}>Dalej</Button>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pytanie !== null} onOpenChange={(v) => !v && ustawPytanie(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{pytanie === "usun" ? `Usunąć ${tytul}?` : "Zapisać zmiany?"}</DialogTitle>
            <DialogDescription>{pytanie === "usun" ? "Auto i wszystkie jego zdjęcia znikną na zawsze." : "W tym aucie są niezapisane zmiany."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {pytanie === "usun" ? (
              <>
                <Button variant="outline" onClick={() => ustawPytanie(null)}>Anuluj</Button>
                <Button variant="destructive" onClick={async () => {
                  try {
                    await usunAuto(id.current!, zdjecia)
                    ustawPytanie(null)
                    usuniete(id.current!)
                    toast.success("Usunięto.")
                  } catch {
                    toast.error("Nie udało się usunąć.")
                  }
                }}>Usuń</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { ustawPytanie(null); zamknij() }}>Nie zapisuj</Button>
                <Button onClick={() => { ustawPytanie(null); zapisz() }}>Zapisz</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OknoAuta auto={oferty} waluta={f.waluta === "EUR" ? "eur" : "pln"} kurs={kurs} zamknij={() => ustawOferty(null)} widziany={() => {}} bezZakupu />
    </>
  )
}

// Porównanie z rynkiem: dla auta z nocnego skanu Auto1 średnia 1–5 najtańszych ofert; dla każdego auta link do Otomoto.
function Rynek({ f, zSkanu, kurs, pokaz }: { f: Formularz; zSkanu: Wiersz | undefined; kurs: number; pokaz: (r: Wiersz) => void }) {
  if (!f.marka || !f.model) return <p className="rounded-md border px-3 py-2.5 text-sm text-muted-foreground">Porównanie z rynkiem pojawi się, gdy wybierzesz markę i model.</p>
  const rok = Number(f.rok) || null
  const km = Number(f.przebieg) || null
  const srednia = zSkanu ? (f.waluta === "EUR" ? zSkanu.o_eur : zSkanu.o_pln ?? (zSkanu.o_eur === null ? null : zSkanu.o_eur * kurs)) : null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">Rynek</span>
        {srednia !== null ? (
          <>
            <span className="font-semibold tabular-nums">Średnia {zSkanu!.compared ?? ""} najtańszych: {kw(Math.round(srednia), f.waluta)}</span>
            <span className="text-xs text-muted-foreground">z nocnego skanu, rocznik ±2, przebieg do +40.000 km</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{zSkanu ? "Nocny skan nie znalazł ofert do porównania." : "Średnia z nocnego skanu jest tylko dla aut z Auto1 (po numerze)."}</span>
        )}
      </div>
      <div className="flex gap-2">
        {zSkanu && <Button type="button" variant="outline" size="sm" onClick={() => pokaz(zSkanu)}>Pokaż oferty</Button>}
        <Button asChild variant="outline" size="sm"><a href={linkOtomoto(f.marka, f.model, rok, km)} target="_blank" rel="noopener">Otomoto<ExternalLinkIcon /></a></Button>
      </div>
    </div>
  )
}

// ---- Krok 2: Stan ----
function Stan({ f, zmien, zdjecia, adresy, dodajZdjecie }: {
  f: Formularz; zmien: (z: Partial<Formularz>) => void; zdjecia: Zdjecie[]; adresy: Record<string, string>; dodajZdjecie: (p: File) => Promise<Zdjecie | undefined>
}) {
  const [opis, ustawOpis] = React.useState("")
  const [kwota, ustawKwote] = React.useState("")
  const [zdjecie, ustawZdjecie] = React.useState<string | null>(null)
  const [wybor, ustawWybor] = React.useState(false)
  const [wgrywam, ustawWgrywam] = React.useState(false)
  const plik = React.useRef<HTMLInputElement>(null)
  const opisRef = React.useRef<HTMLInputElement>(null)
  const dodaj = () => {
    if (!opis.trim()) return opisRef.current?.focus()
    zmien({ szkody: [...f.szkody, { opis: opis.trim(), kwota: kwotaLiczba(kwota), zdjecie }] })
    ustawOpis(""); ustawKwote(""); ustawZdjecie(null)
    opisRef.current?.focus()
  }
  const suma = f.szkody.reduce((s, x) => s + (x.kwota ?? 0), 0)
  const enter = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); dodaj() } }
  const zdj = (id?: string | null) => zdjecia.find((z) => z.id === id)
  const obrazy = zdjecia.filter((z) => !czyPdf(z)).sort(poKolei)
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">Szkody</h3>
        {f.szkody.length > 0 && (
          <div className="divide-y rounded-md border">
            {f.szkody.map((x, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                {zdj(x.zdjecie) && adresy[zdj(x.zdjecie)!.sciezka] && <img src={adresy[zdj(x.zdjecie)!.sciezka]} alt="" className="h-9 w-12 shrink-0 rounded object-cover" />}
                <span className="min-w-0 flex-1 break-words">{x.opis}</span>
                <span className="shrink-0 tabular-nums">{x.kwota === null ? "" : kw(x.kwota, f.waluta)}</span>
                <Button variant="ghost" size="icon-sm" aria-label="Usuń szkodę" onClick={() => zmien({ szkody: f.szkody.filter((_, j) => j !== i) })}><XIcon /></Button>
              </div>
            ))}
            {suma > 0 && <div className="flex justify-between bg-muted/50 px-3 py-2 pr-12 text-sm font-semibold"><span>Razem</span><span className="tabular-nums">{kw(suma, f.waluta)}</span></div>}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2 sm:grid-cols-[1fr_9rem_auto_auto]">
          <Pole id="ma-szk-opis" etykieta="Opis szkody" className="col-span-3 sm:col-span-1">
            <Input ref={opisRef} id="ma-szk-opis" autoComplete="off" value={opis} onChange={(e) => ustawOpis(e.target.value)} onKeyDown={enter} />
          </Pole>
          <Pole id="ma-szk-kwota" etykieta="Naprawa">
            <ZJednostka jednostka={f.waluta === "EUR" ? "€" : "zł"}>
              <Input id="ma-szk-kwota" inputMode="decimal" autoComplete="off" className={wJednostce} value={kwota} onChange={(e) => ustawKwote(kwotaTekst(e.target.value))} onKeyDown={enter} />
            </ZJednostka>
          </Pole>
          <Button type="button" variant={zdjecie ? "secondary" : "outline"} size="icon" aria-label="Zdjęcie do szkody" disabled={wgrywam} onClick={() => ustawWybor(true)}><ImageIcon /></Button>
          <Button type="button" onClick={dodaj}>Dodaj</Button>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <Label htmlFor="ma-lakier" className="text-base font-semibold">Lakier</Label>
        <Textarea id="ma-lakier" value={f.lakier} onChange={(e) => zmien({ lakier: e.target.value })} />
        <span className="text-sm text-muted-foreground">Np. drzwi lewe 250 µm, błotnik 180 µm.</span>
      </section>
      <section className="flex flex-col gap-2">
        <Label htmlFor="ma-notatki" className="text-base font-semibold">Notatki</Label>
        <Textarea id="ma-notatki" value={f.notatka} onChange={(e) => zmien({ notatka: e.target.value })} />
      </section>

      <input ref={plik} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const p = e.target.files?.[0]
        e.target.value = ""
        if (!p) return
        ustawWybor(false)
        ustawWgrywam(true)
        const z = await dodajZdjecie(p).catch(() => undefined)
        ustawWgrywam(false)
        if (z) ustawZdjecie(z.id)
        else toast.error("Nie udało się wgrać zdjęcia.")
      }} />
      <Dialog open={wybor} onOpenChange={ustawWybor}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Zdjęcie do szkody</DialogTitle>
            <DialogDescription>Wybierz jedno z wrzuconych albo dodaj nowe (trafi do grupy Inne).</DialogDescription>
          </DialogHeader>
          {obrazy.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {obrazy.map((z) => (
                <button key={z.id} type="button" onClick={() => { ustawZdjecie(z.id); ustawWybor(false) }}
                  className={cn("aspect-[4/3] overflow-hidden rounded-md", zdjecie === z.id && "ring-2 ring-primary")}>
                  <img src={adresy[z.sciezka]} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            {zdjecie && <Button variant="ghost" onClick={() => { ustawZdjecie(null); ustawWybor(false) }}>Bez zdjęcia</Button>}
            <Button onClick={() => plik.current?.click()}>Nowe zdjęcie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Krok 3: Zdjęcia ----
function Zdjecia({ nazwa, zdjecia, adresy, wgrywanie, zatrzymaj, zmienZdjecia, wgraj }: {
  nazwa: string; zdjecia: Zdjecie[]; adresy: Record<string, string>; wgrywanie: Wgrywanie | null; zatrzymaj: () => void
  zmienZdjecia: (zmienione: Zdjecie[], usuniete: string[]) => void; wgraj: (r: Rodzaj, pliki: File[]) => Promise<void>
}) {
  const [grupa, ustawGrupe] = React.useState<Rodzaj>(() => RODZAJE.find(([r]) => zdjecia.some((z) => z.rodzaj === r))?.[0] ?? "sprzedawca")
  const [edycja, ustawEdycje] = React.useState(false)
  const [nad, ustawNad] = React.useState(false)
  const [duze, ustawDuze] = React.useState<Zdjecie | null>(null)
  const [doUsuniecia, ustawDoUsuniecia] = React.useState<string | null>(null)
  const [kolejka, ustawKolejke] = React.useState<string[] | null>(null) // kolejność w trakcie przeciągania
  const plik = React.useRef<HTMLInputElement>(null)
  const lista = zdjecia.filter((z) => z.rodzaj === grupa).sort(poKolei)
  const widok = kolejka ? kolejka.map((id) => lista.find((z) => z.id === id)!).filter(Boolean) : lista

  const zapisz = async (zmiany: { id: string; z: Partial<Zdjecie> }[]) => {
    try {
      zmienZdjecia(await Promise.all(zmiany.map((x) => zmienZdjecie(x.id, x.z))), [])
    } catch {
      toast.error("Nie udało się zapisać.")
    }
  }
  const wrzuc = (pliki: FileList | File[] | null | undefined) => {
    const obrazy = [...(pliki ?? [])].filter((p) => p.type.startsWith("image/"))
    if (obrazy.length) wgraj(grupa, obrazy)
  }

  // Przeciąganie palcem albo myszką w trybie Edytuj; kolejność zapisuje się po puszczeniu.
  const ciagnij = (e: React.PointerEvent, z: Zdjecie) => {
    if ((e.target as HTMLElement).closest("button,select")) return
    e.preventDefault()
    const start = lista.findIndex((x) => x.id === z.id)
    let ids = lista.map((x) => x.id)
    const kafel = e.currentTarget as HTMLElement
    const r = kafel.getBoundingClientRect()
    const duch = kafel.cloneNode(true) as HTMLElement
    Object.assign(duch.style, { position: "fixed", width: r.width + "px", height: r.height + "px", pointerEvents: "none", zIndex: "100", opacity: "0.9", boxShadow: "0 10px 30px rgb(0 0 0 / .35)", left: r.left + "px", top: r.top + "px" })
    document.body.appendChild(duch)
    const dx = e.clientX - r.left, dy = e.clientY - r.top
    ustawKolejke(ids)
    const ruch = (ev: PointerEvent) => {
      duch.style.left = ev.clientX - dx + "px"
      duch.style.top = ev.clientY - dy + "px"
      const pod = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-zdjecie]")?.dataset.zdjecie
      if (pod && pod !== z.id) {
        const a = ids.indexOf(z.id), b = ids.indexOf(pod)
        ids = [...ids]; ids.splice(a, 1); ids.splice(b, 0, z.id)
        ustawKolejke(ids)
      }
    }
    const koniec = () => {
      duch.remove()
      removeEventListener("pointermove", ruch); removeEventListener("pointerup", koniec); removeEventListener("pointercancel", koniec)
      const na = ids.indexOf(z.id)
      ustawKolejke(null)
      if (na !== start) zapisz(przesun(lista, start, na).map((x) => ({ id: x.id, z: { kolejnosc: x.kolejnosc } })))
    }
    addEventListener("pointermove", ruch); addEventListener("pointerup", koniec); addEventListener("pointercancel", koniec)
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg border bg-muted p-1">
        {RODZAJE.map(([r, t]) => (
          <button key={r} role="tab" type="button" aria-selected={r === grupa} onClick={() => { ustawGrupe(r); ustawEdycje(false); ustawDoUsuniecia(null) }}
            className={cn("flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md text-sm text-muted-foreground", r === grupa && "bg-background font-medium text-foreground shadow-sm")}>
            {t}<span className="text-xs tabular-nums text-muted-foreground">{zdjecia.filter((z) => z.rodzaj === r).length}</span>
          </button>
        ))}
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">{{ sprzedawca: "Zdjęcia z aukcji lub od sprzedawcy.", moje: "Twoje zdjęcia, np. do ogłoszenia.", inne: "Wszystko inne." }[grupa]}</p>

      <button type="button" disabled={!!wgrywanie} onClick={() => plik.current?.click()}
        onDragOver={(e) => { e.preventDefault(); ustawNad(true) }} onDragLeave={() => ustawNad(false)}
        onDrop={(e) => { e.preventDefault(); ustawNad(false); wrzuc(e.dataTransfer.files) }}
        className={cn("rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm text-muted-foreground", nad && "border-primary text-foreground")}>
        <span className="font-medium text-foreground">Wrzuć zdjęcia: {RODZAJE.find(([r]) => r === grupa)![1].toLowerCase()}</span>
        <br />przeciągnij tutaj albo kliknij i wybierz, ile chcesz
      </button>
      <input ref={plik} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { wrzuc(e.target.files); e.target.value = "" }} />

      {wgrywanie && (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span>Wgrywam {wgrywanie.gotowe}/{wgrywanie.razem}{wgrywanie.bledy ? `, nieudane: ${wgrywanie.bledy}` : ""}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(wgrywanie.gotowe / Math.max(wgrywanie.razem, 1)) * 100}%` }} /></div>
          </div>
          <Button size="sm" variant="outline" onClick={zatrzymaj}><SquareIcon />Zatrzymaj</Button>
        </div>
      )}

      {lista.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{lista.length} {ile(lista.length)} · {edycja ? "przeciągnij, żeby ułożyć; × usuwa; pod zdjęciem zmienisz grupę" : "kliknij zdjęcie, żeby je powiększyć"}</span>
            <Button size="sm" variant={edycja ? "default" : "outline"} onClick={() => { ustawEdycje(!edycja); ustawDoUsuniecia(null) }}>{edycja ? "Gotowe" : "Edytuj"}</Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
            {widok.map((z, i) => (
              <div key={z.id} data-zdjecie={z.id} onPointerDown={edycja ? (e) => ciagnij(e, z) : undefined}
                onClick={edycja ? undefined : () => ustawDuze(z)}
                className={cn("relative aspect-[4/3] overflow-hidden rounded-md bg-muted", edycja ? "cursor-grab touch-none outline-2 -outline-offset-2 outline-dashed outline-ring" : "cursor-zoom-in", kolejka && "transition-none")}>
                {czyPdf(z) ? <span className="flex size-full items-center justify-center text-xs">PDF</span>
                  : <img src={adresy[z.sciezka]} alt={`${nazwa}, zdjęcie ${i + 1}`} loading="lazy" draggable={false} className="pointer-events-none size-full object-cover" />}
                <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 text-[11px] text-white tabular-nums">{i + 1}</span>
                {edycja && (
                  <>
                    {doUsuniecia === z.id ? (
                      <Button size="xs" variant="destructive" className="absolute top-1 right-1" onClick={async () => {
                        try { await usunZdjecie(z); zmienZdjecia([], [z.id]) } catch { toast.error("Nie udało się usunąć zdjęcia.") }
                        ustawDoUsuniecia(null)
                      }}>Usuń</Button>
                    ) : (
                      <button type="button" aria-label="Usuń zdjęcie" onClick={() => ustawDoUsuniecia(z.id)}
                        className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/70 text-white"><XIcon className="size-4" /></button>
                    )}
                    <select aria-label="Grupa zdjęcia" value={z.rodzaj} onChange={(e) => {
                      const r = e.target.value as Rodzaj
                      zapisz([{ id: z.id, z: { rodzaj: r, kolejnosc: zdjecia.filter((x) => x.rodzaj === r).length } }])
                    }} className="absolute right-1 bottom-1 left-1 h-7 rounded bg-black/70 px-1 text-xs text-white">
                      {RODZAJE.map(([r, t]) => <option key={r} value={r}>{t}</option>)}
                    </select>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!duze} onOpenChange={(v) => !v && ustawDuze(null)}>
        <DialogContent className="max-w-[calc(100vw-1rem)] border-0 bg-black/95 p-2 sm:max-w-[90vw]" onClick={() => ustawDuze(null)}>
          <DialogTitle className="sr-only">Zdjęcie</DialogTitle>
          <DialogDescription className="sr-only">Kliknij, żeby zamknąć.</DialogDescription>
          {duze && <img src={adresy[duze.sciezka]} alt="" className="mx-auto max-h-[88svh] max-w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

