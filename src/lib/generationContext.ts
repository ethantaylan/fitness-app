import { createContext, useContext } from "react";
import type { UserProfile } from "./types";

export type GenerationState =
  | { phase: "idle" }
  | { phase: "running" | "saving" }
  | { phase: "error"; message: string };

export interface GenerationApi {
  state: GenerationState;
  /** Lance la génération en arrière-plan (sans effet si une génération est déjà en cours). */
  start: (profile: UserProfile) => void;
  /** Relance après une erreur (la génération déjà obtenue est conservée si seul l'enregistrement a échoué). */
  retry: () => void;
  dismiss: () => void;
}

export const GenerationContext = createContext<GenerationApi | null>(null);

export function useGeneration(): GenerationApi {
  const context = useContext(GenerationContext);
  if (!context) throw new Error("useGeneration doit être utilisé dans GenerationProvider");
  return context;
}
