const AUTH_PAGES = ["/sign-in", "/sign-up"] as const;

export function sanitizeNextPath(candidate: string | null | undefined, fallback = "/dashboard") {
  if (!candidate) return fallback;

  const nextPath = candidate.trim();

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }

  if (
    AUTH_PAGES.some(
      (page) =>
        nextPath === page || nextPath.startsWith(`${page}/`) || nextPath.startsWith(`${page}?`),
    )
  ) {
    return fallback;
  }

  return nextPath;
}

export function buildAuthPath(authPath: "/sign-in" | "/sign-up", nextPath: string) {
  return `${authPath}?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}
