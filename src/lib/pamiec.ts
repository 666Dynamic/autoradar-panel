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

// Koszt transportu w euro, jeden dla wszystkich aut; ustawia właściciel w oknie auta.
export function odczytajTransport(): number | null {
  try {
    const n = Number(localStorage.getItem("ar_transport_eur"))
    return localStorage.getItem("ar_transport_eur") !== null && Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

export function zapiszTransport(eur: number | null) {
  try {
    if (eur === null) localStorage.removeItem("ar_transport_eur")
    else localStorage.setItem("ar_transport_eur", String(eur))
  } catch {
    // bez pamięci strona działa dalej
  }
}
