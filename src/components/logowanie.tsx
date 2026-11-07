import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EMAIL_PANELU, supabase } from "@/lib/supabase"

// Cały panel za jednym wspólnym hasłem. Sesja zostaje w przeglądarce, więc hasło wpisuje się raz na urządzenie.
export function Logowanie({ children }: { children: React.ReactNode }) {
  const [sesja, ustawSesje] = React.useState<Session | null | undefined>(undefined)
  const [haslo, ustawHaslo] = React.useState("")
  const [blad, ustawBlad] = React.useState("")
  const [czekam, ustawCzekam] = React.useState(false)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => ustawSesje(data.session))
    const { data } = supabase.auth.onAuthStateChange((_, s) => ustawSesje(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sesja === undefined) return null
  if (sesja) return <>{children}</>

  const zaloguj = async (e: React.FormEvent) => {
    e.preventDefault()
    ustawCzekam(true)
    ustawBlad("")
    const { error } = await supabase.auth.signInWithPassword({ email: EMAIL_PANELU, password: haslo })
    ustawCzekam(false)
    if (error) ustawBlad(error.message.includes("Invalid") ? "Złe hasło." : "Nie udało się połączyć. Spróbuj jeszcze raz.")
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>AutoRadar</CardTitle>
          <CardDescription>Wpisz hasło do panelu.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={zaloguj}>
            {/* Ukryte pole z adresem konta: menedżer haseł zapamięta hasło do właściwego konta. */}
            <input type="email" name="email" autoComplete="username" value={EMAIL_PANELU} readOnly hidden />
            <div className="flex flex-col gap-1">
              <Label htmlFor="haslo">Hasło</Label>
              <Input id="haslo" type="password" autoComplete="current-password" autoFocus value={haslo} onChange={(e) => ustawHaslo(e.target.value)} />
            </div>
            {blad && <p className="text-sm text-destructive">{blad}</p>}
            <Button type="submit" disabled={!haslo || czekam}>{czekam ? "Loguję…" : "Wejdź"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const wyloguj = () => supabase.auth.signOut()
