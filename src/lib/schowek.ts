import { supabase } from "@/lib/supabase"

// Dane nocy leżą w prywatnym schowku Supabase „dane”; czyta je tylko zalogowany panel.
// Serwer wgrywa JSON spakowany gzipem jako <nazwa>.gz (6 MB → kilkaset kB, mniej transferu w darmowym planie).
const SCHOWEK = "dane"
const WAZNOSC_S = 6 * 3600

export async function pobierzJson<T>(nazwa: string): Promise<T> {
  const { data, error } = await supabase.storage.from(SCHOWEK).download(`${nazwa}.gz`, { cacheNonce: String(Date.now()) })
  if (error || !data) throw new Error(error?.message ?? "brak pliku")
  const bajty = new Uint8Array(await data.arrayBuffer())
  // Gdyby po drodze ktoś już rozpakował plik, nie pakujemy go drugi raz.
  if (bajty[0] !== 0x1f || bajty[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(bajty))
  return new Response(new Blob([bajty]).stream().pipeThrough(new DecompressionStream("gzip"))).json()
}

// Podpisane adresy zdjęć (dania/<VIN>/1.jpg) jednym zapytaniem; ścieżka bez adresu zostaje pominięta.
export async function adresyZdjec(sciezki: string[]): Promise<Record<string, string>> {
  const unikalne = [...new Set(sciezki)]
  if (!unikalne.length) return {}
  const { data } = await supabase.storage.from(SCHOWEK).createSignedUrls(unikalne, WAZNOSC_S)
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]))
}
