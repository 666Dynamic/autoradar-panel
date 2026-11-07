import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { Logowanie } from "@/components/logowanie"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Logowanie>
          <App />
        </Logowanie>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
