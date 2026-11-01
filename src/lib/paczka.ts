import type JSZip from "jszip"

import { dodatki, fmt, FUEL, GEAR, hpLabel, kmLabel, litersLabel, offersLabel, regLabel, specyfikacjaAuta, tekstFacebook, tekstWhatsApp, wyposazenie, type Wiersz } from "@/lib/auta"
import { wczytajSzczegoly, type Szczegoly } from "@/lib/dane"
import { odczytajOferty } from "@/lib/pamiec"

// Serwer zdjęć Auto1 nie pozwala stronie czytać plików, więc idą przez pośrednika worker.mjs.
const POSREDNIK = "https://wycena-aut.hfnvflmwxetmfpc.workers.dev/?zdjecie="
const NARAZ = 4

export const zdjeciaAuta = (r: Wiersz, s?: Szczegoly) => (s?.images.length ? s.images : r.image ? [r.image] : [])
const nazwa = (tekst: string) => tekst.normalize("NFD").replace(/ł/g, "l").replace(/Ł/g, "L").replace(/[^A-Za-z0-9 .-]/g, "").trim().slice(0, 60) || "auto"

function trescOferty(r: Wiersz, s?: Szczegoly) {
  const sprzet = wyposazenie(s)
  return [r.title, r.id, "", ...specyfikacjaAuta(r).filter(([, v]) => v !== "—").map(([k, v]) => `${k}: ${v}`),
    ...dodatki(s).map(([k, v]) => `${k}: ${v}`),
    ...(sprzet.length ? ["", "Wyposażenie:", ...sprzet.map((x) => `- ${x}`)] : [])].join("\n")
}

async function lista(auta: Wiersz[], szczegoly: Record<string, Szczegoly>) {
  const { default: zapisz } = await import("write-excel-file/browser")
  const naglowki = ["Numer", "Auto", "Rocznik", "Pojemność", "Przebieg", "Moc", "Paliwo", "Skrzynia", "Auto1 (EUR)", "Otomoto (EUR)", "Różnica (EUR)", "Ofert", "Typ aukcji", "Link Otomoto", "Link Auto1", "Raport Auto1"]
  const komorka = (value: string | null | undefined) => ({ value: value ?? "" })
  const wiersze = [
    naglowki.map((value) => ({ value, fontWeight: "bold" as const })),
    ...auta.map((r) => [r.id, r.title, regLabel(r), litersLabel(r), kmLabel(r), hpLabel(r), (r.fuel && FUEL[r.fuel]) || r.fuel, (r.gear && GEAR[r.gear]) || r.gear,
      fmt(r.a_eur), fmt(r.o_eur), fmt(r.d_eur), offersLabel(r), r._label, r.search_url, r.auto1_url, szczegoly[r.id]?.report].map(komorka)),
  ]
  return zapisz(wiersze as never).toBlob()
}

async function pobierzZdjecia(zadania: { url: string; folder: JSZip; plik: string }[], postep: (gotowe: number) => void) {
  let nastepne = 0
  let gotowe = 0
  let bledy = 0
  const robotnik = async () => {
    while (nastepne < zadania.length) {
      const z = zadania[nastepne++]
      try {
        const odpowiedz = await fetch(POSREDNIK + encodeURIComponent(z.url))
        if (!odpowiedz.ok) throw new Error(String(odpowiedz.status))
        z.folder.file(z.plik, await odpowiedz.blob())
      } catch {
        bledy++
      }
      postep(++gotowe)
    }
  }
  await Promise.all(Array.from({ length: NARAZ }, robotnik))
  return bledy
}

// Folder marki, w nim folder auta: zdjęcia, oferta i teksty do wklejenia. Ceny zakupu i linki są tylko w lista.xlsx.
export async function pobierzPaczke(auta: Wiersz[], postep: (gotowe: number, razem: number) => void) {
  const { default: Zip } = await import("jszip")
  const zip = new Zip()
  const szczegoly = await wczytajSzczegoly()
  const oferty = odczytajOferty()
  const zadania: { url: string; folder: JSZip; plik: string }[] = []
  for (const r of auta) {
    const s = szczegoly[r.id]
    const o = oferty[r.id]
    const folder = zip.folder(nazwa(r.make ?? "Inne"))!.folder(`${nazwa(r.title)} ${r.id}`)!
    folder.file("oferta.txt", trescOferty(r, s))
    folder.file("whatsapp.txt", o?.whatsapp ?? tekstWhatsApp(r, s))
    folder.file("facebook.txt", o?.facebook ?? tekstFacebook(r, s))
    const wybrane = o?.zdjecia ?? zdjeciaAuta(r, s)
    wybrane.forEach((url, i) => zadania.push({ url, folder, plik: `${String(i + 1).padStart(2, "0")}.jpg` }))
  }
  zip.file("lista.xlsx", await lista(auta, szczegoly))
  postep(0, zadania.length)
  const bledy = await pobierzZdjecia(zadania, (gotowe) => postep(gotowe, zadania.length))
  const plik = await zip.generateAsync({ type: "blob" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(plik)
  link.download = auta.length === 1 ? `${nazwa(auta[0].title)}.zip` : "autoradar-oferty.zip"
  link.click()
  URL.revokeObjectURL(link.href)
  return { zdjecia: zadania.length, bledy }
}
