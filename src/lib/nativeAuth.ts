import { NATIVE_AUTH_SCHEME } from "./native";
import { sanitizeNextPath } from "./authRedirect";

/** Suppress a replayed launch URL, including after the WebView reloads. */
export class NativeAuthCodeGuard {
  private readonly handled = new Set<string>();

  async claim(
    code: string,
    storage: Pick<Storage, "getItem" | "setItem"> | null,
  ): Promise<boolean> {
    if (this.handled.has(code)) return false;
    // Claim synchronously so appUrlOpen and getLaunchUrl cannot exchange the same code together.
    this.handled.add(code);
    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
      const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      const key = "vincere-last-native-auth-code";
      if (storage?.getItem(key) === fingerprint) return false;
      // Store only a fingerprint, never the authentication code or session tokens.
      storage?.setItem(key, fingerprint);
    } catch {
      // Authentication still works when persistent storage or Web Crypto is unavailable.
    }
    return true;
  }
}

export function parseNativeAuthUrl(raw: string): { code: string; next: string } | null {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== `${NATIVE_AUTH_SCHEME}:` ||
      url.hostname !== "auth" ||
      !!url.username ||
      !!url.password ||
      !!url.port ||
      url.pathname !== "/callback"
    )
      return null;
    const code = url.searchParams.get("code");
    if (!code || code.length > 2048 || url.searchParams.getAll("code").length !== 1) return null;
    const next = sanitizeNextPath(url.searchParams.get("next"));
    return { code, next };
  } catch {
    return null;
  }
}

export const nativeAuthCodeGuard = new NativeAuthCodeGuard();
