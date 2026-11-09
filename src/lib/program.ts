import type { Program, UserProfile, Week, Session } from "./types";

export function programSessionLink(weekNumber: number, sessionId: string): string {
  return `/result?week=${weekNumber}&session=${encodeURIComponent(sessionId)}`;
}
export type SessionStatus = "done" | "overdue" | "today" | "upcoming";
export function sessionLabel(session: Session, index = 0): string {
  const match = /D(\d+)$/.exec(session.session_id);
  return `Séance ${match ? Number(match[1]) : index + 1}`;
}
export function canCompleteWeek(program: Program, number: number): boolean {
  return program.weeks
    .filter((week) => week.week_number < number)
    .every((week) => week.sessions.every((session) => session.completed));
}
/** Week numbers describe training blocks, never elapsed calendar weeks. */
export function weekSessionStates(
  week: Week | null,
  _startDate?: string | null,
  _now?: Date,
): Array<{ session: Session; date: Date | null; status: SessionStatus }> {
  return (
    week?.sessions.map((session) => ({
      session,
      date: null,
      status: session.completed ? "done" : "upcoming",
    })) ?? []
  );
}
export function programSchedule(program: Program | null, _startDate?: string | null, _now?: Date) {
  const weeks = [...(program?.weeks ?? [])].sort((a, b) => a.week_number - b.week_number);
  const activeWeek =
    weeks.find((week) => week.sessions.some((session) => !session.completed)) ??
    weeks.at(-1) ??
    null;
  const session = activeWeek?.sessions.find((item) => !item.completed);
  return {
    activeWeek,
    next:
      session && activeWeek
        ? { session, weekNumber: activeWeek.week_number, date: null as Date | null }
        : null,
    overdueCount: 0,
  };
}
export function resetProgramWeeks(program: Program, number: number, following: boolean): Program {
  return {
    ...program,
    weeks: program.weeks.map((week) =>
      week.week_number === number || (following && week.week_number > number)
        ? {
            ...week,
            sessions: week.sessions.map((session) => ({
              ...session,
              completed: false,
              completedAt: null,
            })),
          }
        : week,
    ),
  };
}
export function profileDifferences(
  snapshot?: Partial<UserProfile>,
  current?: Partial<UserProfile> | null,
): string[] {
  if (!snapshot || !current) return [];
  const keys: Array<[keyof UserProfile, string]> = [
    ["objective", "discipline / objectif"],
    ["goalDetail", "objectif précis"],
    ["weight", "poids"],
    ["level", "niveau"],
    ["weeklyFrequency", "fréquence"],
    ["sessionDuration", "durée des séances"],
    ["equipment", "matériel"],
    ["injuries", "limitations"],
  ];
  return keys
    .filter(
      ([key]) =>
        snapshot[key] !== undefined &&
        JSON.stringify(snapshot[key]) !== JSON.stringify(current[key]),
    )
    .map(([, label]) => label);
}
