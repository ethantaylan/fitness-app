import type { DailySession, Program } from "./types";

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const atNoon = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
/** Lundi de la semaine de la date donnée. */
const weekStart = (date: Date) => addDays(atNoon(date), -((date.getDay() + 6) % 7));

/**
 * Les séances libres stockent une date lisible sans année (« mercredi 14 octobre ») :
 * on retient l'occurrence la plus récente qui n'est pas dans le futur.
 */
export function parseFrenchDate(label: string, now = new Date()): Date | null {
  const match = label
    .toLocaleLowerCase("fr-FR")
    .match(
      /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/,
    );
  if (!match) return null;
  const normalized = match[2]
    .replace("fevrier", "février")
    .replace("aout", "août")
    .replace("decembre", "décembre");
  const month = MONTHS.indexOf(normalized);
  let date = new Date(now.getFullYear(), month, Number(match[1]), 12);
  if (date.getTime() > atNoon(now).getTime() + 86400000)
    date = new Date(now.getFullYear() - 1, month, Number(match[1]), 12);
  return date;
}

/**
 * Jours de pratique (clé AAAA-MM-JJ) : séances du programme cochées, et séances libres
 * pour lesquelles un ressenti a été donné (elles ont été faites).
 */
export function practiceDays(
  program: Program | null,
  sessions: DailySession[],
  now = new Date(),
): Set<string> {
  const days = new Set<string>();
  for (const week of program?.weeks ?? [])
    for (const session of week.sessions)
      if (session.completed && session.completedAt) {
        const date = new Date(session.completedAt);
        if (Number.isFinite(date.getTime())) days.add(toKey(date));
      }
  for (const session of sessions) {
    if (!session.feedback) continue;
    const date = parseFrenchDate(session.date, now);
    if (date) days.add(toKey(date));
  }
  return days;
}

export interface PracticeStats {
  total: number;
  thisWeek: number;
  /** Semaines consécutives avec au moins une séance (la semaine en cours ne casse pas la série). */
  weekStreak: number;
  /** Jours consécutifs avec une séance (aujourd'hui n'est pas obligatoire). */
  dayStreak: number;
  /** 5 dernières semaines, lundi → dimanche. */
  calendar: Array<
    Array<{ key: string; day: number; practiced: boolean; future: boolean; today: boolean }>
  >;
}

export function practiceStats(days: Set<string>, now = new Date(), weeks = 5): PracticeStats {
  const today = atNoon(now);
  const currentStart = weekStart(today);
  const inWeek = (start: Date) =>
    Array.from({ length: 7 }, (_, i) => toKey(addDays(start, i))).filter((key) => days.has(key))
      .length;

  const thisWeek = inWeek(currentStart);
  let weekStreak = 0;
  for (let i = thisWeek > 0 ? 0 : 1; i < 520; i++) {
    if (inWeek(addDays(currentStart, -7 * i)) === 0) break;
    weekStreak++;
  }
  let dayStreak = 0;
  for (let i = days.has(toKey(today)) ? 0 : 1; i < 3650; i++) {
    if (!days.has(toKey(addDays(today, -i)))) break;
    dayStreak++;
  }
  const calendar = Array.from({ length: weeks }, (_, w) => {
    const start = addDays(currentStart, -7 * (weeks - 1 - w));
    return Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, d);
      const key = toKey(date);
      return {
        key,
        day: date.getDate(),
        practiced: days.has(key),
        future: date.getTime() > today.getTime(),
        today: key === toKey(today),
      };
    });
  });
  return { total: days.size, thisWeek, weekStreak, dayStreak, calendar };
}
