const AUTH_PAGES = ["/sign-in", "/sign-up"] as const;
const hasControlCharacters = (value: string) =>
  Array.from(value).some((char) => char.charCodeAt(0) < 32);

export function sanitizeNextPath(candidate: string | null | undefined, fallback = "/dashboard") {
  if (!candidate) return fallback;

  const nextPath = candidate.trim();

  if (
    nextPath.length > 2048 ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//") ||
    nextPath.includes("\\") ||
    hasControlCharacters(nextPath)
  ) {
    return fallback;
  }

  let normalized: URL;
  try {
    normalized = new URL(nextPath, "https://vincere.invalid");
    const decoded = decodeURIComponent(normalized.pathname);
    if (decoded.startsWith("//") || decoded.includes("\\") || hasControlCharacters(decoded))
      return fallback;
  } catch {
    return fallback;
  }

  if (
    AUTH_PAGES.some(
      (page) => normalized.pathname === page || normalized.pathname.startsWith(`${page}/`),
    )
  ) {
    return fallback;
  }

  return `${normalized.pathname}${normalized.search}${normalized.hash}`;
}

export function buildAuthPath(authPath: "/sign-in" | "/sign-up", nextPath: string) {
  return `${authPath}?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}
