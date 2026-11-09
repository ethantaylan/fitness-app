import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Program } from "./types";
import { canCompleteWeek, sessionLabel } from "./program";

export interface HealthActivity {
  id: string;
  type: string;
  start: string;
  end: string;
  durationSeconds: number;
  distanceMeters: number;
  sourceName: string;
}
interface HealthPlugin {
  availability(): Promise<{ available: boolean }>;
  requestAccess(): Promise<{ requested: boolean }>;
  workouts(): Promise<{ activities: HealthActivity[] }>;
}
const Health = registerPlugin<HealthPlugin>("VincereHealth");
export const supportsAppleHealth = () =>
  Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("VincereHealth");
export async function readHealthActivities(): Promise<HealthActivity[]> {
  if (!supportsAppleHealth() || !(await Health.availability()).available)
    throw new Error(
      "Apple Santé est disponible dans l’application iPhone sur les appareils compatibles.",
    );
  if (!(await Health.requestAccess()).requested)
    throw new Error("La demande d’accès à Santé n’a pas abouti.");
  const result = await Health.workouts();
  return result.activities.filter(
    (activity) =>
      typeof activity.id === "string" &&
      Number.isFinite(activity.durationSeconds) &&
      activity.durationSeconds > 0 &&
      Number.isFinite(Date.parse(activity.start)) &&
      Number.isFinite(Date.parse(activity.end)) &&
      Date.parse(activity.end) >= Date.parse(activity.start),
  );
}
export function healthSessionOptions(program: Program | null) {
  if (!program) return [];
  return [...program.weeks]
    .sort((a, b) => a.week_number - b.week_number)
    .filter((week) => canCompleteWeek(program, week.week_number))
    .flatMap((week) =>
      week.sessions
        .filter((session) => !session.completed)
        .map((session) => ({
          week: week.week_number,
          session: session.session_id,
          label: `Semaine ${week.week_number} · ${sessionLabel(session)} · ${session.type}`,
        })),
    );
}
