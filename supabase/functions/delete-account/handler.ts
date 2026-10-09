type Account = { id: string; email?: string };
type Dependencies = {
  getUser: (token: string) => Promise<Account | null>;
  isReady: () => Promise<boolean>;
  verifyPassword: (email: string, password: string) => Promise<Account | null>;
  revokeSessions: (token: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
};

export function createDeleteAccountHandler(deps: Dependencies, headers: HeadersInit = {}) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { ...Object.fromEntries(new Headers(headers)), "Cache-Control": "no-store" },
    });
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return json({ ok: true });
    if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
    const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return json({ error: "Connexion requise." }, 401);
    try {
      const user = await deps.getUser(token);
      if (!user?.email) return json({ error: "Reconnecte-toi avant de supprimer le compte." }, 401);
      const raw = await request.text();
      if (raw.length > 8192) return json({ error: "Requête trop volumineuse." }, 413);
      let body: { confirmation?: unknown; password?: unknown };
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Requête invalide." }, 400);
      }
      if (
        body?.confirmation !== "SUPPRIMER" ||
        typeof body.password !== "string" ||
        !body.password ||
        body.password.length > 1024
      ) {
        return json({ error: "Mot de passe et confirmation requis." }, 400);
      }
      if (!(await deps.isReady()))
        return json(
          { error: "La suppression est temporairement indisponible. Contacte le support." },
          503,
        );
      const verified = await deps.verifyPassword(user.email, body.password);
      if (!verified || verified.id !== user.id)
        return json({ error: "Le mot de passe est incorrect." }, 403);
      await deps.revokeSessions(token);
      await deps.deleteUser(user.id);
      return json({ deleted: true });
    } catch {
      return json({ error: "La suppression n'a pas abouti. Reconnecte-toi puis réessaie." }, 503);
    }
  };
}
