// @ts-nocheck -- This entry point runs in the Supabase Deno runtime.
import { createClient } from "npm:@supabase/supabase-js@2.99.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2.99.1/cors";
import { createDeleteAccountHandler } from "./handler.ts";

export default {
  fetch: async (request: Request) => {
    const url = Deno.env.get("SUPABASE_URL")!;
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, options);
    const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, options);
    return createDeleteAccountHandler(
      {
        async getUser(token) {
          const { data, error } = await auth.auth.getUser(token);
          return error ? null : data.user;
        },
        async isReady() {
          const { data, error } = await admin.rpc("account_deletion_ready");
          return !error && data === true;
        },
        async verifyPassword(email, password) {
          const { data, error } = await auth.auth.signInWithPassword({ email, password });
          return error ? null : data.user;
        },
        async revokeSessions(token) {
          const { error } = await admin.auth.admin.signOut(token, "global");
          if (error) throw error;
        },
        async deleteUser(id) {
          const { error } = await admin.auth.admin.deleteUser(id);
          if (error) throw error;
        },
      },
      corsHeaders,
    )(request);
  },
};
