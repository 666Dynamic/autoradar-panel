import { describe, expect, it } from "vitest"

import type { Auto } from "@/lib/dane"
import { bezGeneracji, najczestsze } from "@/lib/statystyki"

const auto = (make: string, model: string, fuel = "diesel", gear = "manual", reg = "2016-05") => ({ make, model, fuel, gear, reg }) as unknown as Auto

describe("Statystyki Auto1", () => {
  it("łączy generacje modelu, ale nie rusza Tesli", () => {
    expect(bezGeneracji("Volkswagen", "Golf VII")).toBe("Golf")
    expect(bezGeneracji("Volkswagen", "Golf VII Sportsvan")).toBe("Golf Sportsvan")
    expect(bezGeneracji("Renault", "Clio V")).toBe("Clio")
    expect(bezGeneracji("Tesla", "Model X")).toBe("Model X")
    expect(bezGeneracji("BMW", "X5")).toBe("X5")
  })
  it("liczy modele, marki i typy", () => {
    const rows = [auto("Volkswagen", "Golf VII"), auto("Volkswagen", "Golf VIII", "petrol", "duplex", "2021-01"), auto("Volkswagen", "Golf VII"), auto("Seat", "Leon")]
    expect(najczestsze(rows, "modele")).toEqual([{ nazwa: "Volkswagen Golf", ile: 3 }, { nazwa: "Seat Leon", ile: 1 }])
    expect(najczestsze(rows, "marki")[0]).toEqual({ nazwa: "Volkswagen", ile: 3 })
    expect(najczestsze(rows, "typy")[0]).toEqual({ nazwa: "Volkswagen Golf", opis: "diesel · manualna · 2015–2019", ile: 2 })
  })
})
