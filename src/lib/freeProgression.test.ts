import { expect, test } from "vite-plus/test";
import { canCompleteWeek, programSchedule, resetProgramWeeks, sessionLabel } from "./program";
import { healthSessionOptions } from "./health";
import type { Program, Session } from "./types";
const session = (id: string, completed = false): Session => ({
  session_id: id,
  day: "lundi",
  type: "Course",
  duration_min: 30,
  intensity: "Modérée",
  warmup: [],
  cooldown: [],
  blocks: [],
  completed,
  completedAt: completed ? "2026-01-01T12:00:00Z" : null,
});
const program: Program = {
  program_overview: { duration_weeks: 3, training_days_per_week: 2, summary: "" },
  weeks: [1, 2, 3].map((n) => ({
    week_number: n,
    focus: "",
    sessions: [session(`W${n}D1`), session(`W${n}D2`)],
  })),
};
test("no elapsed time can skip an incomplete week; completion unlocks the next block", () => {
  expect(
    programSchedule(program, "2020-01-01", new Date("2030-01-01")).activeWeek?.week_number,
  ).toBe(1);
  const updated = structuredClone(program);
  updated.weeks[0].sessions.forEach((s) => {
    s.completed = true;
  });
  expect(programSchedule(updated).activeWeek?.week_number).toBe(2);
  expect(canCompleteWeek(updated, 2)).toBe(true);
  expect(canCompleteWeek(updated, 3)).toBe(false);
  expect(sessionLabel(session("W2D2"))).toBe("Séance 2");
});
test("reset preserves content and clears exactly the requested progression range", () => {
  const done = structuredClone(program);
  done.weeks.forEach((w) =>
    w.sessions.forEach((s) => {
      s.completed = true;
      s.completedAt = "2026-01-01T12:00:00Z";
    }),
  );
  const one = resetProgramWeeks(done, 2, false);
  expect(one.weeks[0].sessions[0].completed).toBe(true);
  expect(one.weeks[1].sessions.every((s) => !s.completed && !s.completedAt)).toBe(true);
  expect(one.weeks[2].sessions[0].completed).toBe(true);
  const following = resetProgramWeeks(done, 2, true);
  expect(following.weeks.slice(1).every((w) => w.sessions.every((s) => !s.completed))).toBe(true);
  expect(following.weeks[1].sessions[0].blocks).toEqual(done.weeks[1].sessions[0].blocks);
  expect(done.weeks[1].sessions[0].completed).toBe(true);
});
test("health association only offers uncompleted sessions from the unlocked week", () => {
  expect(healthSessionOptions(program).map((s) => s.session)).toEqual(["W1D1", "W1D2"]);
  const done = structuredClone(program);
  done.weeks[0].sessions.forEach((s) => {
    s.completed = true;
  });
  expect(healthSessionOptions(done).map((s) => s.session)).toEqual(["W2D1", "W2D2"]);
});
