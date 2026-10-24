import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "./supabase";
import { getAppRedirectUrl } from "./appUrl";
import { nativeAuthCodeGuard, parseNativeAuthUrl } from "./nativeAuth";

interface NativeSignInPlugin {
  apple(options: {
    nonce: string;
    state: string;
  }): Promise<{ identityToken: string; state: string }>;
  oauth(options: { url: string }): Promise<{ url: string }>;
}
const NativeSignIn = registerPlugin<NativeSignInPlugin>("NativeSignIn");
export const supportsNativeApple = Capacitor.getPlatform() === "ios";

export async function hashNonce(nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signInWithSocial(provider: "apple" | "google", nextPath: string) {
  if (provider === "apple") {
    if (!supportsNativeApple) throw new Error("La connexion Apple est disponible dans l’app iOS.");
    const nonce = crypto.randomUUID();
    const state = crypto.randomUUID();
    const credential = await NativeSignIn.apple({ nonce: await hashNonce(nonce), state });
    if (credential.state !== state || !credential.identityToken)
      throw new Error("La réponse Apple n’a pas pu être vérifiée. Réessaie.");
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce,
    });
    if (error) throw error;
    return;
  }
  const native = Capacitor.isNativePlatform();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getAppRedirectUrl(nextPath), skipBrowserRedirect: native },
  });
  if (error) throw error;
  if (!native) return;
  if (!data.url) throw new Error("Impossible d’ouvrir la connexion Google.");
  const response = await NativeSignIn.oauth({ url: data.url });
  const callback = parseNativeAuthUrl(response.url);
  if (!callback) throw new Error("La connexion Google n’a pas abouti. Réessaie.");
  if (!(await nativeAuthCodeGuard.claim(callback.code, localStorage))) return;
  const exchanged = await supabase.auth.exchangeCodeForSession(callback.code);
  if (exchanged.error) throw exchanged.error;
}

export function isSocialAuthCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "AUTH_CANCELLED"
  );
}
