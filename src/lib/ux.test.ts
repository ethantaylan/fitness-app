import { expect, test } from "vite-plus/test";
import recordMigration from "../../supabase/migrations/20261014141541_validate_record_measures.sql?raw";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import { saveProgram } from "./db";
import { validateRecord } from "./records";
import { exerciseMetrics, formatSeconds } from "./exerciseDisplay";
import { profileDifferences, programSchedule, programSessionLink } from "./program";
import type { PersonalRecord, Program } from "./types";

const record: PersonalRecord = {
  id: "fixture",
  name: "Squat",
  category: "force",
  date: "2026-10-14",
};
test("records require meaningful measures and accept zero load explicitly", () => {
  expect(validateRecord(record)).toHaveProperty("weight_kg");
  expect(validateRecord(record)).toHaveProperty("reps");
  expect(validateRecord({ ...record, weight_kg: 0, reps: 1 })).toEqual({});
  expect(validateRecord({ ...record, weight_kg: 10, reps: 0 })).toHaveProperty("reps");
  expect(validateRecord({ ...record, category: "cardio", distance_km: 5 })).toEqual({});
  expect(validateRecord({ ...record, category: "corps", time_min: 60 })).toEqual({});
  expect(validateRecord({ ...record, category: "autre" })).toHaveProperty("reps");
  expect(validateRecord({ ...record, reps: NaN })).toHaveProperty("reps");
});
test("running measures hide irrelevant sets, load, tempo and zero rest", () => {
  expect(
    exerciseMetrics({
      name: "Course",
      sets: 1,
      reps: "20 min",
      load_kg: "N/A",
      tempo: "N/A",
      rest_sec: 0,
    }),
  ).toEqual([{ label: "Durée", value: "20 min" }]);
  expect(exerciseMetrics({ name: "Squat", sets: 3, reps: 8, load_kg: "40", rest_sec: 90 })).toEqual(
    [
      { label: "Séries", value: "3" },
      { label: "Répétitions", value: "8" },
      { label: "Charge", value: "40 kg" },
      { label: "Repos", value: "1 min 30 s" },
    ],
  );
  expect(formatSeconds(300)).toBe("5 min");
  expect(exerciseMetrics({ name: "Course", sets: 1, reps: "5km" })).toEqual([
    { label: "Distance", value: "5km" },
  ]);
  expect(exerciseMetrics({ name: "Gainage", sets: 1, reps: "90s" })).toEqual([
    { label: "Durée", value: "1 min 30 s" },
  ]);
});

for (const failure of [false, true]) {
  test(`saving a program uses one atomic RPC (${failure ? "failure" : "success"})`, async () => {
    const programId = "00000000-0000-0000-0000-000000000010";
    const requests: { path: string; method: string; body: Record<string, unknown> | null }[] = [];
    const client = createClient("https://fixture.example.test", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
          const method = init?.method ?? "GET";
          const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
          requests.push({ path, method, body });
          if (failure)
            return Response.json({ message: "RPC unavailable", code: "PGRST202" }, { status: 404 });
          return Response.json(programId);
        },
      },
    });
    const result = saveProgram(client, "user", program, programId);
    if (failure) await expect(result).rejects.toThrow("[db/saveProgram] RPC unavailable");
    else await expect(result).resolves.toBe(programId);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      path: "/rest/v1/rpc/save_generated_program",
      method: "POST",
      body: { p_program_id: programId, p_program: { ...program, user_id: "user" } },
    });
    // An unavailable RPC must never fall back to a partially committed plan.
    expect(requests[0].body?.p_program).toHaveProperty("started_at");
  });
}
const program: Program = {
  user_profile: { weight: 60, weeklyFrequency: 4 },
  program_overview: { duration_weeks: 2, training_days_per_week: 4, summary: "Test" },
  weeks: [1, 2].map((number) => ({
    week_number: number,
    focus: "Adaptation",
    sessions: [
      {
        session_id: `W${number}D1`,
        day: "Mercredi",
        type: "Endurance",
        duration_min: 45,
        intensity: "Modérée",
        warmup: [],
        cooldown: [],
        blocks: [],
      },
    ],
  })),
};
test("past unchecked sessions are separate from the next scheduled workout", () => {
  const schedule = programSchedule(program, "2026-10-07", new Date("2026-10-14T12:00:00"));
  expect(schedule.activeWeek?.week_number).toBe(2);
  expect(schedule.overdueCount).toBe(1);
  expect(schedule.next?.session.session_id).toBe("W2D1");
  expect(programSessionLink(2, "W2D1")).toBe("/result?week=2&session=W2D1");
  expect(profileDifferences(program.user_profile, { weight: 70, weeklyFrequency: 3 })).toEqual([
    "poids",
    "fréquence",
  ]);
});
test(
  "the database constraint preserves legacy rows and rejects empty new records",
  { timeout: 15000 },
  async () => {
    const db = new PGlite();
    try {
      await db.exec(
        "create table public.personal_records(name text, category text, weight_kg numeric, reps numeric, distance_km numeric, time_min numeric); insert into public.personal_records(name, category) values ('Legacy', 'force');",
      );
      await db.exec(recordMigration);
      await db.exec(recordMigration);
      await expect(
        db.exec("insert into public.personal_records(name, category) values ('Squat', 'force')"),
      ).rejects.toThrow();
      await db.exec(
        "insert into public.personal_records(name, category, weight_kg, reps) values ('Squat', 'force', 0, 1)",
      );
      await expect(
        db.exec(
          "insert into public.personal_records(name, category, distance_km) values ('Course', 'cardio', 0)",
        ),
      ).rejects.toThrow();
      expect(
        (await db.query("select * from public.personal_records where name = 'Legacy'")).rows,
      ).toHaveLength(1);
    } finally {
      await db.close();
    }
  },
);
