// @ts-nocheck -- Deno Edge runtime, outside Vite's TypeScript module resolution.
import { createClient } from "npm:@supabase/supabase-js@2.99.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2.99.1/cors";
import { normalizeExerciseName } from "../../../src/lib/exerciseGuideKey.ts";
import { findBuiltinGuide, resolveDemo } from "./library.ts";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") return json({ ok: true });
    if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
    try {
      if (Number(req.headers.get("content-length")) > 2048)
        return json({ error: "Requête trop longue." }, 413);
      const raw = await req.text();
      if (raw.length > 2048) return json({ error: "Requête trop longue." }, 413);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Requête invalide." }, 400);
      }
      if (
        !body ||
        typeof body.name !== "string" ||
        body.name.trim().length < 2 ||
        body.name.length > 160 ||
        /[\r\n<>]/.test(body.name) ||
        !["lookup", "request"].includes(body.action)
      )
        return json({ error: "Exercice invalide." }, 400);
      const url = Deno.env.get("SUPABASE_URL")!;
      const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const {
        data: { user },
        error: authError,
      } = await auth.auth.getUser();
      if (authError || !user) return json({ error: "Connexion requise." }, 401);
      // Existing local assets are authoritative and never enter the missing queue.
      const builtin = findBuiltinGuide(body.name);
      if (builtin) return json({ status: "ready", guide: builtin });
      const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return json(
        await resolveDemo(
          admin,
          user.id,
          body.name,
          normalizeExerciseName(body.name),
          body.action === "request",
        ),
      );
    } catch {
      return json({ error: "Bibliothèque momentanément indisponible." }, 503);
    }
  },
};
