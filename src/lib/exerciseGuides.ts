import guides from "./exerciseGuides.json";

/** Exact aliases only: equipment and variations must never be guessed. */
export function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findExerciseGuide(name: string) {
  const normalized = normalizeExerciseName(name);
  return guides.find((guide) =>
    guide.aliases.some((alias) => normalizeExerciseName(alias) === normalized),
  );
}
