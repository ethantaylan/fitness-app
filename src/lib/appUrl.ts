import { isNativeApp, NATIVE_AUTH_SCHEME } from "./native";
import { sanitizeNextPath } from "./authRedirect";

const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) || "https://vincere-fitness.netlify.app";

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/+$/, "");
}

export function getAppBaseUrl(): string {
  if (isNativeApp) {
    if (!APP_URL || !APP_URL.startsWith("https://")) {
      throw new Error(
        "Le partage sera disponible lorsque l'adresse publique de Vincere sera configurée.",
      );
    }
    return normalizeBaseUrl(APP_URL);
  }
  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return origin;
    }

    return APP_URL ? normalizeBaseUrl(APP_URL) : origin;
  }

  return APP_URL ? normalizeBaseUrl(APP_URL) : "";
}

export function getAppRedirectUrl(path = "/"): string {
  if (isNativeApp) {
    return `${NATIVE_AUTH_SCHEME}://auth/callback?next=${encodeURIComponent(sanitizeNextPath(path))}`;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalizedPath}`;
}
