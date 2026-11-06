import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { wczytajDania } from "@/lib/dania"
import type { Dane } from "@/lib/dane"
import { Auto1 } from "@/pages/auto1"

// Poranny krok Danii idzie codziennie o 05:30 Berlin; starsze niż 30 h dane znaczą, że ostatni ranek się nie udał.
const STARE_GODZINY = 30

// Dania (Auto Midt): lista z porannego kroku skanera (dania.json) w tabeli i oknie Auto1.
export function Dania() {
  const [dane, ustawDane] = React.useState<Dane | null>(null)
  const [blad, ustawBlad] = React.useState(false)
  const [teraz] = React.useState(() => Date.now())
  React.useEffect(() => {
    wczytajDania().then(ustawDane).catch(() => ustawBlad(true))
  }, [])
  if (blad) return <p className="text-destructive">Nie udało się wczytać listy z Danii. Odśwież stronę.</p>
  if (!dane) return <p className="text-muted-foreground">Wczytuję listę z Danii…</p>
  const wiek = (teraz - Date.parse(dane.meta.stamp_iso)) / 3600000
  return (
    <>
      {wiek > STARE_GODZINY && (
        <Alert variant="destructive">
          <AlertTitle>Lista z Danii nieaktualna (sprzed {Math.floor(wiek)} h)</AlertTitle>
          <AlertDescription>Ostatni poranny krok Danii się nie udał albo został zablokowany.</AlertDescription>
        </Alert>
      )}
      <Auto1 dane={dane} dania />
    </>
  )
}
