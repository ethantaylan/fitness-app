import type { UserProfile } from "./types";

export const PROFILE_LIMITS = {
  goalDetail: 500,
  constraints: 2000,
  label: 200,
  list: 30,
  sessionDurations: 6,
} as const;

export function isValidProfileList(items: string[]): boolean {
  return (
    items.length <= PROFILE_LIMITS.list &&
    items.every((item) => item.length <= PROFILE_LIMITS.label)
  );
}

/** Vérifie les limites du formulaire avant toute demande de génération. */
export function getProfileValidationError(profile: UserProfile): string | null {
  if (!profile.goalDetail?.trim() || profile.goalDetail.length > PROFILE_LIMITS.goalDetail)
    return `Précise ton objectif en ${PROFILE_LIMITS.goalDetail} caractères maximum.`;
  if (
    !Number.isFinite(profile.age) ||
    profile.age < 13 ||
    profile.age > 100 ||
    !Number.isFinite(profile.height) ||
    profile.height < 100 ||
    profile.height > 250 ||
    !Number.isFinite(profile.weight) ||
    profile.weight < 30 ||
    profile.weight > 300
  )
    return "Vérifie ton âge, ta taille et ton poids.";
  if (
    !Number.isInteger(profile.weeklyFrequency) ||
    profile.weeklyFrequency < 1 ||
    profile.weeklyFrequency > 7
  )
    return "Choisis une fréquence entre 1 et 7 séances par semaine.";
  if (
    profile.sessionDuration.length === 0 ||
    profile.sessionDuration.length > PROFILE_LIMITS.sessionDurations ||
    profile.sessionDuration.some(
      (duration) => !Number.isFinite(duration) || duration < 15 || duration > 180,
    )
  )
    return "Choisis entre 1 et 6 durées de séance, de 15 à 180 minutes.";
  for (const [label, items] of [
    ["Le matériel", profile.equipment],
    ["Les exercices aimés", profile.likedExercises],
    ["Les exercices à éviter", profile.dislikedExercises],
  ] as const) {
    if (!isValidProfileList(items))
      return `${label} : ${PROFILE_LIMITS.list} éléments maximum, de ${PROFILE_LIMITS.label} caractères chacun.`;
  }
  if (
    profile.injuries.length > PROFILE_LIMITS.constraints ||
    profile.nutritionRestrictions.length > PROFILE_LIMITS.constraints
  )
    return `Limite les blessures et les restrictions alimentaires à ${PROFILE_LIMITS.constraints} caractères par champ.`;
  if (
    profile.targetWeight !== undefined &&
    (!Number.isFinite(profile.targetWeight) ||
      profile.targetWeight < 30 ||
      profile.targetWeight > 300)
  )
    return "Le poids cible doit être compris entre 30 et 300 kg.";
  return null;
}

/** Le curseur représente des mois entiers à partir de la date du jour. */
export function targetTimelineForMonths(months: number, today = new Date()) {
  const safeMonths = Math.min(12, Math.max(1, Math.round(months)));
  const target = new Date(today.getFullYear(), today.getMonth() + safeMonths, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(today.getDate(), lastDay));
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return { targetDurationMonths: String(safeMonths), targetDate: `${year}-${month}-${day}` };
}

function parseTargetDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const target = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(target.getTime())) return null;
  const [year, month, day] = value.split("-").map(Number);
  return target.getFullYear() === year &&
    target.getMonth() === month - 1 &&
    target.getDate() === day
    ? target
    : null;
}

/** Nombre de semaines civiles restantes, indépendant du changement d'heure. */
export function weeksUntilTargetDate(targetDate: string, today = new Date()): number | null {
  const target = parseTargetDate(targetDate);
  if (!target) return null;
  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (targetDay - currentDay) / (7 * 24 * 60 * 60 * 1000);
}

/** Conserve la date précise ; le curseur donne seulement un repère arrondi en mois. */
export function restoreTargetTimeline(targetDate?: string, today = new Date()) {
  const target = parseTargetDate(targetDate);
  const weeks = targetDate ? weeksUntilTargetDate(targetDate, today) : null;
  if (!target || weeks === null || weeks <= 0)
    return { ...targetTimelineForMonths(6, today), targetDateReset: Boolean(targetDate) };
  const months =
    (target.getFullYear() - today.getFullYear()) * 12 +
    target.getMonth() -
    today.getMonth() +
    (target.getDate() - today.getDate()) / 31;
  return {
    targetDurationMonths: String(Math.min(12, Math.max(1, Math.round(months)))),
    targetDate: targetDate as string,
    targetDateReset: false,
  };
}
