import { z } from "zod"

// Moje auta są tylko w tej przeglądarce: repo i strona są publiczne, więc nic stąd nie idzie na serwer.
const KLUCZ = "ar_moje_auta"

export const STATUSY = [
  ["kupione", "Kupione"],
  ["w_drodze", "W drodze"],
  ["na_placu", "Na placu"],
  ["sprzedane", "Sprzedane"],
] as const

const liczba = z.number().finite().nonnegative().nullable().catch(null)
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null)

const MojeAutoSchema = z.object({
  id: z.string().min(1),
  nazwa: z.string(),
  auto1: z.string().catch(""),
  zakupEur: liczba,
  zakupData: data,
  przyjazdPlan: data,
  przyjazd: data,
  wystawienie: liczba,
  sprzedazData: data,
  sprzedaz: liczba,
  status: z.enum(["kupione", "w_drodze", "na_placu", "sprzedane"]).catch("kupione"),
  notatka: z.string().catch(""),
})

export type MojeAuto = z.infer<typeof MojeAutoSchema>
export type Status = MojeAuto["status"]

export function odczytajAuta(): MojeAuto[] {
  try {
    return z.array(MojeAutoSchema).catch([]).parse(JSON.parse(localStorage.getItem(KLUCZ) ?? "[]"))
  } catch {
    return []
  }
}

export function zapiszAuta(auta: MojeAuto[]) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(auta))
    return true
  } catch {
    return false
  }
}

// Plik kopii: auta o tym samym id zastępuje, nowe dopisuje, reszty nie rusza.
export function wczytajKopie(tekst: string, obecne: MojeAuto[]): MojeAuto[] | null {
  try {
    const surowe = JSON.parse(tekst)
    const lista = z.array(MojeAutoSchema).parse(Array.isArray(surowe) ? surowe : surowe.auta)
    const zKopii = new Map(lista.map((a) => [a.id, a]))
    return [...obecne.filter((a) => !zKopii.has(a.id)), ...zKopii.values()]
  } catch {
    return null
  }
}

export function plikKopii(auta: MojeAuto[]) {
  return new Blob([JSON.stringify({ wersja: 1, zapisano: new Date().toISOString(), auta }, null, 2)], { type: "application/json" })
}

const dzienMs = 86400000
export const dniMiedzy = (od: string, do_: string) => Math.round((Date.parse(do_) - Date.parse(od)) / dzienMs)
export const dataLabel = (d: string | null) => (d ? d.split("-").reverse().join(".") : "—")
