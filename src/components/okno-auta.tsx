import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { fmt, kwota, offersLabel, specyfikacjaAuta, tekstFacebook, tekstWhatsApp, type Waluta, type Wiersz } from "@/lib/auta"

function Tekst({ tresc }: { tresc: string }) {
  const [skopiowano, ustaw] = React.useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Textarea readOnly rows={9} value={tresc} />
      <Button variant="outline" onClick={() => navigator.clipboard.writeText(tresc).then(() => ustaw(true))}>
        {skopiowano ? "Skopiowano" : "Kopiuj"}
      </Button>
    </div>
  )
}

export function OknoAuta({ auto, waluta, zamknij }: { auto: Wiersz | null; waluta: Waluta; zamknij: () => void }) {
  return (
    <Dialog open={auto !== null} onOpenChange={(open) => !open && zamknij()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        {auto && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{auto.title || auto.id}</DialogTitle>
              <DialogDescription>{auto.id} · {auto._label}{auto.unroadworthy ? " · niezdatne do jazdy" : ""}</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {[...specyfikacjaAuta(auto),
                ["Auto1", fmt(kwota(auto, "a", waluta))], ["Otomoto", fmt(kwota(auto, "o", waluta))],
                ["Różnica", fmt(kwota(auto, "d", waluta))], ["Ofert", offersLabel(auto)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-2">
              {auto.auto1_url && <Button asChild variant="outline" className="flex-1"><a href={auto.auto1_url} target="_blank" rel="noopener">Auto1</a></Button>}
              {auto.search_url && <Button asChild variant="outline" className="flex-1"><a href={auto.search_url} target="_blank" rel="noopener">Otomoto</a></Button>}
            </div>
            <Tabs defaultValue="whatsapp">
              <TabsList>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
              </TabsList>
              <TabsContent value="whatsapp"><Tekst tresc={tekstWhatsApp(auto)} /></TabsContent>
              <TabsContent value="facebook"><Tekst tresc={tekstFacebook(auto)} /></TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
