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
