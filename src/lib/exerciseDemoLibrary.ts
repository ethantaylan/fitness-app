import { requestAIConsent, AI_CONSENT_VERSION } from "./aiConsent";
import { supabase } from "./supabase";
import { normalizeExerciseName } from "./exerciseGuideKey";

export interface LibraryGuide {
  id: string;
  title: string;
  steps: string[];
  mistake: string;
  source: "everkinetic" | "vincere";
  images: string[];
  layout?: "pair";
  reviewed?: boolean;
}
export type DemoResult =
  | { status: "ready"; guide: LibraryGuide }
  | { status: "pending" | "missing" | "limited" | "unavailable" };
const pending = new Map<string, Promise<DemoResult>>();
const cache = new Map<string, { expires: number; result: DemoResult }>();

export function isLibraryGuide(value: unknown): value is LibraryGuide {
  if (!value || typeof value !== "object") return false;
  const guide = value as Partial<LibraryGuide>;
  const origin = import.meta.env.VITE_SUPABASE_URL;
  return (
    typeof guide.id === "string" &&
    typeof guide.title === "string" &&
    Array.isArray(guide.steps) &&
    guide.steps.length >= 2 &&
    guide.steps.every((step) => typeof step === "string") &&
    typeof guide.mistake === "string" &&
    ["everkinetic", "vincere"].includes(guide.source ?? "") &&
    Array.isArray(guide.images) &&
    guide.images.length >= 1 &&
    guide.images.length <= 2 &&
    guide.images.every(
      (url) =>
        typeof url === "string" &&
        (url.startsWith("/exercises/") ||
          (typeof origin === "string" &&
            url.startsWith(`${origin}/storage/v1/object/sign/exercise-demo-library/`))),
    ) &&
    (guide.images.length === 2 || guide.layout === "pair")
  );
}

/** Requests can reserve a first generation; lookup polling never starts one. */
export async function requestExerciseDemo(
  name: string,
  action: "request" | "lookup" = "request",
): Promise<DemoResult> {
  const key = normalizeExerciseName(name);
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.result;
  const active = pending.get(key);
  if (active) return active;
  const request = (async (): Promise<DemoResult> => {
    try {
      if (action === "request" && !(await requestAIConsent())) return { status: "unavailable" };
      const { data, error } = await supabase.functions.invoke("exercise-demo", {
        body: { action, name, automatic: true, consentVersion: AI_CONSENT_VERSION },
        timeout: 10000,
      });
      if (error || !data) return { status: "unavailable" };
      const result: DemoResult =
        data.status === "ready" && isLibraryGuide(data.guide)
          ? { status: "ready", guide: data.guide }
          : {
              status: ["pending", "missing", "limited"].includes(data.status)
                ? data.status
                : "unavailable",
            };
      cache.set(key, {
        result,
        expires: Date.now() + (result.status === "ready" ? 300000 : 2000),
      });
      return result;
    } catch {
      return { status: "unavailable" };
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, request);
  return request;
}
