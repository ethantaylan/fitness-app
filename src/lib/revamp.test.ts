import { expect, test } from "vite-plus/test";
import { exerciseMetrics, usesHolds } from "./exerciseDisplay";
import { parseFrenchDate, practiceDays, practiceStats } from "./practice";
import { programSchedule, weekSessionStates } from "./program";
import { collectNotes, validateNote } from "./notes";
import { estimateMinutes, quickWorkoutsFor } from "./quickWorkouts";
import { shortDay, whenLabel } from "./sessionDisplay";
import type { Program, Session } from "./types";

const session = (day: string, id: string, completed = false, completedAt?: string): Session => ({
  day,
  session_id: id,
  type: "Yoga",
  duration_min: 45,
  intensity: "Modérée",
  warmup: [],
  blocks: [],
  cooldown: [],
  completed,
  completedAt: completedAt ?? null,
});
// mercredi 14 octobre 2026
const now = new Date(2026, 9, 14, 9);
const program: Program = {
  program_overview: { duration_weeks: 2, training_days_per_week: 3, summary: "" },
  weeks: [
    {
      week_number: 1,
      focus: "",
      sessions: [
        session("lundi", "a"),
        session("mardi", "b", true, "2026-10-13T18:00:00"),
        session("mercredi", "c"),
        session("vendredi", "d"),
      ],
    },
    { week_number: 2, focus: "", sessions: [session("lundi", "e")] },
  ],
};

test("yoga sessions speak in holds and breaths, not sets, rest and tempo", () => {
  expect(usesHolds("yoga", "Séance")).toBe(true);
  expect(usesHolds("running", "Yoga doux")).toBe(true);
  expect(usesHolds("prise-masse", "Haut du corps")).toBe(false);
  expect(
    exerciseMetrics(
      { name: "Pigeon", sets: 1, reps: "45s", tempo: "4-4", rest_sec: 0 },
      { holds: true },
    ),
  ).toEqual([{ label: "Maintien", value: "45 s" }]);
  expect(
    exerciseMetrics(
      { name: "Fente basse", sets: 2, reps: "8 respirations", tempo: "4-4", rest_sec: 15 },
      { holds: true },
    ),
  ).toEqual([
    { label: "Respirations", value: "8" },
    { label: "Passages", value: "2" },
    { label: "Pause", value: "15 s" },
  ]);
  // La force garde son vocabulaire.
  expect(
    exerciseMetrics({ name: "Squat", sets: 3, reps: 8, tempo: "3-1-1" }).map((m) => m.label),
  ).toEqual(["Séries", "Répétitions", "Tempo"]);
});

test("week sessions expose done, overdue, today and upcoming states", () => {
  const states = weekSessionStates(program.weeks[0], "2026-10-12", now);
  expect(states.map((entry) => entry.status)).toEqual(["overdue", "done", "today", "upcoming"]);
  // Sans date de départ, rien n'est en retard.
  expect(weekSessionStates(program.weeks[0], null, now).map((entry) => entry.status)).toEqual([
    "upcoming",
    "done",
    "upcoming",
    "upcoming",
  ]);
  // programSchedule reste cohérent avec les états : 1 séance en retard, la suivante est aujourd'hui.
  const schedule = programSchedule(program, "2026-10-12", now);
  expect(schedule.overdueCount).toBe(1);
  expect(schedule.next?.session.session_id).toBe("c");
});

test("session labels are relative and short", () => {
  expect(whenLabel(new Date(2026, 9, 14, 12), "mercredi", now)).toBe("Aujourd'hui");
  expect(whenLabel(new Date(2026, 9, 15, 12), "jeudi", now)).toBe("Demain");
  expect(whenLabel(new Date(2026, 9, 17, 12), "samedi", now)).toBe("Samedi 17 octobre");
  expect(whenLabel(null, "lundi", now)).toBe("Lundi");
  expect(shortDay("mercredi")).toBe("Mer.");
});

test("free session dates without a year resolve to the latest past occurrence", () => {
  expect(parseFrenchDate("mercredi 14 octobre", now)?.getFullYear()).toBe(2026);
  expect(parseFrenchDate("Samedi 2 mai", now)?.getMonth()).toBe(4);
  expect(parseFrenchDate("lundi 15 décembre", now)?.getFullYear()).toBe(2025);
  expect(parseFrenchDate("sans date", now)).toBeNull();
});

test("practice statistics count streaks and the calendar", () => {
  const days = practiceDays(
    program,
    [
      {
        uid: "1",
        date: "dimanche 11 octobre",
        goal: "x",
        intensity: "Modérée",
        duration_min: 30,
        warmup: [],
        blocks: [],
        cooldown: [],
        motivation_message: "",
        feedback: "good",
      },
      // sans ressenti : générée mais pas comptée comme faite
      {
        uid: "2",
        date: "samedi 10 octobre",
        goal: "y",
        intensity: "Modérée",
        duration_min: 30,
        warmup: [],
        blocks: [],
        cooldown: [],
        motivation_message: "",
      },
    ],
    now,
  );
  expect([...days].sort()).toEqual(["2026-10-11", "2026-10-13"]);
  const stats = practiceStats(days, now);
  expect(stats.thisWeek).toBe(1);
  expect(stats.weekStreak).toBe(2);
  expect(stats.dayStreak).toBe(1); // hier ; aujourd'hui n'est pas obligatoire
  expect(stats.calendar).toHaveLength(5);
  expect(stats.calendar[4][2]).toMatchObject({ key: "2026-10-14", today: true, future: false });
  expect(stats.calendar[4].filter((cell) => cell.practiced)).toHaveLength(1);
});

test("quick workouts are the same for every profile and use existing activities", () => {
  const ids = quickWorkoutsFor().map((w) => w.id);
  expect(ids).toContain("etirements-express");
  expect(ids).toContain("poussee");
  expect(ids).toContain("endurance-technique");
  expect(new Set(quickWorkoutsFor().map((w) => w.label)).size).toBe(ids.length);
  expect(estimateMinutes({ etirements: 1 })).toBe(16);
});

test("notes are free-standing and legacy session notes stay listed", () => {
  const items = collectNotes(
    [{ id: "n1", title: "Genou", content: "À surveiller", date: "2026-10-13" }],
    [
      {
        uid: "s1",
        date: "dimanche 11 octobre",
        goal: "Récupération",
        intensity: "Modérée",
        duration_min: 30,
        warmup: [],
        blocks: [],
        cooldown: [],
        motivation_message: "",
        notes: "Bonne séance",
      },
      {
        uid: "s2",
        date: "samedi 10 octobre",
        goal: "Sans note",
        intensity: "Modérée",
        duration_min: 30,
        warmup: [],
        blocks: [],
        cooldown: [],
        motivation_message: "",
      },
    ],
    now,
  );
  expect(items.map((item) => [item.kind, item.id, item.date])).toEqual([
    ["note", "n1", "2026-10-13"],
    ["session", "s1", "2026-10-11"],
  ]);
  expect(validateNote("   ", "2026-10-13")).toHaveProperty("content");
  expect(validateNote("ok", "pas une date")).toHaveProperty("date");
  expect(validateNote("ok", "2026-10-13")).toEqual({});
});
