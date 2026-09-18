import type { DailySession, Exercise, GeneratedDailySession, Program, UserProfile } from "./types";
import { supabase } from "./supabase";

type SupportMessage = { role: "user" | "assistant"; content: string };

type AIRequest =
  | { action: "program"; payload: { profile: UserProfile } }
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
        context: { blockName: string; sessionGoal: string; profile: UserProfile };
      };
    }
  | { action: "support"; payload: { messages: SupportMessage[] } };

async function invokeAI<T>(request: AIRequest): Promise<T> {
  const { data, error, response } = await supabase.functions.invoke("ai-coach", { body: request });
  if (error) {
    if (response) {
      let payload: { error?: unknown } | null = null;
      try {
        payload = (await response.json()) as { error?: unknown };
      } catch {
        // The relay can return an empty or non-JSON response.
      }
      if (typeof payload?.error === "string" && payload.error.length <= 200) {
        throw new Error(payload.error);
      }
    }
    throw new Error("Le coach IA est temporairement indisponible. Réessaie dans un instant.");
  }
  if (!data || typeof data !== "object" || !("result" in data)) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Réponse invalide du coach IA.";
    throw new Error(message);
  }
  return data.result as T;
}

export function generateProgram(profile: UserProfile): Promise<Program> {
  return invokeAI<Program>({ action: "program", payload: { profile } });
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
  return invokeAI<Exercise>({ action: "replace-exercise", payload: { exercise, context } });
}

export function chatWithSupport(messages: SupportMessage[]): Promise<string> {
  const boundedMessages = messages
    .slice(-10)
    .map((message) => ({ ...message, content: message.content.slice(0, 800) }));
  return invokeAI<string>({ action: "support", payload: { messages: boundedMessages } });
}
