const APP_URL = import.meta.env.VITE_APP_URL as string | undefined;

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/+$/, "");
}

export function getAppBaseUrl(): string {
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
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalizedPath}`;
}
