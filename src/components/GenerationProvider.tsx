import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { GenerationContext } from "../lib/generationContext";
import { useAuth } from "../lib/auth";
import { generateProgram } from "../lib/openai";
import { ProgramGeneration } from "../lib/programGeneration";
import { useApp } from "../lib/store";
import { showToast } from "../lib/toast";

/** Generation follows navigation; a received result survives reloads until saved. */
export default function GenerationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { persistProgram } = useApp();
  const { userId } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useLayoutEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  const onReady = useCallback(() => {
    showToast({
      message: "Ton programme est prêt !",
      actionLabel: "Voir",
      onAction: () => void navigateRef.current("/result", { state: { generated: true } }),
    });
  }, []);
  const generation = useMemo(() => {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      // The current result is still kept in memory when storage is unavailable.
    }
    return new ProgramGeneration({
      userId,
      storage,
      generate: generateProgram,
      durableGeneration: true,
      persist: persistProgram,
      onReady,
    });
  }, [userId, persistProgram, onReady]);
  const state = useSyncExternalStore(generation.subscribe, generation.getState);

  useLayoutEffect(() => {
    generation.activate();
    return () => generation.dispose();
  }, [generation]);

  const value = useMemo(
    () => ({
      state,
      start: generation.start,
      retry: generation.retry,
      dismiss: generation.dismiss,
    }),
    [state, generation],
  );
  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
}
