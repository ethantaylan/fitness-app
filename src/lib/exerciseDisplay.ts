import type { Exercise } from "./types";
import { formatLoadValue } from "./formatLoad";

export function hasMeasure(value?: string | number | null): boolean {
  return (
    value !== undefined &&
    value !== null &&
    !/^(?:\s*|n\/?a|nan|infinity|non applicable|aucun|none|null|undefined|[-—]|0(?:[.,]0)?(?:\s*kg)?)$/i.test(
      String(value).trim(),
    )
  );
}
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes} min${remainder ? ` ${remainder} s` : ""}`;
}
export function exerciseMetrics(exercise: Exercise): Array<{ label: string; value: string }> {
  const metrics: Array<{ label: string; value: string }> = [];
  const reps = String(exercise.reps ?? "").trim();
  const timed = /\d\s*(min|minutes?|sec|secondes?|s|h|heures?)\b/i.test(reps);
  const distance = /\d\s*(km|m|mètres?|metres?)\b/i.test(reps);
  const secondsOnly = reps.match(/^(\d+)\s*(?:s|sec|secondes?)$/i);
  if (exercise.sets > 1 || (!timed && !distance && exercise.sets > 0))
    metrics.push({ label: exercise.sets === 1 ? "Série" : "Séries", value: String(exercise.sets) });
  if (hasMeasure(reps))
    metrics.push({
      label: timed
        ? "Durée"
        : distance
          ? "Distance"
          : /^\d+(?:\s*[-–]\s*\d+)?$/.test(reps)
            ? "Répétitions"
            : "Travail",
      value: secondsOnly ? formatSeconds(Number(secondsOnly[1])) : reps,
    });
  if (hasMeasure(exercise.load_kg))
    metrics.push({ label: "Charge", value: formatLoadValue(exercise.load_kg, "") });
  if ((exercise.rest_sec ?? 0) > 0)
    metrics.push({ label: "Repos", value: formatSeconds(exercise.rest_sec!) });
  if (hasMeasure(exercise.tempo)) metrics.push({ label: "Tempo", value: exercise.tempo! });
  return metrics;
}
export function workoutTitle(session: { goal?: string; blocks: { block_name: string }[] }): string {
  const goal = session.goal?.trim();
  if (goal && goal.length <= 55) return goal;
  const blocks = session.blocks.map((block) => block.block_name).filter(Boolean);
  return blocks.slice(0, 2).join(" · ") || "Séance libre";
}
