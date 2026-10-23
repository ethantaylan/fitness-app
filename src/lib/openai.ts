import type { DailySession, Exercise, GeneratedDailySession, Program, UserProfile } from "./types";
import { supabase } from "./supabase";
import { AI_CONSENT_VERSION, requestAIConsent } from "./aiConsent";
import { ProgramRequestError } from "./programGeneration";

type SupportMessage = { role: "user" | "assistant"; content: string };

type AIRequest =
  | { action: "program"; payload: { profile: UserProfile } }
  | { action: "program-start"; payload: { profile: UserProfile; jobId: string } }
  | { action: "program-status"; payload: { jobId: string } }
  | {
      action: "daily-session";
      payload: {
        profile: UserProfile;
        previousFeedback?: DailySession["feedback"];
        programContext?: string;
      };
    }
  | {
      action: "custom-session";
      payload: {
        profile: UserProfile;
        selections: Array<{ id: string; label: string; count: number; minutesPerItem: number }>;
        estimatedDuration: number;
      };
    }
  | {
      action: "replace-exercise";
      payload: {
        exercise: Exercise;
        profile: UserProfile;
        context: { blockName: string; sessionGoal: string; profile: UserProfile };
      };
    }
  | { action: "support"; payload: { messages: SupportMessage[] } };

async function invokeAI<T>(request: AIRequest, signal?: AbortSignal): Promise<T> {
  if (!navigator.onLine)
    throw new Error("Une connexion Internet est nécessaire pour générer ce contenu.");
  if (request.action !== "program-status" && !(await requestAIConsent()))
    throw new ProgramRequestError(
      "Le partage avec OpenAI n'a pas été autorisé. Tes séances enregistrées restent disponibles.",
      true,
    );
  const { data, error, response } = await supabase.functions.invoke("ai-coach", {
    body: { ...request, consentVersion: AI_CONSENT_VERSION },
    signal,
    timeout: 30000,
  });
  if (error) {
    if (response) {
      let payload: { error?: unknown } | null = null;
      try {
        payload = (await response.json()) as { error?: unknown };
      } catch {
        // The relay can return an empty or non-JSON response.
      }
      if (typeof payload?.error === "string" && payload.error.length <= 200) {
        throw new ProgramRequestError(
          payload.error,
          [400, 403, 404, 429].includes(response.status),
        );
      }
    }
    throw new Error(
      "Le service de génération est temporairement indisponible. Réessaie dans un instant.",
    );
  }
  if (!data || typeof data !== "object" || !("result" in data)) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Réponse invalide du service de génération.";
    throw new Error(message);
  }
  return data.result as T;
}

interface RemoteProgramStatus {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  error?: string;
  result?: Program;
}

function waitForProgram(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const stop = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      resolve();
    }, 3000);
    signal?.addEventListener("abort", stop, { once: true });
  });
}

/** Poll short requests instead of keeping a paid creation attached to one HTTP connection. */
export async function generateProgram(
  profile: UserProfile,
  requestId: string = crypto.randomUUID(),
  signal?: AbortSignal,
): Promise<Program> {
  let job = await invokeAI<RemoteProgramStatus>(
    { action: "program-start", payload: { profile, jobId: requestId } },
    signal,
  );
  for (;;) {
    if (job.status === "completed" && job.result) return job.result;
    if (job.status === "failed")
      throw new ProgramRequestError(job.error ?? "La création n'a pas abouti.", true);
    if (!["queued", "running"].includes(job.status)) throw new Error("État de création invalide.");
    await waitForProgram(signal);
    job = await invokeAI<RemoteProgramStatus>(
      { action: "program-status", payload: { jobId: job.id } },
      signal,
    );
  }
}

export function generateDailySession(
  profile: UserProfile,
  previousFeedback?: DailySession["feedback"],
  programContext?: string,
): Promise<GeneratedDailySession> {
  return invokeAI<GeneratedDailySession>({
    action: "daily-session",
    payload: { profile, previousFeedback, programContext },
  });
}

export function generateCustomSession(
  profile: UserProfile,
  selections: Array<{ id: string; label: string; count: number; minutesPerItem: number }>,
  estimatedDuration: number,
): Promise<GeneratedDailySession> {
  return invokeAI<GeneratedDailySession>({
    action: "custom-session",
    payload: { profile, selections, estimatedDuration },
  });
}

export function replaceExercise(
  exercise: Exercise,
  context: { blockName: string; sessionGoal: string; profile: UserProfile },
): Promise<Exercise> {
  return invokeAI<Exercise>({
    action: "replace-exercise",
    payload: { exercise, context, profile: context.profile },
  });
}

export function chatWithSupport(messages: SupportMessage[]): Promise<string> {
  const boundedMessages = messages
    .slice(-10)
    .map((message) => ({ ...message, content: message.content.slice(0, 800) }));
  return invokeAI<string>({ action: "support", payload: { messages: boundedMessages } });
}
