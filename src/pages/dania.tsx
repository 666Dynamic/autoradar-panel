import * as React from "react"

import { wczytajDania } from "@/lib/dania"
import type { Dane } from "@/lib/dane"
import { Auto1 } from "@/pages/auto1"

// Dania (Auto Midt): lista z porannego kroku skanera (dania.json) w tabeli i oknie Auto1.
export function Dania() {
  const [dane, ustawDane] = React.useState<Dane | null>(null)
  const [blad, ustawBlad] = React.useState(false)
  React.useEffect(() => {
    wczytajDania().then(ustawDane).catch(() => ustawBlad(true))
  }, [])
  if (blad) return <p className="text-destructive">Nie udało się wczytać listy z Danii. Odśwież stronę.</p>
  if (!dane) return <p className="text-muted-foreground">Wczytuję listę z Danii…</p>
  return <Auto1 dane={dane} dania />
}
