/**
 * supabase.ts — Client Supabase + intégration Clerk JWT
 *
 * Setup requis (une seule fois) :
 *  1. Ajouter VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
 *  2. Dans le dashboard Clerk → JWT Templates → créer un template nommé "supabase"
 *     avec le secret Supabase comme signing key et ce payload :
 *     { "role": "authenticated", "aud": "authenticated" }
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/react";
import { useMemo } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquante — " +
      "le stockage local (localStorage) reste actif.",
  );
}

const URL = SUPABASE_URL ?? "";
const KEY = SUPABASE_ANON_KEY ?? "";

const AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionFromUrl: false,
} as const;

/** Client non-authentifié (données publiques uniquement) */
export const supabasePublic: SupabaseClient = createClient(URL, KEY, {
  auth: AUTH_OPTIONS,
});

/** Crée un client Supabase authentifié avec un JWT Clerk déjà résolu */
export function getSupabaseClient(token: string | null | undefined): SupabaseClient {
  return createClient(URL, KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: AUTH_OPTIONS,
  });
}

/**
 * Hook React — retourne un client Supabase authentifié en temps réel.
 * À chaque appel réseau, le JWT Clerk est récupéré depuis le template "supabase".
 */
export function useSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient(URL, KEY, {
        global: {
          fetch: async (input, init = {}) => {
            const token = await getToken({ template: "supabase" });
            const headers = new Headers(init.headers);
            if (token) headers.set("Authorization", `Bearer ${token}`);
            return fetch(input, { ...init, headers });
          },
        },
        auth: AUTH_OPTIONS,
      }),
    [getToken],
  );
}
