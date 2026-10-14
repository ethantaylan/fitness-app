import type { Program, UserProfile, Week, Session } from "./types";

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export function programSessionLink(weekNumber: number, sessionId: string): string {
  return `/result?week=${weekNumber}&session=${encodeURIComponent(sessionId)}`;
}
export function programSchedule(
  program: Program | null,
  startDate: string | null,
  now = new Date(),
) {
  if (!program)
    return {
      activeWeek: null as Week | null,
      next: null as { session: Session; weekNumber: number; date: Date | null } | null,
      overdueCount: 0,
    };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const start = startDate ? new Date(`${startDate}T12:00:00`) : null;
  const validStart = start && Number.isFinite(start.getTime()) ? start : null;
  const activeNumber = validStart
    ? Math.max(1, Math.floor((today.getTime() - validStart.getTime()) / 604800000) + 1)
    : null;
  const activeWeek = activeNumber
    ? (program.weeks.find(
        (week) => week.week_number === Math.min(activeNumber, program.weeks.length),
      ) ?? null)
    : (program.weeks.find((week) => week.sessions.some((session) => !session.completed)) ??
      program.weeks.at(-1) ??
      null);
  const scheduled = program.weeks
    .flatMap((week) =>
      week.sessions.map((session, index) => {
        let date: Date | null = null;
        if (validStart) {
          const day = DAYS.indexOf(session.day.toLocaleLowerCase("fr-FR").trim());
          const offset =
            day >= 0
              ? (day - validStart.getDay() + 7) % 7
              : Math.floor((index * 7) / Math.max(1, week.sessions.length));
          date = new Date(validStart);
          date.setDate(date.getDate() + (week.week_number - 1) * 7 + offset);
        }
        return { session, weekNumber: week.week_number, date };
      }),
    )
    .sort((a, b) => (a.date?.getTime() ?? a.weekNumber) - (b.date?.getTime() ?? b.weekNumber));
  const pending = scheduled.filter((item) => !item.session.completed);
  return {
    activeWeek,
    next: pending.find((item) => !item.date || item.date >= today) ?? null,
    overdueCount: pending.filter((item) => item.date && item.date < today).length,
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
