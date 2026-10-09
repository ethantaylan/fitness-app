import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isNativeApp } from "./native";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquante.");
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "", {
  auth: {
    flowType: isNativeApp ? "pkce" : "implicit",
    detectSessionInUrl: !isNativeApp,
  },
});
