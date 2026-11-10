// Moje auta: teczki kupionych aut w bazie Supabase (tabele moje_auta, zdjecia; schowek "moje-auta").
// Tabela koszty została tylko jako zapis sprzed 10.11 (przeniesione do transportu i szkód).
// Dostęp tylko po zalogowaniu do panelu. Rachunki są czystymi funkcjami (testy w __testy__).
import type { Wiersz } from "@/lib/auta"
import type { Szczegoly } from "@/lib/dane"
import { markaZAuto1, paliwoZAuto1, skrzyniaZAuto1 } from "@/lib/marki"
import { zdjeciaAuta } from "@/lib/paczka"
import { supabase } from "@/lib/supabase"

export type Wal = "EUR" | "PLN"

export const STATUSY = [
  ["kupione", "Kupione"],
  ["w_drodze", "W drodze"],
  ["przygotowanie", "Przygotowanie"],
  ["na_sprzedaz", "Na sprzedaż"],
  ["zarezerwowane", "Zarezerwowane"],
  ["sprzedane", "Sprzedane"],
] as const
export type Status = (typeof STATUSY)[number][0]
export const NAZWA_STATUSU = Object.fromEntries(STATUSY) as Record<Status, string>

export type MojeAuto = {
  id: string
  utworzono: string
  zmieniono: string
  status: Status
  nazwa: string
  rok: number | null
  vin: string | null
  przebieg_km: number | null
  marka: string | null
  model: string | null
  rej_miesiac: number | null
  rej_rok: number | null
  paliwo: string | null
  skrzynia: string | null
  moc_km: number | null
  wlasciciele: string | null
  zrodlo: "auto1" | "inna_aukcja" | "handlarz" | "prywatnie" | "inne" | "dania"
  zrodlo_id: string | null // numer Auto1
  link: string | null // strona aukcji, z której kupione (z „Kupiłem”)
  ogloszenie: string | null // link do ogłoszenia sprzedaży
  zakup_kwota: number | null
  zakup_waluta: Wal
  zakup_data: string | null
  przyjazd_data: string | null
  transport_kwota: number | null
  wystawienie_kwota: number | null // cena, za którą chcę sprzedać
  min_zysk_kwota: number | null
  sprzedaz_waluta: Wal // od 10.11 nieużywana: wszystkie kwoty auta są w zakup_waluta
  sprzedaz_kwota: number | null
  sprzedaz_data: string | null
  notatka: string
  lakier: string
  szkody: Szkoda[]
  lista: Record<string, boolean>
}
export type Szkoda = { opis: string; kwota: number | null; zdjecie?: string | null }
export type NoweAuto = Partial<Omit<MojeAuto, "id" | "utworzono" | "zmieniono">> & { nazwa: string }

// Zdjęcia w trzech grupach.
export const RODZAJE = [
  ["sprzedawca", "Sprzedawca"],
  ["moje", "Moje"],
  ["inne", "Inne"],
] as const
export type Rodzaj = (typeof RODZAJE)[number][0]
export type Zdjecie = { id: string; auto_id: string; sciezka: string; rodzaj: Rodzaj; opis: string; kolejnosc: number }

// ---------- Rachunki (bez sieci) ----------

// Kwota z jej waluty w walucie widoku. kurs = ile zł za 1 €.
export function przelicz(kwota: number | null | undefined, z: Wal, na: Wal, kurs: number): number | null {
  if (kwota === null || kwota === undefined) return null
  if (z === na) return kwota
  return z === "EUR" ? kwota * kurs : kwota / kurs
}

export type Rachunek = {
  zakup: number | null
  koszty: number // transport + naprawy szkód
  razem: number | null // zakup + koszty
  cena: number | null // cena sprzedaży, a przed sprzedażą cena, za którą chcę sprzedać
  zysk: number | null // cena − razem
  zakonczone: boolean // zysk z prawdziwej sprzedaży
}

// Wszystkie kwoty auta są w jego walucie (zakup_waluta); `na` to waluta widoku listy.
export function rachunek(a: MojeAuto, kurs: number, na: Wal): Rachunek {
  const w = a.zakup_waluta
  const kosztyAuta = (a.transport_kwota ?? 0) + a.szkody.reduce((s, x) => s + (x.kwota ?? 0), 0)
  const zakup = przelicz(a.zakup_kwota, w, na, kurs)
  const koszty = przelicz(kosztyAuta, w, na, kurs) ?? 0
  const razem = zakup === null ? null : zakup + koszty
  const sprzedaz = przelicz(a.sprzedaz_kwota, w, na, kurs)
  const cena = sprzedaz ?? przelicz(a.wystawienie_kwota, w, na, kurs)
  const zysk = razem === null || cena === null ? null : cena - razem
  return { zakup, koszty, razem, cena, zysk, zakonczone: sprzedaz !== null }
}

// Przesunięcie zdjęcia z miejsca `z` na `na` w jego grupie: nowe numery tylko dla zdjęć, które zmieniły miejsce.
export function przesun(lista: Zdjecie[], z: number, na: number): { id: string; kolejnosc: number }[] {
  if (z === na || z < 0 || na < 0 || z >= lista.length || na >= lista.length) return []
  const nowa = [...lista]
  const [ruszone] = nowa.splice(z, 1)
  nowa.splice(na, 0, ruszone)
  return nowa.flatMap((x, i) => (x.kolejnosc === i ? [] : [{ id: x.id, kolejnosc: i }]))
}
export const poKolei = (a: Zdjecie, b: Zdjecie) => a.kolejnosc - b.kolejnosc || a.sciezka.localeCompare(b.sciezka)

// Daty po polsku: „08.11.2026” ⇄ „2026-11-08”. Wpisać można „8.11” (bieżący rok), „8.11.26”, „8 11 2026”, „08112026”.
export const naPolska = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "")
export function zPolskiej(tekst: string, terazRok = new Date().getFullYear()): string | null {
  const t = tekst.trim()
  let czesci = t.split(/[.\-/ ,]+/).filter(Boolean)
  if (czesci.length === 1 && /^\d{4}(\d{2}|\d{4})?$/.test(t)) czesci = [t.slice(0, 2), t.slice(2, 4), t.slice(4)].filter(Boolean)
  if (czesci.length < 2 || czesci.length > 3 || !czesci.every((c) => /^\d+$/.test(c))) return null
  const [d, m] = czesci.map(Number)
  let r = czesci[2] === undefined ? terazRok : Number(czesci[2])
  if (czesci[2] !== undefined && czesci[2].length <= 2) r += r > (terazRok % 100) + 1 ? 1900 : 2000
  const x = new Date(Date.UTC(r, m - 1, d))
  if (!d || !m || x.getUTCDate() !== d || x.getUTCMonth() !== m - 1) return null
  return x.toISOString().slice(0, 10)
}

// Kwoty z groszami: wpisujesz „10250,5” → widać „10.250,5”. Kropka przed 1–2 ostatnimi cyframi też jest przecinkiem.
export function kwotaTekst(v: string): string {
  const s = v.replace(/\.(\d{1,2})$/, ",$1").replace(/[^\d,]/g, "")
  const [cale, ...grosze] = s.split(",")
  const c = cale ? Number(cale).toLocaleString("de-DE") : grosze.length ? "0" : ""
  return grosze.length ? `${c},${grosze.join("").slice(0, 2)}` : c
}
export const kwotaLiczba = (v: string): number | null => {
  const t = kwotaTekst(v)
  return t ? Number(t.replace(/\./g, "").replace(",", ".")) : null
}
export const kwotaNaTekst = (n: number | null) => (n === null ? "" : kwotaTekst(String(n).replace(".", ",")))

// Zapamiętana waluta (widoku albo nowych kwot), osobno dla każdej przeglądarki.
export function pamietanaWaluta(klucz: string, domyslna: Wal): Wal {
  try {
    const w = localStorage.getItem(klucz)
    return w === "EUR" || w === "PLN" ? w : domyslna
  } catch {
    return domyslna
  }
}
export function zapamietajWalute(klucz: string, w: Wal) {
  try {
    localStorage.setItem(klucz, w)
  } catch {
    // zostanie do odświeżenia strony
  }
}

export const dniOd = (od: string | null, do_: string | null = null) =>
  od ? Math.max(0, Math.round(((do_ ? Date.parse(do_) : Date.now()) - Date.parse(od)) / 86400000)) : null
export const dataLabel = (d: string | null) => (d ? d.split("-").reverse().join(".") : "—")
export const dzis = () => new Date().toISOString().slice(0, 10)

// ---------- Baza ----------

const sprawdz = <T,>({ data, error }: { data: T | null; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message)
  return data as T
}
const liczby = (a: MojeAuto): MojeAuto => ({
  ...a,
  szkody: Array.isArray(a.szkody) ? a.szkody.map((s) => ({ ...s, kwota: s.kwota === null || s.kwota === undefined ? null : Number(s.kwota) })) : [],
  ...Object.fromEntries((["zakup_kwota", "transport_kwota", "wystawienie_kwota", "min_zysk_kwota", "sprzedaz_kwota"] as const).map((k) => [k, a[k] === null ? null : Number(a[k])])),
})

export async function pobierzWszystko(): Promise<{ auta: MojeAuto[]; zdjecia: Zdjecie[] }> {
  const [auta, zdjecia] = await Promise.all([
    supabase.from("moje_auta").select("*").order("utworzono", { ascending: false }),
    supabase.from("zdjecia").select("*").order("kolejnosc").order("utworzono"),
  ])
  return { auta: sprawdz(auta).map(liczby), zdjecia: sprawdz(zdjecia) }
}

export const dodajAuto = async (a: NoweAuto) => liczby(sprawdz(await supabase.from("moje_auta").insert(a).select().single()))
export const zmienAuto = async (id: string, z: Partial<MojeAuto>) => liczby(sprawdz(await supabase.from("moje_auta").update(z).eq("id", id).select().single()))
export async function usunAuto(id: string, zdjecia: Zdjecie[]) {
  const sciezki = zdjecia.filter((z) => z.auto_id === id).map((z) => z.sciezka)
  if (sciezki.length) await supabase.storage.from("moje-auta").remove(sciezki)
  sprawdz(await supabase.from("moje_auta").delete().eq("id", id))
}
export const zmienZdjecie = async (id: string, z: Partial<Zdjecie>) => sprawdz<Zdjecie>(await supabase.from("zdjecia").update(z).eq("id", id).select().single())
export async function usunZdjecie(z: Zdjecie) {
  await supabase.storage.from("moje-auta").remove([z.sciezka])
  sprawdz(await supabase.from("zdjecia").delete().eq("id", z.id))
}

// Linki do prywatnych zdjęć (ważne 6 h).
export async function adresyZdjec(zdjecia: Zdjecie[]): Promise<Record<string, string>> {
  if (!zdjecia.length) return {}
  const { data } = await supabase.storage.from("moje-auta").createSignedUrls(zdjecia.map((z) => z.sciezka), 6 * 3600)
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
}

// Zdjęcie zmniejszone do 2000 px po dłuższym boku (dość, żeby po przybliżeniu ocenić szkody), JPEG ok. 0,5 MB.
export const MAKS_BOK = 2000
export async function zmniejsz(plik: Blob): Promise<Blob> {
  const obraz = await createImageBitmap(plik, { imageOrientation: "from-image" })
  const skala = Math.min(1, MAKS_BOK / Math.max(obraz.width, obraz.height))
  const plotno = document.createElement("canvas")
  plotno.width = Math.round(obraz.width * skala)
  plotno.height = Math.round(obraz.height * skala)
  plotno.getContext("2d")!.drawImage(obraz, 0, 0, plotno.width, plotno.height)
  obraz.close()
  return new Promise((ok, blad) => plotno.toBlob((b) => (b ? ok(b) : blad(new Error("zdjęcie"))), "image/jpeg", 0.85))
}

// Wgrywa zdjęcie (zmniejszone) albo PDF do teczki auta.
export async function wgraj(autoId: string, plik: Blob, z: Partial<Zdjecie> = {}): Promise<Zdjecie> {
  const pdf = plik.type === "application/pdf"
  const tresc = pdf ? plik : await zmniejsz(plik)
  const sciezka = `${autoId}/${crypto.randomUUID()}.${pdf ? "pdf" : "jpg"}`
  const { error } = await supabase.storage.from("moje-auta").upload(sciezka, tresc, { contentType: pdf ? "application/pdf" : "image/jpeg" })
  if (error) throw new Error(error.message)
  return sprawdz(await supabase.from("zdjecia").insert({ auto_id: autoId, sciezka, ...z }).select().single())
}
export const czyPdf = (z: Zdjecie) => z.sciezka.endsWith(".pdf")

// ---------- Stare „Moje auta” z tej przeglądarki (przed bazą) ----------

const STARY_KLUCZ = "ar_moje_auta"
type StareAuto = { nazwa: string; auto1: string; zakupEur: number | null; zakupData: string | null; przyjazd: string | null; wystawienie: number | null; sprzedazData: string | null; sprzedaz: number | null; status: string; notatka: string }
const STARY_STATUS: Record<string, Status> = { kupione: "kupione", w_drodze: "w_drodze", na_placu: "na_sprzedaz", sprzedane: "sprzedane" }

export function stareAuta(): StareAuto[] {
  try {
    const l = JSON.parse(localStorage.getItem(STARY_KLUCZ) ?? "[]")
    return Array.isArray(l) ? l.filter((a) => a && typeof a.nazwa === "string") : []
  } catch {
    return []
  }
}

// Stare auta miały cenę wystawienia i sprzedaży w zł: przeliczone na euro (jedna waluta na auto).
export async function przeniesStare(kurs: number): Promise<number> {
  const stare = stareAuta()
  if (!stare.length) return 0
  sprawdz(await supabase.from("moje_auta").insert(stare.map((a) => ({
    nazwa: a.nazwa || a.auto1 || "Auto",
    zrodlo: a.auto1 ? "auto1" : "inne",
    zrodlo_id: a.auto1 || null,
    status: STARY_STATUS[a.status] ?? "kupione",
    zakup_kwota: a.zakupEur, zakup_waluta: "EUR", zakup_data: a.zakupData,
    przyjazd_data: a.przyjazd,
    wystawienie_kwota: przelicz(a.wystawienie, "PLN", "EUR", kurs), sprzedaz_kwota: przelicz(a.sprzedaz, "PLN", "EUR", kurs), sprzedaz_waluta: "EUR", sprzedaz_data: a.sprzedazData,
    notatka: a.notatka ?? "",
  }))))
  try {
    localStorage.removeItem(STARY_KLUCZ)
  } catch {
    // zostaną w przeglądarce, ale przycisk przenoszenia pokaże się znowu
  }
  return stare.length
}

// ---------- „Kupiłem” z okna auta Auto1 / Danii ----------

// Dane auta z nocnego skanu (po numerze Auto1 albo z „Kupiłem”).
export function zAuta1(r: Wiersz): Partial<MojeAuto> {
  return {
    marka: markaZAuto1(r.make),
    model: r.model,
    rok: r._year ?? null,
    rej_miesiac: r.reg ? Number(r.reg.slice(5, 7)) || null : null,
    rej_rok: r._year ?? null,
    paliwo: paliwoZAuto1(r.fuel),
    skrzynia: skrzyniaZAuto1(r.gear),
    moc_km: r.hp,
    przebieg_km: r.km,
  }
}

const KLUCZ_OTWORZ = "ar_moje_auta_otworz"
export const doOtwarcia = () => {
  try {
    const id = sessionStorage.getItem(KLUCZ_OTWORZ)
    sessionStorage.removeItem(KLUCZ_OTWORZ)
    return id
  } catch {
    return null
  }
}
export function otworzWMoichAutach(id: string) {
  try {
    sessionStorage.setItem(KLUCZ_OTWORZ, id)
  } catch {
    // strona otworzy się na liście
  }
  window.location.hash = "#/moje-auta"
}

const KLUCZ_ZDJECIA = "ar_moje_auta_zdjecia"
// Zdjęcia do skopiowania po „Kupiłem”: strona Moje auta kopiuje je w tle (z możliwością zatrzymania).
export function oczekujaceZdjecia(id: string): string[] {
  try {
    const z = JSON.parse(sessionStorage.getItem(KLUCZ_ZDJECIA) ?? "{}")
    sessionStorage.removeItem(KLUCZ_ZDJECIA)
    return z.id === id && Array.isArray(z.adresy) ? z.adresy : []
  } catch {
    return []
  }
}

// Zakłada teczkę z danymi auta z listy; zdjęcia (linki Auto1 wygasają po aukcji) kopiuje potem strona Moje auta.
export async function kupilem(r: Wiersz, s: Szczegoly | undefined, zmiany: Partial<MojeAuto> = {}): Promise<{ auto: MojeAuto; adresy: string[] }> {
  const auto = await dodajAuto({
    ...zAuta1(r),
    nazwa: r.title || r.id,
    vin: r.dania?.vin ?? null,
    zrodlo: r.dania ? "dania" : "auto1",
    zrodlo_id: r.id,
    link: r.auto1_url,
    zakup_kwota: r.a_eur,
    zakup_waluta: "EUR",
    zakup_data: dzis(),
    status: "kupione",
    ...zmiany,
  })
  return { auto, adresy: zdjeciaAuta(r, s).slice(0, 40) }
}
export function kupilemIOtworz(auto: MojeAuto, adresy: string[]) {
  try {
    sessionStorage.setItem(KLUCZ_ZDJECIA, JSON.stringify({ id: auto.id, adresy }))
  } catch {
    // bez zdjęć; dodasz je w teczce
  }
  otworzWMoichAutach(auto.id)
}
