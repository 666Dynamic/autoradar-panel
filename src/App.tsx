import * as React from "react"

import { AppSidebar, STRONY } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { wczytajDane, type Dane } from "@/lib/dane"
// Podstrony ładowane dopiero przy pierwszym wejściu (mniejszy plik startowy, szybciej na telefonie).
const Auto1 = React.lazy(() => import("@/pages/auto1").then((m) => ({ default: m.Auto1 })))
const Dania = React.lazy(() => import("@/pages/dania").then((m) => ({ default: m.Dania })))
const Home = React.lazy(() => import("@/pages/home").then((m) => ({ default: m.Home })))
const MojeAuta = React.lazy(() => import("@/pages/moje-auta").then((m) => ({ default: m.MojeAuta })))
const Ogloszenia = React.lazy(() => import("@/pages/ogloszenia").then((m) => ({ default: m.Ogloszenia })))
// Wycena potrzebuje swoich starych skryptów (public/wycena): ładowane dopiero przy wejściu w Wycenę.
const skrypt = (plik: string) => new Promise((ok, blad) => {
  const s = document.createElement("script")
  s.src = import.meta.env.BASE_URL + plik
  s.onload = ok
  s.onerror = blad
  document.head.append(s)
})
const Wycena = React.lazy(async () => {
  await Promise.all([skrypt("wycena/catalog.js"), skrypt("wycena/filtry.js")])
  return { default: (await import("@/pages/wycena")).Wycena }
})
// Nocne dane Auto1 (5,9 MB) tylko dla tych podstron; Dania i Wycena ich nie potrzebują.
const Z_DANYMI = ["home", "auto1", "moje-auta", "ogloszenia"]

const zAdresu = () => {
  const id = window.location.hash.replace("#/", "")
  return STRONY.some((s) => s.id === id) ? id : "home"
}

export function App() {
  const [strona, ustawStrone] = React.useState(zAdresu)
  const [dane, ustawDane] = React.useState<Dane | null>(null)
  const [blad, ustawBlad] = React.useState(false)

  React.useEffect(() => {
    const zmien = () => ustawStrone(zAdresu())
    window.addEventListener("hashchange", zmien)
    return () => window.removeEventListener("hashchange", zmien)
  }, [])
  const [odwiedzone, ustawOdwiedzone] = React.useState(() => new Set([strona]))
  if (!odwiedzone.has(strona)) ustawOdwiedzone(new Set(odwiedzone).add(strona))
  const potrzebneDane = Z_DANYMI.some((s) => odwiedzone.has(s))
  React.useEffect(() => {
    if (!potrzebneDane) return
    let wczytane = Date.now()
    wczytajDane().then(ustawDane).catch(() => ustawBlad(true))
    // Karta otwarta przez noc: po powrocie do niej strona bierze dane z nowego skanu.
    const odswiez = () => {
      if (document.visibilityState !== "visible" || Date.now() - wczytane < 3600000) return
      wczytane = Date.now()
      wczytajDane().then(ustawDane).catch(() => {})
    }
    document.addEventListener("visibilitychange", odswiez)
    return () => document.removeEventListener("visibilitychange", odswiez)
  }, [potrzebneDane])

  const wymagaDanych = strona !== "wycena" && strona !== "moje-auta" && strona !== "ogloszenia" && strona !== "dania"
  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 56)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar strona={strona} variant="inset" />
      <SidebarInset className="min-w-0">
        <SiteHeader tytul={STRONY.find((s) => s.id === strona)?.tytul ?? ""} />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6">
          <React.Suspense fallback={<p className="text-muted-foreground">Wczytuję…</p>}>
          {wymagaDanych && blad && <p className="text-destructive">Nie udało się wczytać danych. Odśwież stronę.</p>}
          {wymagaDanych && !blad && !dane && <p className="text-muted-foreground">Wczytuję dane…</p>}
          {strona === "home" && dane && <Home key={dane.meta.stamp_iso} dane={dane} />}
          {/* Auto1 i Wycena zostają w pamięci, żeby filtry i wpisane dane przetrwały przejście między stronami. */}
          {dane && odwiedzone.has("auto1") && <div className={strona === "auto1" ? "flex min-w-0 flex-1 flex-col gap-4" : "hidden"}><Auto1 dane={dane} /></div>}
          {odwiedzone.has("wycena") && <div className={strona === "wycena" ? "contents" : "hidden"}><Wycena /></div>}
          {/* Moje auta działają bez nocnych danych; z danymi numer Auto1 dostaje link. */}
          {strona === "moje-auta" && <MojeAuta dane={dane} />}
          {/* Ogłoszenia też bez nocnych danych; z danymi można wczytać auto po numerze. */}
          {strona === "ogloszenia" && <Ogloszenia dane={dane} />}
          {/* Dania: lista Auto Midt z porannego kroku (dania.json) w tabeli Auto1; zostaje w pamięci jak Auto1. */}
          {odwiedzone.has("dania") && <div className={strona === "dania" ? "flex min-w-0 flex-1 flex-col gap-4" : "hidden"}><Dania /></div>}
          </React.Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
