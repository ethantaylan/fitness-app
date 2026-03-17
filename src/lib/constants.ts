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
