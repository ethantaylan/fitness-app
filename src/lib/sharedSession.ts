import type { DailySession, Exercise, WarmupItem } from "./types";

export function encodeSharedSession(session: DailySession): string {
  const { date, intensity, goal, duration_min, warmup, cooldown } = session;
  const blocks = session.blocks.map(({ block_name, exercises }) => ({
    block_name,
    exercises: exercises.map(({ name, sets, reps, load_kg, tempo, rest_sec, alternative }) => ({
      name,
      sets,
      reps,
      load_kg,
      tempo,
      rest_sec,
      alternative,
    })),
  }));
  return btoa(
    encodeURIComponent(
      JSON.stringify({
        date,
        intensity,
        goal,
        duration_min,
        warmup,
        blocks,
        cooldown,
        motivation_message: "",
      }),
    ),
  );
}

const text = (value: unknown, max = 2000): value is string =>
  typeof value === "string" && value.length <= max;
const number = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10000;
const optionalText = (value: unknown) => value === undefined || text(value);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const warmup = (value: unknown): value is WarmupItem =>
  record(value) &&
  text(value.name) &&
  (value.duration_sec === undefined || number(value.duration_sec)) &&
  (value.reps === undefined || number(value.reps));
const exercise = (value: unknown): value is Exercise =>
  record(value) &&
  text(value.name) &&
  number(value.sets) &&
  (text(value.reps) || number(value.reps)) &&
  [value.load_kg, value.tempo, value.alternative, value.notes].every(optionalText) &&
  (value.rest_sec === undefined || number(value.rest_sec));

export function parseSharedSession(encoded: string | null): DailySession | null {
  if (!encoded || encoded.length > 100000) return null;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(atob(encoded)));
    if (
      !record(value) ||
      !text(value.date) ||
      !text(value.intensity) ||
      !text(value.goal) ||
      !number(value.duration_min) ||
      !optionalText(value.motivation_message)
    )
      return null;
    if (
      ![value.warmup, value.cooldown].every(
        (items) => Array.isArray(items) && items.length <= 30 && items.every(warmup),
      )
    )
      return null;
    if (
      !Array.isArray(value.blocks) ||
      value.blocks.length > 20 ||
      !value.blocks.every(
        (block: unknown) =>
          record(block) &&
          text(block.block_name) &&
          Array.isArray(block.exercises) &&
          block.exercises.length <= 40 &&
          block.exercises.every(exercise),
      )
    )
      return null;
    return {
      ...value,
      uid: "shared",
      motivation_message: value.motivation_message ?? "",
    } as unknown as DailySession;
  } catch {
    return null;
  }
}
