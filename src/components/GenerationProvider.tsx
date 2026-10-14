import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GenerationContext, type GenerationState } from "../lib/generationContext";
import { generateProgram } from "../lib/openai";
import { useApp } from "../lib/store";
import { showToast } from "../lib/toast";
import type { Program, UserProfile } from "../lib/types";

/**
 * Génération du programme indépendante de l'écran : elle continue pendant que l'utilisateur
 * navigue (bandeau d'état dans GenerationBanner) et se termine par un toast « Ton programme est prêt ».
 * Elle vit tant que l'application reste ouverte : fermer l'app l'interrompt.
 */
export default function GenerationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { persistProgram } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState<GenerationState>({ phase: "idle" });
  const profile = useRef<UserProfile | null>(null);
  const generated = useRef<Program | null>(null);
  const busy = useRef(false);

  const run = useCallback(async () => {
    const current = profile.current;
    if (!current || busy.current) return;
    busy.current = true;
    try {
      if (!generated.current) {
        setState({ phase: "running" });
        generated.current = await generateProgram(current);
      }
      setState({ phase: "saving" });
      await persistProgram({
        ...generated.current,
        user_profile: generated.current.user_profile ?? current,
        generated_at: new Date().toISOString(),
      });
      generated.current = null;
      profile.current = null;
      setState({ phase: "idle" });
      showToast({
        message: "Ton programme est prêt !",
        actionLabel: "Voir",
        onAction: () => void navigate("/result", { state: { generated: true } }),
      });
    } catch (error) {
      const saveFailed = generated.current !== null;
      setState({
        phase: "error",
        message: saveFailed
          ? "Ton programme a été créé, mais son enregistrement a échoué. Réessaie : la génération est conservée."
          : error instanceof Error
            ? error.message
            : "La génération n'a pas abouti. Réessaie.",
      });
    } finally {
      busy.current = false;
    }
  }, [persistProgram, navigate]);

  const start = useCallback(
    (next: UserProfile) => {
      if (busy.current) return;
      profile.current = next;
      generated.current = null;
      void run();
    },
    [run],
  );
  const retry = useCallback(() => void run(), [run]);
  const dismiss = useCallback(() => {
    if (busy.current) return;
    profile.current = null;
    generated.current = null;
    setState({ phase: "idle" });
  }, []);

  const value = useMemo(() => ({ state, start, retry, dismiss }), [state, start, retry, dismiss]);
  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
}
