import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, TriangleAlert } from "lucide-react";
import { useGeneration } from "../lib/generationContext";

const MESSAGES = [
  "Analyse de ton profil…",
  "Calcul des charges et de la progression…",
  "Construction semaine par semaine…",
  "Ajout des alternatives et des conseils…",
  "Finalisation de ton programme…",
];

// Pages où la navigation du bas est masquée : le bandeau se pose alors plus bas.
const NO_NAV = [
  "/",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/reset-password",
  "/privacy",
  "/terms",
  "/support",
  "/explore",
  "/s",
];

/**
 * Bandeau d'état de la génération en arrière-plan, posé au-dessus de la navigation du bas.
 * Il décale les actions fixes (.app-dock, toast) via --app-nav-extra pour ne rien recouvrir.
 */
export default function GenerationBanner() {
  const { state, retry, dismiss } = useGeneration();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const active = state.phase !== "idle";
  const hasNav = !NO_NAV.includes(pathname);

  useEffect(() => {
    if (state.phase !== "running") return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 2200);
    return () => clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    const root = document.documentElement;
    if (active && hasNav)
      root.style.setProperty("--app-nav-extra", state.phase === "error" ? "7rem" : "4.5rem");
    else root.style.removeProperty("--app-nav-extra");
    return () => {
      root.style.removeProperty("--app-nav-extra");
    };
  }, [active, hasNav, state.phase]);

  if (!active) return null;
  const failed = state.phase === "error";
  return (
    <div className={`app-generation ${hasNav ? "app-generation--nav" : ""}`}>
      <div
        className={`mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border p-3 shadow-[0_8px_30px_rgba(2,6,23,0.18)] ${
          failed ? "border-danger-line bg-card" : "border-brand-line bg-card"
        }`}
        role={failed ? "alert" : "status"}
      >
        {failed ? (
          <TriangleAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        ) : (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {failed
              ? "La création de ton programme a échoué"
              : "Ton programme est en cours de création"}
          </p>
          <p className="text-xs text-ink-soft">
            {failed
              ? state.message
              : state.phase === "saving"
                ? "Enregistrement…"
                : `${MESSAGES[index]} Tu peux continuer à naviguer.`}
          </p>
        </div>
        {failed && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className="app-secondary min-h-11! px-3! text-xs!"
              onClick={retry}
            >
              Réessayer
            </button>
            <button
              type="button"
              className="app-icon-button border-0! bg-transparent!"
              aria-label="Fermer le message d'erreur"
              onClick={dismiss}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
