/**
 * Shared application constants.
 * Single source of truth — import from here, never redefine locally.
 */
import type { ObjectiveType } from "./types";

// ── Objective metadata ────────────────────────────────────────────────────────

export interface ObjectiveMeta {
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

export const OBJECTIVE_META: Record<ObjectiveType, ObjectiveMeta> = {
  "perte-poids": {
    emoji: "🔥",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-400",
  },
  "prise-masse": {
    emoji: "💪",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-400",
  },
  entretien: {
    emoji: "🌿",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-400",
  },
  competition: {
    emoji: "🏆",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-400",
  },
  hyrox: { emoji: "⚡", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-400" },
  crossfit: { emoji: "🎯", color: "text-red-600", bg: "bg-red-50", border: "border-red-400" },
  running: { emoji: "👟", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-400" },
  yoga: { emoji: "🧘", color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-400" },
  "remise-en-forme": {
    emoji: "✨",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-400",
  },
};

// ── Equipment ─────────────────────────────────────────────────────────────────

export const EQUIPMENT_OPTIONS = [
  { label: "Haltères", emoji: "🏋️" },
  { label: "Barre + disques", emoji: "⚖️" },
  { label: "Kettlebell", emoji: "🔔" },
  { label: "Machine câbles", emoji: "⚙️" },
  { label: "Banc de musculation", emoji: "🛋️" },
  { label: "Rack / cage", emoji: "🏗️" },
  { label: "TRX / Sangles", emoji: "🪢" },
  { label: "Corde à sauter", emoji: "🪃" },
  { label: "Vélo / Rameur", emoji: "🚴" },
  { label: "Tapis de course", emoji: "🏃" },
  { label: "Poids du corps", emoji: "💪" },
] as const;

/** Flat string list — used for profile storage */
export const EQUIPMENT_LABELS = EQUIPMENT_OPTIONS.map((o) => o.label);

// ── Session duration ──────────────────────────────────────────────────────────

export type GoalDetailPreset = {
  label: string;
  sub: string;
};

export const GOAL_DETAIL_PRESETS: Record<ObjectiveType, GoalDetailPreset[]> = {
  "perte-poids": [
    {
      label: "Perdre 5 kg durablement",
      sub: "Priorité au rythme tenable et au maintien musculaire",
    },
    {
      label: "Réduire le tour de taille",
      sub: "Cardio, renforcement global et habitudes simples",
    },
    { label: "Recomposition corporelle", sub: "S'affiner sans chercher seulement la balance" },
    { label: "Retrouver souffle et énergie", sub: "Progression douce avec cardio accessible" },
  ],
  "prise-masse": [
    { label: "Hypertrophie générale", sub: "Volume progressif sur tout le corps" },
    { label: "Prendre 3 à 5 kg de masse", sub: "Muscle, technique et récupération" },
    { label: "Force + volume", sub: "Base lourde puis accessoires intelligents" },
    { label: "Focus haut du corps", sub: "Pecs, dos, epaules et bras sans oublier l'equilibre" },
    { label: "Focus jambes et fessiers", sub: "Squat, charniere de hanche et unilateral" },
  ],
  entretien: [
    { label: "Routine équilibrée", sub: "Renfo, cardio et mobilité chaque semaine" },
    { label: "Bouger sans pression", sub: "Plan stable, réaliste et facile à tenir" },
    { label: "Posture et prévention", sub: "Tronc, dos, hanches et épaules" },
    { label: "Cardio + renforcement", sub: "Santé générale et sensations athlétiques" },
  ],
  competition: [
    { label: "Préparation compétition", sub: "Cycle structuré avec pic de forme" },
    { label: "Objectif chrono ou score", sub: "Performance mesurable et progression ciblée" },
    { label: "Test physique", sub: "Cooper, Luc Léger, concours ou évaluation" },
    { label: "Retour a la competition", sub: "Remise en charge prudente apres pause" },
  ],
  hyrox: [
    { label: "Premier HYROX", sub: "Endurance, stations et transitions sans surcharger" },
    { label: "HYROX Open", sub: "Rythme course + stations au format officiel" },
    { label: "HYROX Pro", sub: "Charges plus lourdes et gestion d'effort avancée" },
    { label: "Ameliorer les transitions", sub: "Enchainements course/stations plus fluides" },
    { label: "Objectif chrono HYROX", sub: "Allures, pacing et points faibles prioritaires" },
  ],
  crossfit: [
    { label: "WODs plus solides", sub: "Conditionnement et mouvements fonctionnels" },
    { label: "Gymnastics skills", sub: "Pull-ups, toes-to-bar, handstand et controle" },
    { label: "Haltero technique", sub: "Clean, jerk, snatch et positions propres" },
    { label: "Open prep", sub: "Strategie, volume et standards CrossFit" },
    { label: "Moteur cardio", sub: "AMRAP, EMOM et intervalles mieux doses" },
  ],
  running: [
    { label: "Programme running régulier", sub: "Construire une base sans objectif chrono strict" },
    { label: "5 km en 25 minutes", sub: "Allure cible 5:00/km avec fractionné progressif" },
    { label: "10 km en 1 heure", sub: "Allure cible 6:00/km, endurance et tempo" },
    { label: "Semi-marathon", sub: "Endurance, seuil et sortie longue" },
    { label: "Marathon", sub: "Volume progressif, allure marathon et récupération" },
    { label: "Trail", sub: "Côtes, descente, appuis et sortie longue nature" },
  ],
  yoga: [
    { label: "Grand écart", sub: "Hanches, ischios, adducteurs et progression contrôlée" },
    { label: "Souplesse globale", sub: "Routine complète pour gagner en amplitude" },
    { label: "Mobilité hanches", sub: "Squat profond, fentes et ouverture progressive" },
    { label: "Mobilité épaules", sub: "Ouverture thoracique, overhead et posture" },
    { label: "Pont / backbend", sub: "Extension progressive, force profonde et respiration" },
    { label: "Yoga anti-stress", sub: "Respiration, yin et recuperation nerveuse" },
  ],
  "remise-en-forme": [
    { label: "Reprise après pause", sub: "Retrouver le rythme sans brutalité" },
    { label: "Moins essouffle", sub: "Endurance de base et renforcement accessible" },
    { label: "Posture et mobilité", sub: "Dos, hanches, épaules et gainage" },
    { label: "Renforcement doux", sub: "Poids du corps et progression simple" },
    { label: "Créer l'habitude", sub: "Séances courtes et régulières" },
  ],
};

export function isWeightObjective(objective?: ObjectiveType | ""): boolean {
  return objective === "perte-poids" || objective === "prise-masse";
}

export const DURATION_OPTIONS = [30, 45, 60, 90] as const;

// ── Feedback ──────────────────────────────────────────────────────────────────

export type FeedbackType = "good" | "normal" | "hard";

export interface FeedbackMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
  emoji: string;
}

export const FEEDBACK_META: Record<FeedbackType, FeedbackMeta> = {
  good: {
    label: "Bien passé",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    emoji: "👍",
  },
  normal: {
    label: "Normal",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    emoji: "😐",
  },
  hard: {
    label: "Trop dur",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    emoji: "💪",
  },
};

// ── Level metadata ────────────────────────────────────────────────────────────

export const LEVEL_META = {
  débutant: { emoji: "🌱", label: "Débutant" },
  intermédiaire: { emoji: "⚡", label: "Intermédiaire" },
  avancé: { emoji: "🔥", label: "Avancé" },
} as const;
