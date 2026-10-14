import type { Program, UserProfile, Week, Session } from "./types";

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export function programSessionLink(weekNumber: number, sessionId: string): string {
  return `/result?week=${weekNumber}&session=${encodeURIComponent(sessionId)}`;
}
function parseStart(startDate: string | null): Date | null {
  const start = startDate ? new Date(`${startDate}T12:00:00`) : null;
  return start && Number.isFinite(start.getTime()) ? start : null;
}
function atNoon(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}
/** Date prévue d'une séance (jour de la semaine, sinon réparties dans la semaine). */
function plannedDate(week: Week, session: Session, index: number, start: Date | null): Date | null {
  if (!start) return null;
  const day = DAYS.indexOf(session.day.toLocaleLowerCase("fr-FR").trim());
  const offset =
    day >= 0
      ? (day - start.getDay() + 7) % 7
      : Math.floor((index * 7) / Math.max(1, week.sessions.length));
  const date = new Date(start);
  date.setDate(date.getDate() + (week.week_number - 1) * 7 + offset);
  return date;
}
export type SessionStatus = "done" | "overdue" | "today" | "upcoming";
/** État d'affichage de chaque séance d'une semaine : faite, à rattraper, aujourd'hui, à venir. */
export function weekSessionStates(
  week: Week | null,
  startDate: string | null,
  now = new Date(),
): Array<{ session: Session; date: Date | null; status: SessionStatus }> {
  if (!week) return [];
  const today = atNoon(now);
  const start = parseStart(startDate);
  return week.sessions.map((session, index) => {
    const date = plannedDate(week, session, index, start);
    let status: SessionStatus = "upcoming";
    if (session.completed) status = "done";
    else if (date?.toDateString() === today.toDateString()) status = "today";
    else if (date && date < today) status = "overdue";
    return { session, date, status };
  });
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
  const today = atNoon(now);
  const validStart = parseStart(startDate);
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
      week.sessions.map((session, index) => ({
        session,
        weekNumber: week.week_number,
        date: plannedDate(week, session, index, validStart),
      })),
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
