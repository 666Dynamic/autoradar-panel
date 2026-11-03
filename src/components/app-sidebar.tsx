import * as React from "react"
import { CalculatorIcon, CarFrontIcon, CarIcon, HomeIcon, MegaphoneIcon, RadarIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// Nowa podstrona to jeden wpis tutaj i jeden w App.tsx.
export const STRONY = [
  { id: "home", tytul: "Home", ikona: <HomeIcon /> },
  { id: "auto1", tytul: "Auto1", ikona: <CarIcon /> },
  { id: "wycena", tytul: "Wycena", ikona: <CalculatorIcon /> },
  { id: "moje-auta", tytul: "Moje auta", ikona: <CarFrontIcon /> },
  { id: "ogloszenia", tytul: "Ogłoszenia", ikona: <MegaphoneIcon /> },
]

export function AppSidebar({ strona, ...props }: { strona: string } & React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="#/home">
                <RadarIcon className="size-5!" />
                <span className="text-base font-semibold">AutoRadar</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {STRONY.map((s) => (
                <SidebarMenuItem key={s.id}>
                  <SidebarMenuButton asChild isActive={strona === s.id} tooltip={s.tytul}>
                    <a href={`#/${s.id}`} onClick={() => setOpenMobile(false)}>
                      {s.ikona}
                      <span>{s.tytul}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
