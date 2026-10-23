import { expect, test } from "vite-plus/test";
import {
  getProfileValidationError,
  getProfileBasicsError,
  needsProfileSetup,
  restoreTargetTimeline,
  targetTimelineForMonths,
  weeksUntilTargetDate,
} from "./profileValidation";
import type { UserProfile } from "./types";

const profile: UserProfile = {
  objective: "prise-masse",
  goalDetail: "Prendre du muscle",
  gender: "homme",
  age: 30,
  height: 180,
  weight: 80,
  level: "intermédiaire",
  weeklyFrequency: 3,
  sessionDuration: [30, 45, 60, 75, 90, 120],
  equipment: ["Haltères"],
  likedExercises: [],
  dislikedExercises: [],
  availability: ["soir"],
  injuries: "",
  nutritionRestrictions: "",
};

test("all six durations offered by onboarding can be submitted together", () => {
  expect(getProfileValidationError(profile)).toBeNull();
  expect(getProfileValidationError({ ...profile, sessionDuration: [] })).toContain("durées");
  expect(
    getProfileValidationError({ ...profile, sessionDuration: [30, 45, 60, 75, 90, 120, 150] }),
  ).toContain("durées");
});

test("long constraints and custom lists are caught before a generation request", () => {
  expect(
    getProfileValidationError({
      ...profile,
      goalDetail: "a".repeat(500),
      injuries: "a".repeat(2000),
      nutritionRestrictions: "a".repeat(2000),
      equipment: Array.from({ length: 30 }, () => "a".repeat(200)),
    }),
  ).toBeNull();
  expect(getProfileValidationError({ ...profile, goalDetail: "a".repeat(501) })).toContain("500");
  for (const field of ["injuries", "nutritionRestrictions"] as const) {
    expect(getProfileValidationError({ ...profile, [field]: "a".repeat(2001) })).toContain("2000");
  }
  for (const field of ["equipment", "likedExercises", "dislikedExercises"] as const) {
    expect(getProfileValidationError({ ...profile, [field]: ["a".repeat(201)] })).toContain("200");
    expect(
      getProfileValidationError({ ...profile, [field]: Array.from({ length: 31 }, () => "Squat") }),
    ).toContain("30");
  }
});

test("target weights outside the input bounds cannot reach generation", () => {
  expect(getProfileValidationError({ ...profile, targetWeight: 0 })).toContain("poids cible");
  expect(getProfileValidationError({ ...profile, targetWeight: 301 })).toContain("poids cible");
  expect(getProfileValidationError({ ...profile, targetWeight: Number.NaN })).toContain(
    "poids cible",
  );
});

test("prefilled timelines use the remaining duration instead of the six month default", () => {
  const today = new Date(2026, 9, 15, 12);
  expect(restoreTargetTimeline("2026-11-15", today)).toEqual({
    targetDurationMonths: "1",
    targetDate: "2026-11-15",
    targetDateReset: false,
  });
  expect(restoreTargetTimeline("2027-01-10", today)).toEqual({
    targetDurationMonths: "3",
    targetDate: "2027-01-10",
    targetDateReset: false,
  });
  for (const date of ["2026-01-15", "2026-10-15", "invalid", "2027-02-31"]) {
    expect(restoreTargetTimeline(date, today)).toEqual({
      ...targetTimelineForMonths(6, today),
      targetDateReset: true,
    });
  }
  expect(restoreTargetTimeline("2028-11-15", today)).toEqual({
    targetDurationMonths: "12",
    targetDate: "2028-11-15",
    targetDateReset: false,
  });
});

test("a deadline in two weeks stays exact and uses two weeks for the effort assessment", () => {
  const today = new Date(2026, 9, 15, 12);
  expect(restoreTargetTimeline("2026-10-29", today)).toEqual({
    targetDurationMonths: "1",
    targetDate: "2026-10-29",
    targetDateReset: false,
  });
  expect(weeksUntilTargetDate("2026-10-29", today)).toBe(2);
  expect(weeksUntilTargetDate("2027-01-10", today)).toBe(87 / 7);
  expect(weeksUntilTargetDate("invalid", today)).toBeNull();
});

test("month end deadlines stay inside the chosen calendar month", () => {
  expect(targetTimelineForMonths(1, new Date(2026, 0, 31, 12))).toEqual({
    targetDurationMonths: "1",
    targetDate: "2026-02-28",
  });
  expect(targetTimelineForMonths(1, new Date(2028, 0, 31, 12)).targetDate).toBe("2028-02-29");
});

test("missing profile fields identify the actual selection instead of measurements", () => {
  expect(getProfileBasicsError({ ...profile, objective: undefined })).toContain("discipline");
  expect(getProfileBasicsError({ ...profile, goalDetail: "" })).toContain("objectif");
  expect(getProfileBasicsError({ ...profile, gender: undefined })).toContain("genre");
  expect(getProfileBasicsError({ ...profile, level: undefined })).toContain("niveau");
  expect(getProfileBasicsError({ ...profile, age: NaN })).toContain("âge");
  expect(needsProfileSetup(null)).toBe(true);
  expect(needsProfileSetup({ ...profile, height: undefined })).toBe(true);
  expect(needsProfileSetup(profile)).toBe(false);
});
