import { expect, test, vi } from "vite-plus/test";
import {
  advanceProgramJob,
  initialProgramCheckpoint,
  publicProgramJob,
  type ProgramPlan,
  type ProgramSteps,
  type ProgramJob,
} from "./programJobs";
import { IncompleteStructuredResponseError } from "./programGeneration";
import type { Week, Session } from "../../../src/lib/types";

const session = (id: string, complete = true): Session => ({
  session_id: id,
  day: "Lundi",
  type: "Course",
  duration_min: 45,
  intensity: "Modérée",
  warmup: [],
  cooldown: [],
  blocks: complete
    ? [{ block_name: "Course", exercises: [{ name: "Course", sets: 1, reps: "30 min" }] }]
    : [],
});
const week = (number: number, complete = true): Week => ({
  week_number: number,
  focus: "Endurance",
  sessions: [session(`W${number}D1`, complete)],
});
const plan: ProgramPlan = {
  summary: "Plan fictif",
  phases: [],
  general_advice: "Progression",
  legal_disclaimer: "Fictif",
  nutrition_recommendations: undefined,
};
function steps(): ProgramSteps {
  return {
    plan: vi.fn(async () => plan),
    planErrors: () => [],
    weeks: vi.fn<ProgramSteps["weeks"]>(async (_plan, numbers) =>
      numbers.map((number) => week(number)),
    ),
    weekErrors: (weeks, expected) =>
      weeks.map((week) => week.week_number).join() === expected.join() ? [] : ["Missing week"],
    needsRepair: (weeks) =>
      weeks.flatMap((week) =>
        week.sessions.filter((session) => !session.blocks.length).map((session) => ({ session })),
      ),
    repair: vi.fn(async (_plan, original) => [session(original.session_id)]),
    validRepair: (_weeks, _original, candidate) => candidate.blocks.length > 0,
    assemble: (_plan, weeks, duration) => ({
      program_overview: { duration_weeks: duration, training_days_per_week: 1, summary: "Fixture" },
      weeks,
    }),
  };
}

test("every invocation makes at most one model request and a saved checkpoint survives a new worker", async () => {
  let checkpoint = initialProgramCheckpoint(4, 2);
  let program;
  const calls: string[] = [];
  for (let invocation = 0; invocation < 5; invocation++) {
    const worker = steps();
    const next = await advanceProgramJob(JSON.parse(JSON.stringify(checkpoint)), worker);
    const count = [worker.plan, worker.weeks, worker.repair].reduce(
      (sum, call) => sum + vi.mocked(call).mock.calls.length,
      0,
    );
    expect(count).toBeLessThanOrEqual(1);
    calls.push(count ? (checkpoint.plan ? "weeks" : "plan") : "save");
    checkpoint = next.checkpoint;
    if (next.program) {
      program = next.program;
      break;
    }
  }
  expect(calls).toEqual(["plan", "weeks", "weeks", "save"]);
  expect(program?.weeks.map((week) => week.week_number)).toEqual([1, 2, 3, 4]);
});

test("a truncated batch is split in the checkpoint without requesting more AI until the next invocation", async () => {
  const worker = steps();
  worker.weeks = vi.fn(async () => {
    throw new IncompleteStructuredResponseError();
  });
  const checkpoint = { ...initialProgramCheckpoint(4, 4), plan };
  const next = await advanceProgramJob(checkpoint, worker);
  expect(worker.weeks).toHaveBeenCalledTimes(1);
  expect(next.checkpoint.pending.map((batch) => batch.numbers)).toEqual([
    [1, 2],
    [3, 4],
  ]);
  expect(checkpoint.pending[0].numbers).toEqual([1, 2, 3, 4]);
});

test("a truncated plan is retried in a later invocation, with a bounded attempt count", async () => {
  const worker = steps();
  worker.plan = vi.fn(async () => {
    throw new IncompleteStructuredResponseError();
  });
  let next = await advanceProgramJob(initialProgramCheckpoint(8, 2), worker);
  expect(next.checkpoint.planAttempt).toBe(1);
  expect(worker.plan).toHaveBeenCalledTimes(1);
  next = await advanceProgramJob(next.checkpoint, worker);
  await expect(advanceProgramJob(next.checkpoint, worker)).rejects.toThrow(
    "réponse IA trop longue",
  );
  expect(worker.plan).toHaveBeenCalledTimes(3);
});

test("valid weeks and repaired sessions are never sent to the model again", async () => {
  const worker = steps();
  worker.weeks = vi.fn(async () => [week(1)]);
  let next = await advanceProgramJob({ ...initialProgramCheckpoint(2, 2), plan }, worker);
  expect(next.checkpoint.weeks.map((week) => week.week_number)).toEqual([1]);
  expect(next.checkpoint.pending[0].numbers).toEqual([2]);
  worker.weeks = vi.fn(async () => [week(2, false)]);
  next = await advanceProgramJob(next.checkpoint, worker);
  next = await advanceProgramJob(next.checkpoint, worker);
  expect(worker.repair).toHaveBeenCalledTimes(1);
  const done = await advanceProgramJob(next.checkpoint, worker);
  expect(done.program?.weeks).toHaveLength(2);
  expect(worker.weeks).toHaveBeenCalledTimes(1);
  expect(worker.repair).toHaveBeenCalledTimes(1);
});

test("the public status contains no worker credentials or stored input profile", () => {
  const job = {
    id: "job",
    user_id: "private-owner",
    profile: { injuries: "private" },
    lease_token: "private-token",
    checkpoint: initialProgramCheckpoint(8, 2),
    status: "running",
    error: null,
  } as unknown as ProgramJob;
  const result = JSON.stringify(publicProgramJob(job));
  expect(result).not.toContain("private");
  expect(result).not.toContain("lease");
});
