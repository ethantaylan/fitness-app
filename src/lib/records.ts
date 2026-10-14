import type { PersonalRecord } from "./types";

export type RecordErrors = Partial<
  Record<"name" | "date" | "weight_kg" | "reps" | "distance_km" | "time_min", string>
>;

export function validateRecord(record: PersonalRecord): RecordErrors {
  const errors: RecordErrors = {};
  if (!record.name.trim()) errors.name = "Indique le nom de l'exercice.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || !Number.isFinite(new Date(record.date).getTime()))
    errors.date = "Choisis une date valide.";
  const positive = (key: "reps" | "distance_km" | "time_min") => {
    const value = record[key];
    if (value !== undefined && (!Number.isFinite(value) || value <= 0))
      errors[key] = "La valeur doit être supérieure à zéro.";
  };
  positive("reps");
  positive("distance_km");
  positive("time_min");
  if (record.reps !== undefined && !Number.isInteger(record.reps))
    errors.reps = "Indique un nombre entier de répétitions.";
  if (
    record.weight_kg !== undefined &&
    (!Number.isFinite(record.weight_kg) || record.weight_kg < 0)
  )
    errors.weight_kg = "La charge doit être positive ou nulle.";
  if (record.category === "force") {
    if (record.weight_kg === undefined)
      errors.weight_kg = "Indique la charge (0 kg pour une barre sans charge).";
    if (record.reps === undefined) errors.reps = "Indique le nombre de répétitions.";
  } else if (record.category === "cardio") {
    if (record.distance_km === undefined && record.time_min === undefined)
      errors.distance_km = "Indique au moins une distance ou une durée.";
  } else if (record.reps === undefined && record.time_min === undefined) {
    errors.reps = "Indique au moins des répétitions ou une durée.";
  }
  return errors;
}
