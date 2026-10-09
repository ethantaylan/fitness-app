import { supabase } from "./supabase";

export const AI_CONSENT_VERSION = "2026-10-08";
const ANON_KEY = "vincere-ai-consent-anon";
const listeners = new Set<() => void>();
let pending: { userId: string | null; resolve: (accepted: boolean) => void } | null = null;
let pendingPromise: Promise<boolean> | null = null;

export function subscribeAIConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isAIConsentPending() {
  return pending !== null;
}

function notify() {
  listeners.forEach((listener) => listener());
}

export async function requestAIConsent(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user.user_metadata.ai_consent_version === AI_CONSENT_VERSION) return true;
  if (!session && localStorage.getItem(ANON_KEY) === AI_CONSENT_VERSION) return true;
  if (pendingPromise) return pendingPromise;
  pendingPromise = new Promise<boolean>((resolve) => {
    pending = { userId: session?.user.id ?? null, resolve };
  });
  notify();
  return pendingPromise;
}

export async function answerAIConsent(accepted: boolean) {
  const request = pending;
  if (!request) return;
  if (accepted) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if ((session?.user.id ?? null) !== request.userId) {
      await answerAIConsent(false);
      return;
    }
    if (session) {
      const { error } = await supabase.auth.updateUser({
        data: {
          ai_consent_version: AI_CONSENT_VERSION,
          ai_consent_at: new Date().toISOString(),
        },
      });
      if (error) throw new Error("L'accord n'a pas pu être enregistré. Vérifie ta connexion.");
    } else {
      localStorage.setItem(ANON_KEY, AI_CONSENT_VERSION);
    }
  }
  pending = null;
  pendingPromise = null;
  notify();
  request.resolve(accepted);
}

export async function revokeAIConsent() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    const { error } = await supabase.auth.updateUser({
      data: {
        ai_consent_version: null,
        ai_consent_at: null,
      },
    });
    if (error) throw new Error("Impossible de retirer l'accord. Vérifie ta connexion.");
  }
  localStorage.removeItem(ANON_KEY);
  await answerAIConsent(false);
}
