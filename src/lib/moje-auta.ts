// Moje auta: teczki kupionych aut w bazie Supabase (tabele moje_auta, koszty, zdjecia; schowek "moje-auta").
// Dostęp tylko po zalogowaniu do panelu. Rachunki są czystymi funkcjami (testy w __testy__).
import type { Wiersz } from "@/lib/auta"
import type { Szczegoly } from "@/lib/dane"
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

export const KATEGORIE = [
  ["transport", "Transport"],
  ["naprawa", "Naprawa"],
  ["serwis", "Serwis"],
  ["przygotowanie", "Przygotowanie"],
  ["przeglad", "Przegląd i rejestracja"],
  ["oplaty", "Opłaty"],
  ["inne", "Inne"],
] as const
export type Kategoria = (typeof KATEGORIE)[number][0]
export const NAZWA_KATEGORII = Object.fromEntries(KATEGORIE) as Record<Kategoria, string>

// Lista przed sprzedażą (odhaczane w teczce).
export const LISTA = [
  ["przeglad", "Przegląd techniczny"],
  ["rejestracja", "Rejestracja / tablice"],
  ["kluczyki", "Komplet kluczyków"],
  ["ksiazka", "Książka serwisowa / historia"],
  ["czyszczenie", "Czyszczenie i przygotowanie"],
  ["zdjecia", "Zdjęcia do ogłoszenia"],
  ["otomoto", "Ogłoszenie na Otomoto"],
  ["facebook", "Ogłoszenie na Facebooku"],
] as const

export type MojeAuto = {
  id: string
  utworzono: string
  zmieniono: string
  status: Status
  nazwa: string
  rok: number | null
  vin: string | null
  przebieg_km: number | null
  zrodlo: "auto1" | "dania" | "inne"
  zrodlo_id: string | null
  link: string | null
  zakup_kwota: number | null
  zakup_waluta: Wal
  zakup_data: string | null
  przyjazd_data: string | null
  wystawienie_kwota: number | null
  min_zysk_kwota: number | null
  sprzedaz_waluta: Wal // waluta ceny wystawienia, minimalnego zysku i sprzedaży
  sprzedaz_kwota: number | null
  sprzedaz_data: string | null
  notatka: string
  lista: Record<string, boolean>
}
export type NoweAuto = Partial<Omit<MojeAuto, "id" | "utworzono" | "zmieniono">> & { nazwa: string }

export type Koszt = { id: string; auto_id: string; kategoria: Kategoria; opis: string; kwota: number; waluta: Wal; data: string | null }
// Zdjęcia w trzech grupach; PDF (umowa, faktura) trafia do „Moje”.
export const RODZAJE = [
  ["sprzedawca", "Od sprzedawcy"],
  ["moje", "Moje"],
  ["szkoda", "Szkody"],
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
  koszty: number
  razem: number | null // zakup + koszty
  cena: number | null // cena sprzedaży, a przed sprzedażą cena wystawienia
  zysk: number | null // cena − razem
  zakonczone: boolean // zysk z prawdziwej sprzedaży
}

export function rachunek(a: MojeAuto, koszty: Koszt[], kurs: number, na: Wal): Rachunek {
  const zakup = przelicz(a.zakup_kwota, a.zakup_waluta, na, kurs)
  const sumaKosztow = koszty.reduce((s, k) => s + (przelicz(k.kwota, k.waluta, na, kurs) ?? 0), 0)
  const razem = zakup === null ? null : zakup + sumaKosztow
  const sprzedaz = przelicz(a.sprzedaz_kwota, a.sprzedaz_waluta, na, kurs)
  const cena = sprzedaz ?? przelicz(a.wystawienie_kwota, a.sprzedaz_waluta, na, kurs)
  const zysk = razem === null || cena === null ? null : cena - razem
  return { zakup, koszty: sumaKosztow, razem, cena, zysk, zakonczone: sprzedaz !== null }
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

// Daty po polsku: „07.11.2026” ⇄ „2026-11-07”. Puste albo błędne → null.
export const naPolska = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "")
export function zPolskiej(tekst: string): string | null {
  const m = tekst.trim().match(/^(\d{1,2})[.\-/ ](\d{1,2})[.\-/ ](\d{2}|\d{4})$/)
  if (!m) return null
  const rok = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  const d = new Date(Date.UTC(rok, Number(m[2]) - 1, Number(m[1])))
  if (d.getUTCDate() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1) return null
  return d.toISOString().slice(0, 10)
}

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
  ...Object.fromEntries((["zakup_kwota", "wystawienie_kwota", "min_zysk_kwota", "sprzedaz_kwota"] as const).map((k) => [k, a[k] === null ? null : Number(a[k])])),
})

export async function pobierzWszystko(): Promise<{ auta: MojeAuto[]; koszty: Koszt[]; zdjecia: Zdjecie[] }> {
  const [auta, koszty, zdjecia] = await Promise.all([
    supabase.from("moje_auta").select("*").order("utworzono", { ascending: false }),
    supabase.from("koszty").select("*").order("utworzono"),
    supabase.from("zdjecia").select("*").order("kolejnosc").order("utworzono"),
  ])
  return {
    auta: sprawdz(auta).map(liczby),
    koszty: sprawdz(koszty).map((k: Koszt) => ({ ...k, kwota: Number(k.kwota) })),
    zdjecia: sprawdz(zdjecia),
  }
}

export const dodajAuto = async (a: NoweAuto) => liczby(sprawdz(await supabase.from("moje_auta").insert(a).select().single()))
export const zmienAuto = async (id: string, z: Partial<MojeAuto>) => liczby(sprawdz(await supabase.from("moje_auta").update(z).eq("id", id).select().single()))
export async function usunAuto(id: string, zdjecia: Zdjecie[]) {
  const sciezki = zdjecia.filter((z) => z.auto_id === id).map((z) => z.sciezka)
  if (sciezki.length) await supabase.storage.from("moje-auta").remove(sciezki)
  sprawdz(await supabase.from("moje_auta").delete().eq("id", id))
}
export const dodajKoszt = async (k: Omit<Koszt, "id">) => {
  const r: Koszt = sprawdz(await supabase.from("koszty").insert(k).select().single())
  return { ...r, kwota: Number(r.kwota) }
}
export const usunKoszt = async (id: string) => void sprawdz(await supabase.from("koszty").delete().eq("id", id))
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

export async function przeniesStare(): Promise<number> {
  const stare = stareAuta()
  if (!stare.length) return 0
  sprawdz(await supabase.from("moje_auta").insert(stare.map((a) => ({
    nazwa: a.nazwa || a.auto1 || "Auto",
    zrodlo: a.auto1 ? "auto1" : "inne",
    zrodlo_id: a.auto1 || null,
    status: STARY_STATUS[a.status] ?? "kupione",
    zakup_kwota: a.zakupEur, zakup_waluta: "EUR", zakup_data: a.zakupData,
    przyjazd_data: a.przyjazd,
    wystawienie_kwota: a.wystawienie, sprzedaz_kwota: a.sprzedaz, sprzedaz_waluta: "PLN", sprzedaz_data: a.sprzedazData,
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
    nazwa: r.title || r.id,
    rok: r._year ?? null,
    vin: r.dania?.vin ?? null,
    przebieg_km: r.km,
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
