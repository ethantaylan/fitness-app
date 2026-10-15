import { describe, expect, test, vi } from "vite-plus/test";
import { clearPendingProgram, ProgramGeneration } from "./programGeneration";
import type { Program, UserProfile } from "./types";

const profile: UserProfile = {
  objective: "running",
  gender: "homme",
  age: 30,
  height: 180,
  weight: 75,
  level: "débutant",
  equipment: [],
  sessionDuration: [45],
  weeklyFrequency: 1,
  likedExercises: [],
  dislikedExercises: [],
  injuries: "",
  nutritionRestrictions: "",
  availability: ["soir"],
};
const fixture: Program = {
  program_overview: { duration_weeks: 1, training_days_per_week: 1, summary: "Fixture locale" },
  weeks: [{ week_number: 1, focus: "Endurance", sessions: [] }],
};
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("program generation recovery with local fixtures only", () => {
  test("reload retries only persistence with the same ID and result", async () => {
    const cache = storage();
    const generate = vi.fn(async () => fixture);
    const persist = vi.fn(async (_program: Program, _id: string) => {
      throw new Error("offline");
    });
    const onReady = vi.fn();
    const first = new ProgramGeneration({
      userId: "alice",
      storage: cache,
      generate,
      persist,
      onReady,
    });
    first.start(profile);
    await tick();
    expect(first.getState()).toMatchObject({ phase: "error", hasPendingProgram: true });
    const [savedProgram, savedId] = persist.mock.calls[0];
    expect(savedProgram.user_profile).toEqual(profile);
    expect(savedProgram.generated_at).toBeTruthy();
    first.dispose();

    const saveAfterReload = vi.fn(async () => {});
    const resumed = new ProgramGeneration({
      userId: "alice",
      storage: cache,
      generate,
      persist: saveAfterReload,
      onReady,
    });
    expect(resumed.getState()).toMatchObject({ phase: "error", hasPendingProgram: true });
    resumed.start({ ...profile, weight: 80 });
    resumed.dismiss();
    expect(resumed.getState()).toMatchObject({ hasPendingProgram: true });
    expect(generate).toHaveBeenCalledTimes(1);
    resumed.retry();
    await tick();
    expect(saveAfterReload).toHaveBeenCalledExactlyOnceWith(savedProgram, savedId);
    expect(resumed.getState()).toEqual({ phase: "idle" });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(
      new ProgramGeneration({
        userId: "alice",
        storage: cache,
        generate,
        persist,
        onReady,
      }).getState(),
    ).toEqual({ phase: "idle" });
  });

  test("duplicate starts and retries cannot issue concurrent requests", async () => {
    let receive!: (program: Program) => void;
    const generate = vi.fn(
      () =>
        new Promise<Program>((resolve) => {
          receive = resolve;
        }),
    );
    const persist = vi.fn(async () => {});
    const run = new ProgramGeneration({
      userId: "alice",
      storage: storage(),
      generate,
      persist,
      onReady: vi.fn(),
    });
    run.start(profile);
    run.start(profile);
    run.retry();
    expect(generate).toHaveBeenCalledTimes(1);
    receive(fixture);
    await tick();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  test("an unmounted account cannot cache or save a late generation result", async () => {
    let receive!: (program: Program) => void;
    const generate = vi.fn(
      () =>
        new Promise<Program>((resolve) => {
          receive = resolve;
        }),
    );
    const persist = vi.fn(async () => {});
    const cache = storage();
    const run = new ProgramGeneration({
      userId: "alice",
      storage: cache,
      generate,
      persist,
      onReady: vi.fn(),
    });
    run.start(profile);
    run.dispose();
    receive(fixture);
    await tick();
    expect(persist).not.toHaveBeenCalled();
    expect(cache.getItem("Vincere_pending_program_alice")).toBeNull();
  });

  test("drafts stay scoped to the account and are cleared on sign out", async () => {
    const cache = storage();
    const options = {
      storage: cache,
      generate: vi.fn(async () => fixture),
      persist: vi.fn(async () => {
        throw new Error("offline");
      }),
      onReady: vi.fn(),
    };
    const alice = new ProgramGeneration({ ...options, userId: "alice" });
    alice.start(profile);
    await tick();
    expect(new ProgramGeneration({ ...options, userId: "bob" }).getState()).toEqual({
      phase: "idle",
    });
    cache.setItem("Vincere_pending_program_bob", cache.getItem("Vincere_pending_program_alice")!);
    expect(new ProgramGeneration({ ...options, userId: "bob" }).getState()).toEqual({
      phase: "idle",
    });
    clearPendingProgram(cache, "alice");
    expect(new ProgramGeneration({ ...options, userId: "alice" }).getState()).toEqual({
      phase: "idle",
    });
  });

  test("storage failures retain the result in memory and do not prevent retries", async () => {
    const generate = vi.fn(async () => fixture);
    const persist = vi
      .fn<(_program: Program, _id: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const run = new ProgramGeneration({
      userId: "alice",
      storage: {
        ...storage(),
        setItem: () => {
          throw new Error("quota");
        },
      },
      generate,
      persist,
      onReady: vi.fn(),
    });
    run.start(profile);
    await tick();
    expect(run.getState()).toMatchObject({
      phase: "error",
      hasPendingProgram: true,
      message: expect.stringContaining("Garde cette page ouverte"),
    });
    run.retry();
    await tick();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[1][1]).toBe(persist.mock.calls[0][1]);
    expect(run.getState()).toEqual({ phase: "idle" });
  });

  test("a failure before receiving a result remains dismissible", async () => {
    const run = new ProgramGeneration({
      userId: "alice",
      storage: storage(),
      generate: vi.fn(async () => {
        throw new Error("Refus simulé");
      }),
      persist: vi.fn(),
      onReady: vi.fn(),
    });
    run.start(profile);
    await tick();
    expect(run.getState()).toEqual({
      phase: "error",
      hasPendingProgram: false,
      message: "Refus simulé",
    });
    run.dismiss();
    expect(run.getState()).toEqual({ phase: "idle" });
  });
});
