import * as React from "react"

import { AppSidebar, STRONY } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { wczytajDane, type Dane } from "@/lib/dane"
import { Auto1 } from "@/pages/auto1"
import { Home } from "@/pages/home"
import { Wycena } from "@/pages/wycena"

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
  React.useEffect(() => {
    wczytajDane().then(ustawDane).catch(() => ustawBlad(true))
  }, [])

  const wymagaDanych = strona !== "wycena"
  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 56)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar strona={strona} variant="inset" />
      <SidebarInset>
        <SiteHeader tytul={STRONY.find((s) => s.id === strona)?.tytul ?? ""} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          {wymagaDanych && blad && <p className="text-destructive">Nie udało się wczytać danych. Odśwież stronę.</p>}
          {wymagaDanych && !blad && !dane && <p className="text-muted-foreground">Wczytuję dane…</p>}
          {strona === "home" && dane && <Home dane={dane} />}
          {strona === "auto1" && dane && <Auto1 dane={dane} />}
          {strona === "wycena" && <Wycena />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
