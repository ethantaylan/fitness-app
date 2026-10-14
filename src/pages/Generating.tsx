import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../lib/store";
import { useGeneration } from "../lib/generationContext";
import type { UserProfile } from "../lib/types";

/**
 * Point d'entrée de la génération (fin de l'onboarding). L'écran d'attente plein écran a disparu :
 * la génération tourne en arrière-plan (GenerationProvider), un bandeau l'indique sur toutes les pages
 * et un toast prévient à la fin. On renvoie donc tout de suite vers l'accueil.
 */
export default function Generating() {
  const { state } = useApp();
  const location = useLocation();
  const { start } = useGeneration();
  const profile = (location.state as { profile?: UserProfile } | null)?.profile ?? state.profile;
  const ready = Boolean(profile?.objective);

  useEffect(() => {
    if (ready) start(profile as UserProfile);
  }, [ready, profile, start]);

  return <Navigate to={ready ? "/dashboard" : "/onboarding"} replace />;
}
