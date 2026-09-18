import { describe, expect, test } from "vite-plus/test";
import {
  maxActivitiesForObjective,
  minActivitiesForObjective,
  validateObjectiveCoherence,
  validateProgram,
  validateReplacement,
} from "./aiValidation";
import type { Program, UserProfile } from "./types";

function runningProgram(exerciseName: string): Program {
  return {
    program_overview: {
      duration_weeks: 1,
      training_days_per_week: 1,
      summary: "Préparation running",
    },
    weeks: [
      {
        week_number: 1,
        focus: "Endurance",
        sessions: [
          {
            day: "Lundi",
            session_id: "W1D1",
            type: "Endurance fondamentale",
            duration_min: 45,
            intensity: "Modérée",
            warmup: [],
            blocks: [
              {
                block_name: "Course",
                exercises: [{ name: exerciseName, sets: 1, reps: "30 min" }],
              },
            ],
            cooldown: [],
          },
        ],
      },
    ],
  };
}

describe("validateObjectiveCoherence", () => {
  test("accepte une séance spécifique au running", () => {
    expect(validateObjectiveCoherence(runningProgram("Course en zone 2"), "running")).toBeNull();
  });

  test("rejette le renforcement du haut du corps dans un programme running", () => {
    expect(validateObjectiveCoherence(runningProgram("Développé couché"), "running")).toContain(
      "incompatible avec le running",
    );
  });

  test("rejette un programme running sans véritable séance de course", () => {
    const program = runningProgram("Squat goblet");
    program.weeks[0].sessions[0].type = "Renforcement des jambes";
    program.weeks[0].sessions[0].blocks[0].block_name = "Force bas du corps";
    expect(validateObjectiveCoherence(program, "running")).toContain(
      "séance de course au lieu d'au moins 1",
    );
  });

  test("rejette un remplacement identique", () => {
    const exercise = { name: "Squat", sets: 3, reps: "10" };
    expect(validateReplacement(exercise, { ...exercise, name: "squat" }, "entretien")).toContain(
      "identique",
    );
  });

  test("n'impose pas un volume de musculation à une sortie longue", () => {
    expect(minActivitiesForObjective(90, "running")).toBe(4);
    expect(maxActivitiesForObjective(90, "running")).toBe(6);
    expect(minActivitiesForObjective(90, "prise-masse")).toBe(10);
    expect(maxActivitiesForObjective(90, "prise-masse")).toBe(14);
  });

  test("détecte une fréquence hebdomadaire incorrecte", () => {
    const program = runningProgram("Course en zone 2");
    const profile: UserProfile = {
      objective: "running",
      gender: "homme",
      age: 30,
      height: 180,
      weight: 75,
      level: "intermédiaire",
      equipment: [],
      sessionDuration: [45],
      weeklyFrequency: 3,
      likedExercises: [],
      dislikedExercises: [],
      injuries: "",
      nutritionRestrictions: "",
      availability: ["soir"],
    };

    expect(validateProgram(program, profile, 1).join(" ")).toContain("1 séances au lieu de 3");
  });
});
