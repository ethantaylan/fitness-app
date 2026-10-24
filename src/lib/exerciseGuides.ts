import guides from "./exerciseGuides.json";

import { normalizeExerciseName } from "./exerciseGuideKey";
export { normalizeExerciseName } from "./exerciseGuideKey";

export function findExerciseGuide(name: string) {
  const normalized = normalizeExerciseName(name);
  return guides.find((guide) =>
    guide.aliases.some((alias) => normalizeExerciseName(alias) === normalized),
  );
}
