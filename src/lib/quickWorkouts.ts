/**
 * FONCTIONNALITÉ MASQUÉE — données du builder de séance libre (modèles rapides, minutes par activité).
 * Conservé pour la réactivation prévue : voir src/lib/features.ts et
 * docs/free-session-builder/README.md.
 */
/** Minutes ajoutées par activité du constructeur de séance libre. */
export const ITEM_MINUTES: Record<string, number> = {
  abdos: 7,
  pectoraux: 9,
  dos: 9,
  epaules: 8,
  biceps: 7,
  triceps: 7,
  jambes: 10,
  fessiers: 8,
  mollets: 5,
  lombaires: 6,
  cardio: 10,
  hiit: 10,
  gainage: 8,
  plyo: 8,
  etirements: 6,
  mobilite: 6,
  endurance: 15,
  fractionne: 10,
  cotes: 10,
  technique: 8,
  "renfo-running": 8,
  "recuperation-running": 10,
};
/** Échauffement et retour au calme, toujours inclus dans l'estimation. */
export const WARMUP_COOLDOWN_MIN = 10;

export function estimateMinutes(cart: Record<string, number>): number {
  return (
    WARMUP_COOLDOWN_MIN +
    Object.entries(cart).reduce((sum, [id, count]) => sum + count * (ITEM_MINUTES[id] ?? 8), 0)
  );
}

export interface QuickWorkout {
  id: string;
  label: string;
  /** Activités préremplies dans le constructeur (id d'activité → quantité). */
  cart: Record<string, number>;
}

const GENERAL: QuickWorkout[] = [
  { id: "etirements-express", label: "Étirements express", cart: { etirements: 1 } },
  { id: "recuperation", label: "Récupération", cart: { etirements: 2, mobilite: 1 } },
  { id: "cardio-abdos", label: "Cardio + abdos", cart: { cardio: 1, hiit: 1, abdos: 2 } },
  {
    id: "corps-entier",
    label: "Corps entier",
    cart: { pectoraux: 1, dos: 1, jambes: 1, abdos: 1 },
  },
  { id: "poussee", label: "Poussée", cart: { pectoraux: 2, epaules: 1, triceps: 1 } },
  { id: "tirage", label: "Tirage", cart: { dos: 2, biceps: 1, epaules: 1 } },
  { id: "jambes", label: "Jambes", cart: { jambes: 2, fessiers: 1, mollets: 1 } },
];
const RUNNING: QuickWorkout[] = [
  {
    id: "endurance-technique",
    label: "Endurance + technique",
    cart: { endurance: 1, technique: 1 },
  },
  {
    id: "fractionne-renfo",
    label: "Fractionné + renforcement",
    cart: { fractionne: 1, "renfo-running": 1 },
  },
  { id: "recuperation-running", label: "Récupération course", cart: { "recuperation-running": 1 } },
];
/**
 * Modèles rapides : les mêmes pour tout le monde. Le builder ne se base ni sur la discipline ni sur
 * le programme de l'utilisateur — chacun peut composer n'importe quel type de séance.
 */
export function quickWorkoutsFor(): QuickWorkout[] {
  return [...GENERAL, ...RUNNING];
}
