import type * as React from "react"
import { CheckIcon, PlusCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Wybor } from "@/components/wybor"
import { cn } from "@/lib/utils"

function Przycisk({ tytul, wybrane, ...reszta }: { tytul: string; wybrane: string[] } & React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="sm" className="border-dashed" {...reszta}>
      <PlusCircleIcon />
      {tytul}
      {wybrane.length > 0 && (
        <>
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
          {wybrane.length > 2 ? <Badge variant="secondary">{wybrane.length}</Badge> : wybrane.map((w) => <Badge key={w} variant="secondary">{w}</Badge>)}
        </>
      )}
    </Button>
  )
}

export function FiltrLista({ tytul, opcje, wybrane, zmien, jeden }: { tytul: string; opcje: [string, string][]; wybrane: string[]; zmien: (v: string[]) => void; jeden?: boolean }) {
  const przelacz = (id: string) => zmien(wybrane.includes(id) ? wybrane.filter((x) => x !== id) : jeden ? [id] : [...wybrane, id])
  return (
    <Popover>
      <PopoverTrigger asChild><Przycisk tytul={tytul} wybrane={opcje.filter(([id]) => wybrane.includes(id)).map(([, n]) => n)} /></PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {opcje.length > 7 && <CommandInput placeholder={tytul} />}
          <CommandList>
            <CommandEmpty>Brak wyników</CommandEmpty>
            <CommandGroup>
              {opcje.map(([id, nazwa]) => (
                <CommandItem key={id} value={nazwa} onSelect={() => przelacz(id)}>
                  <div className={cn("flex size-4 items-center justify-center rounded-[4px] border", wybrane.includes(id) ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                    {wybrane.includes(id) && <CheckIcon className="size-3 text-primary-foreground" />}
                  </div>
                  {nazwa}
                </CommandItem>
              ))}
            </CommandGroup>
            {wybrane.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup><CommandItem className="justify-center" onSelect={() => zmien([])}>Wyczyść</CommandItem></CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function FiltrZakres({ tytul, opcje, od, do: doo, zmienOd, zmienDo }: { tytul: string; opcje: [string, string][]; od: string; do: string; zmienOd: (v: string) => void; zmienDo: (v: string) => void }) {
  const opis = (v: string) => opcje.find(([id]) => id === v)?.[1] ?? v
  const wybrane = od || doo ? [`${od ? opis(od) : "…"} – ${doo ? opis(doo) : "…"}`] : []
  return (
    <Popover>
      <PopoverTrigger asChild><Przycisk tytul={tytul} wybrane={wybrane} /></PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1"><Label>Od</Label><Wybor puste="dowolnie" value={od} opcje={opcje} onChange={zmienOd} /></div>
          <div className="flex flex-col gap-1"><Label>Do</Label><Wybor puste="dowolnie" value={doo} opcje={opcje} onChange={zmienDo} /></div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
