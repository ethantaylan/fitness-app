import { describe, expect, test } from "vite-plus/test";
import { validateObjectiveCoherence } from "./openai";
import type { Program } from "./types";

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
});
