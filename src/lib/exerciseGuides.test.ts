import { describe, expect, it } from "vite-plus/test";
import distributedGuides from "../../public/exercises/everkinetic/guides.json";
const media = import.meta.glob("/public/exercises/everkinetic/*.webp");
import guides from "./exerciseGuides.json";
import { findExerciseGuide, normalizeExerciseName } from "./exerciseGuides";

describe("exercise demonstrations", () => {
  it("matches accent and punctuation variations, without guessing equipment", () => {
    expect(findExerciseGuide("  DEVELOPPE COUCHE HALTERES ")?.id).toBe("bench-press-dumbbell");
    expect(findExerciseGuide("Push-ups")?.id).toBe("push-ups");
    for (const name of [
      "Pompes inclinées",
      "Squat au poids du corps",
      "Squat",
      "Tractions supination",
      "Course en endurance",
      "Fentes arrière haltères",
    ])
      expect(findExerciseGuide(name)).toBeUndefined();
  });
  it("ships both local images and a unique verified alias for every guide", () => {
    const aliases = guides.flatMap((guide) => guide.aliases.map(normalizeExerciseName));
    expect(new Set(aliases).size).toBe(aliases.length);
    for (const guide of guides) {
      expect(guide.steps.length).toBeGreaterThanOrEqual(3);
      for (const position of [1, 2])
        expect(`/public/exercises/everkinetic/${guide.id}-${position}.webp` in media).toBe(true);
    }
    expect(distributedGuides).toEqual(guides);
  });
});
