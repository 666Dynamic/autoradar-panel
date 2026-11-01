// Pamięć tylko w tej przeglądarce. Prywatne okno może ją blokować, strona działa wtedy bez niej.
export function odczytaj(klucz: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(klucz) ?? "[]")
  } catch {
    return []
  }
}

export function zapisz(klucz: string, wartosci: string[]) {
  try {
    localStorage.setItem(klucz, JSON.stringify(wartosci.slice(-2000)))
  } catch {
    // bez pamięci strona działa dalej
  }
}

export type Oferta = { zdjecia?: string[]; whatsapp?: string; facebook?: string }

// Wybrane zdjęcia i poprawione teksty ofert.
export function odczytajOferty(): Record<string, Oferta> {
  try {
    return JSON.parse(localStorage.getItem("ar_oferty") ?? "{}")
  } catch {
    return {}
  }
}

export function zapiszOferte(id: string, zmiany: Oferta) {
  const oferty = odczytajOferty()
  oferty[id] = { ...oferty[id], ...zmiany }
  try {
    localStorage.setItem("ar_oferty", JSON.stringify(oferty))
  } catch {
    // bez pamięci strona działa dalej
  }
}
