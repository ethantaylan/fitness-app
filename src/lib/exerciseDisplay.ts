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
/** Disciplines de maintien de posture : on parle de maintien et de respirations, pas de séries. */
export function usesHolds(objective?: string | null, type?: string | null): boolean {
  return objective === "yoga" || /yoga|mobilit|souplesse|[ée]tirement|stretch/i.test(type ?? "");
}
function holdMetrics(exercise: Exercise): Array<{ label: string; value: string }> {
  const metrics: Array<{ label: string; value: string }> = [];
  const reps = String(exercise.reps ?? "").trim();
  const breaths = reps.match(/(\d+(?:\s*[-–]\s*\d+)?)\s*respirations?/i);
  const timed = /\d\s*(min|minutes?|sec|secondes?|s|h|heures?)\b/i.test(reps);
  const secondsOnly = reps.match(/^(\d+)\s*(?:s|sec|secondes?)$/i);
  if (breaths) metrics.push({ label: "Respirations", value: breaths[1] });
  else if (timed)
    metrics.push({
      label: "Maintien",
      value: secondsOnly ? formatSeconds(Number(secondsOnly[1])) : reps,
    });
  else if (hasMeasure(reps))
    metrics.push({
      label: /^\d+(?:\s*[-–]\s*\d+)?$/.test(reps) ? "Respirations" : "Maintien",
      value: reps,
    });
  if (exercise.sets > 1) metrics.push({ label: "Passages", value: String(exercise.sets) });
  if ((exercise.rest_sec ?? 0) > 0)
    metrics.push({ label: "Pause", value: formatSeconds(exercise.rest_sec!) });
  return metrics;
}
export function exerciseMetrics(
  exercise: Exercise,
  options: { holds?: boolean } = {},
): Array<{ label: string; value: string }> {
  if (options.holds) return holdMetrics(exercise);
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
