import { NATIVE_AUTH_SCHEME } from "./native";
import { sanitizeNextPath } from "./authRedirect";

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
