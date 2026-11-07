import { createClient } from "@supabase/supabase-js"

// Projekt Supabase "autoradar" (Frankfurt). Ten klucz jest publiczny z założenia: bez zalogowania
// baza nic nie pokazuje (reguły RLS), a zakładanie nowych kont jest wyłączone.
const URL = "https://dvtnbsztbdpqbeigbgdp.supabase.co"
const KLUCZ = "sb_publishable_JzInkex1jXOmNUpOVds07g_B5Y7Ejmz"
// Jedno wspólne konto panelu: na ekranie logowania wpisuje się tylko hasło.
export const EMAIL_PANELU = "panel@autoradar.app"

export const supabase = createClient(URL, KLUCZ, { auth: { persistSession: true, autoRefreshToken: true } })
