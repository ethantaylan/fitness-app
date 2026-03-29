import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Plus, X } from "lucide-react";
import { useApp } from "../lib/store";
import { useAuth } from "../lib/auth";
import type {
  ObjectiveType,
  LevelType,
  GenderType,
  AvailabilityType,
  UserProfile,
} from "../lib/types";
import { OBJECTIVE_LABELS } from "../lib/agents";
import { EQUIPMENT_LABELS } from "../lib/constants";
import {
  addEquipmentLabel,
  getCustomEquipment,
  hasEquipmentLabel,
  normalizeEquipmentLabel,
  removeEquipmentLabel,
} from "../lib/equipment";

const TOTAL_STEPS = 13;

const STEP_LABELS = [
  "Objectif",
  "Genre",
  "Niveau",
  "Mensuration",
  "Fréquence",
  "Durée",
  "Équipement",
  "Exercices aimés",
  "Exercices à éviter",
  "Timing",
  "Contraintes",
  "Objectif chiffré",
  "Démarrer",
];

const OBJECTIVES: { id: ObjectiveType; emoji: string }[] = [
  { id: "perte-poids", emoji: "🔥" },
  { id: "prise-masse", emoji: "💪" },
  { id: "entretien", emoji: "⚡" },
  { id: "competition", emoji: "🏆" },
  { id: "hyrox", emoji: "🎯" },
  { id: "crossfit", emoji: "🤸" },
  { id: "running", emoji: "🏃" },
  { id: "yoga", emoji: "🧘" },
  { id: "remise-en-forme", emoji: "🌱" },
];

const COMMON_EXERCISES = [
  "Squat",
  "Développé couché",
  "Soulevé de terre",
  "Rowing barre",
  "Tractions",
  "Dips",
  "Développé militaire",
  "Fentes",
  "Hip thrust",
  "Gainage",
  "Burpees",
  "Box jump",
  "Kettlebell swing",
  "Pompes",
  "Abdos",
];

function normalizeExerciseLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function hasExerciseLabel(list: string[], candidate: string): boolean {
  const normalized = normalizeExerciseLabel(candidate).toLocaleLowerCase();
  if (!normalized) return false;

  return list.some((item) => normalizeExerciseLabel(item).toLocaleLowerCase() === normalized);
}

function addExerciseLabel(list: string[], candidate: string): string[] {
  const normalized = normalizeExerciseLabel(candidate);
  if (!normalized || hasExerciseLabel(list, normalized)) return list;
  return [...list, normalized];
}

function removeExerciseLabel(list: string[], candidate: string): string[] {
  const normalized = normalizeExerciseLabel(candidate).toLocaleLowerCase();
  return list.filter((item) => normalizeExerciseLabel(item).toLocaleLowerCase() !== normalized);
}

function isPresetExercise(label: string): boolean {
  const normalized = normalizeExerciseLabel(label).toLocaleLowerCase();
  return COMMON_EXERCISES.some((item) => item.toLocaleLowerCase() === normalized);
}

function getCustomExercises(list: string[]): string[] {
  return list.filter((item) => !isPresetExercise(item));
}

interface FormState {
  objective: ObjectiveType | "";
  gender: GenderType | "";
  level: LevelType | "";
  age: string;
  height: string;
  weight: string;
  weeklyFrequency: string;
  sessionDuration: string[];
  equipment: string[];
  likedExercises: string[];
  dislikedExercises: string[];
  availability: AvailabilityType[];
  injuries: string;
  nutritionRestrictions: string;
  targetWeight: string;
  targetDurationMonths: string;
  targetDate: string;
}

const defaultForm: FormState = {
  objective: "",
  gender: "",
  level: "",
  age: "",
  height: "",
  weight: "",
  weeklyFrequency: "3",
  sessionDuration: [],
  equipment: [],
  likedExercises: [],
  dislikedExercises: [],
  availability: [],
  injuries: "",
  nutritionRestrictions: "",
  targetWeight: "",
  targetDurationMonths: "6",
  targetDate: addMonthsToToday(6),
};

function ChoiceCard({
  label,
  sub,
  desc,
  emoji,
  selected,
  onClick,
}: Readonly<{
  label: string;
  sub?: string;
  desc?: string;
  emoji?: string;
  selected: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 border-2 rounded-2xl text-left transition-all duration-150 active:scale-[0.97] ${
        selected
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white hover:border-gray-400"
      }`}
    >
      {emoji && <span className="text-2xl shrink-0">{emoji}</span>}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] leading-tight">{label}</div>
        {sub && (
          <div className={`text-sm mt-0.5 ${selected ? "text-gray-300" : "text-gray-400"}`}>
            {sub}
          </div>
        )}
        {desc && (
          <div
            className={`text-xs mt-1 leading-relaxed ${selected ? "text-white/60" : "text-gray-400"}`}
          >
            {desc}
          </div>
        )}
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5 text-black" />
        </div>
      )}
    </button>
  );
}

const MIN_TARGET_MONTHS = 1;
const MAX_TARGET_MONTHS = 24;
const DEFAULT_TARGET_MONTHS = 6;

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsToToday(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return toDateInputValue(d);
}

function monthsToWeeks(months: number): number {
  return Math.max(4, Math.round(months * 4.345));
}

function formatDurationMonths(months: number): string {
  if (months === 12) return "1 an";
  if (months === 24) return "2 ans";
  if (months % 12 === 0 && months > 12) return `${months / 12} ans`;
  return `${months} mois`;
}

function formatSuggestedDuration(months: number): string {
  if (months > MAX_TARGET_MONTHS) return "plus de 24 mois";
  return formatDurationMonths(months);
}

function formatDateLabel(dateValue: string): string {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWeight(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

type TimelineAssessment = {
  tone: "neutral" | "good" | "warn" | "error";
  title: string;
  message: string;
};

function getTimelineAssessment(form: FormState): TimelineAssessment {
  const months = Number.parseInt(form.targetDurationMonths, 10);
  const safeMonths = Number.isNaN(months) ? DEFAULT_TARGET_MONTHS : months;
  const dateValue = form.targetDate || addMonthsToToday(safeMonths);

  if (!form.targetWeight) {
    return {
      tone: "neutral",
      title: `${formatDurationMonths(safeMonths)} sélectionnés`,
      message: `Programme calibré jusqu'au ${formatDateLabel(dateValue)}. Si tu vises un poids précis, ajoute-le pour vérifier le rythme.`,
    };
  }

  const currentWeight = Number.parseFloat(form.weight);
  const targetWeight = Number.parseFloat(form.targetWeight);

  if (Number.isNaN(currentWeight) || Number.isNaN(targetWeight)) {
    return {
      tone: "neutral",
      title: `${formatDurationMonths(safeMonths)} sélectionnés`,
      message: `On utilisera cette échéance pour structurer la progression jusqu'au ${formatDateLabel(dateValue)}.`,
    };
  }

  const diffKg = targetWeight - currentWeight;

  if (Math.abs(diffKg) < 0.1) {
    return {
      tone: "neutral",
      title: "Poids stable",
      message: `Tu gardes le même poids de référence sur ${formatDurationMonths(safeMonths)}. On peut surtout travailler la forme, la perf et la recomposition.`,
    };
  }

  const isLoss = diffKg < 0;
  const absDiffKg = Math.abs(diffKg);

  if (form.objective === "perte-poids" && !isLoss) {
    return {
      tone: "error",
      title: "Poids cible incohérent",
      message: `Avec un objectif perte de poids, ton poids cible doit être inférieur à ${formatWeight(currentWeight)} kg.`,
    };
  }

  if (form.objective === "prise-masse" && isLoss) {
    return {
      tone: "error",
      title: "Poids cible incohérent",
      message: `Avec un objectif prise de masse, ton poids cible doit être supérieur à ${formatWeight(currentWeight)} kg.`,
    };
  }

  const weeks = monthsToWeeks(safeMonths);
  const weeklyChange = absDiffKg / weeks;
  const recommendedWeekly = isLoss ? 0.75 : 0.3;
  const maxWeekly = isLoss ? 1 : 0.5;
  const minMonths = Math.max(MIN_TARGET_MONTHS, Math.ceil(absDiffKg / maxWeekly / 4.345));
  const comfortableMonths = Math.max(
    MIN_TARGET_MONTHS,
    Math.ceil(absDiffKg / recommendedWeekly / 4.345),
  );
  const directionLabel = isLoss ? "perte" : "prise";
  const weightSummary = `${formatWeight(currentWeight)} → ${formatWeight(targetWeight)} kg`;

  if (weeklyChange > maxWeekly) {
    return {
      tone: "error",
      title: "Délai trop agressif",
      message: `Passer de ${weightSummary} en ${formatDurationMonths(safeMonths)} demanderait une ${directionLabel} d'environ ${weeklyChange.toFixed(1)} kg/semaine. Vise plutôt ${formatSuggestedDuration(minMonths)} minimum, ou ajuste ton poids cible.`,
    };
  }

  if (weeklyChange > recommendedWeekly) {
    return {
      tone: "warn",
      title: "Objectif ambitieux",
      message: `${weightSummary} en ${formatDurationMonths(safeMonths)} représente environ ${weeklyChange.toFixed(1)} kg/semaine. C'est jouable, mais ${formatSuggestedDuration(comfortableMonths)} serait plus réaliste.`,
    };
  }

  return {
    tone: "good",
    title: "Délai cohérent",
    message: `${weightSummary} en ${formatDurationMonths(safeMonths)} représente environ ${weeklyChange.toFixed(1)} kg/semaine. C'est un rythme réaliste pour construire ton programme.`,
  };
}

function ChipToggle({
  label,
  selected,
  disabled = false,
  onClick,
}: Readonly<{ label: string; selected: boolean; disabled?: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl text-sm font-medium transition-all duration-150 ${
        disabled
          ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
          : selected
            ? "border-black bg-black text-white active:scale-[0.96]"
            : "border-gray-200 hover:border-gray-400 active:scale-[0.96]"
      }`}
    >
      {selected && <Check className="w-3 h-3 shrink-0" />}
      {label}
    </button>
  );
}

function BigNumberInput({
  label,
  unit,
  placeholder,
  value,
  min,
  max,
  inputId,
  onChange,
}: Readonly<{
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  min: number;
  max: number;
  inputId: string;
  onChange: (v: string) => void;
}>) {
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-semibold mb-2 text-gray-600">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 pr-16 text-xl font-bold focus:outline-none focus:border-black transition-colors"
        />
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
          {unit}
        </span>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [showCustomEquipmentInput, setShowCustomEquipmentInput] = useState(false);
  const [customEquipmentDraft, setCustomEquipmentDraft] = useState("");
  const [showLikedExerciseInput, setShowLikedExerciseInput] = useState(false);
  const [likedExerciseDraft, setLikedExerciseDraft] = useState("");
  const [showDislikedExerciseInput, setShowDislikedExerciseInput] = useState(false);
  const [dislikedExerciseDraft, setDislikedExerciseDraft] = useState("");
  const { dispatch } = useApp();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  function update(data: Partial<FormState>) {
    setForm((f) => ({ ...f, ...data }));
  }

  function toggleList(
    field: "equipment" | "likedExercises" | "dislikedExercises" | "sessionDuration",
    val: string,
  ) {
    setForm((f) => {
      if (field === "equipment") {
        return {
          ...f,
          equipment: hasEquipmentLabel(f.equipment, val)
            ? removeEquipmentLabel(f.equipment, val)
            : addEquipmentLabel(f.equipment, val),
        };
      }

      if (field === "likedExercises" || field === "dislikedExercises") {
        const oppositeField = field === "likedExercises" ? "dislikedExercises" : "likedExercises";
        const targetList = f[field];

        if (hasExerciseLabel(targetList, val)) {
          return {
            ...f,
            [field]: removeExerciseLabel(targetList, val),
          };
        }

        return {
          ...f,
          [field]: addExerciseLabel(targetList, val),
          [oppositeField]: removeExerciseLabel(f[oppositeField], val),
        };
      }

      const list = f[field];
      return { ...f, [field]: list.includes(val) ? list.filter((x) => x !== val) : [...list, val] };
    });
  }

  function addCustomEquipment() {
    const normalized = normalizeEquipmentLabel(customEquipmentDraft);
    if (!normalized || hasEquipmentLabel(form.equipment, normalized)) return;

    setForm((f) => ({
      ...f,
      equipment: addEquipmentLabel(f.equipment, normalized),
    }));
    setCustomEquipmentDraft("");
    setShowCustomEquipmentInput(false);
  }

  function addCustomExercise(field: "likedExercises" | "dislikedExercises") {
    const draft = field === "likedExercises" ? likedExerciseDraft : dislikedExerciseDraft;
    const normalized = normalizeExerciseLabel(draft);
    const oppositeField = field === "likedExercises" ? "dislikedExercises" : "likedExercises";
    if (
      !normalized ||
      hasExerciseLabel(form[field], normalized) ||
      hasExerciseLabel(form[oppositeField], normalized)
    ) {
      return;
    }

    setForm((f) => {
      return {
        ...f,
        [field]: addExerciseLabel(f[field], normalized),
        [oppositeField]: removeExerciseLabel(f[oppositeField], normalized),
      };
    });

    if (field === "likedExercises") {
      setLikedExerciseDraft("");
      setShowLikedExerciseInput(false);
    } else {
      setDislikedExerciseDraft("");
      setShowDislikedExerciseInput(false);
    }
  }

  function toggleAvailability(val: AvailabilityType) {
    setForm((f) => ({
      ...f,
      availability: f.availability.includes(val)
        ? f.availability.filter((x) => x !== val)
        : [...f.availability, val],
    }));
  }

  function updateTargetDuration(monthsValue: string) {
    const months = Number.parseInt(monthsValue, 10);
    if (Number.isNaN(months)) return;

    update({
      targetDurationMonths: monthsValue,
      targetDate: addMonthsToToday(months),
    });
  }

  function canProceed(): boolean {
    if (step === 0) return form.objective !== "";
    if (step === 1) return form.gender !== "";
    if (step === 2) return form.level !== "";
    if (step === 3) return form.age !== "" && form.height !== "" && form.weight !== "";
    if (step === 4) return form.weeklyFrequency !== "";
    if (step === 5) return form.sessionDuration.length > 0;
    if (step === 9) return form.availability.length > 0;
    if (step === 11) return getTimelineAssessment(form).tone !== "error";
    return true;
  }

  function saveProfile() {
    dispatch({
      type: "SET_PROFILE_PARTIAL",
      data: {
        objective: form.objective as ObjectiveType,
        gender: form.gender as GenderType,
        level: form.level as LevelType,
        age: Number.parseInt(form.age),
        height: Number.parseInt(form.height),
        weight: Number.parseFloat(form.weight),
        equipment: form.equipment,
        sessionDuration: form.sessionDuration.map((v) => Number.parseInt(v)),
        weeklyFrequency: Number.parseInt(form.weeklyFrequency),
        likedExercises: form.likedExercises,
        dislikedExercises: form.dislikedExercises,
        injuries: form.injuries,
        nutritionRestrictions: form.nutritionRestrictions,
        availability: form.availability,
        targetWeight: form.targetWeight ? Number.parseFloat(form.targetWeight) : undefined,
        targetDate: form.targetDate || undefined,
      } as Partial<UserProfile>,
    });
  }

  const showFooter = step < TOTAL_STEPS - 1;
  const customEquipment = getCustomEquipment(form.equipment);
  const canAddCustomEquipment =
    normalizeEquipmentLabel(customEquipmentDraft) !== "" &&
    !hasEquipmentLabel(form.equipment, customEquipmentDraft);
  const customLikedExercises = getCustomExercises(form.likedExercises);
  const canAddLikedExercise =
    normalizeExerciseLabel(likedExerciseDraft) !== "" &&
    !hasExerciseLabel(form.likedExercises, likedExerciseDraft) &&
    !hasExerciseLabel(form.dislikedExercises, likedExerciseDraft);
  const customDislikedExercises = getCustomExercises(form.dislikedExercises);
  const canAddDislikedExercise =
    normalizeExerciseLabel(dislikedExerciseDraft) !== "" &&
    !hasExerciseLabel(form.dislikedExercises, dislikedExerciseDraft) &&
    !hasExerciseLabel(form.likedExercises, dislikedExerciseDraft);
  const targetDurationMonths =
    Number.parseInt(form.targetDurationMonths, 10) || DEFAULT_TARGET_MONTHS;
  const targetTimelineAssessment = getTimelineAssessment(form);
  const targetTimelineDate = form.targetDate || addMonthsToToday(targetDurationMonths);
  const targetTimelineToneClasses = {
    neutral: "border-gray-200 bg-gray-50 text-gray-800",
    good: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
  } as const;

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ maxWidth: 480, margin: "0 auto" }}
    >
      {/* Header / progress bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {step === 0 ? (
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors shrink-0 -ml-1"
              aria-label="Retour à l'accueil"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors shrink-0 -ml-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {STEP_LABELS[step]}
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                {step + 1}&nbsp;/&nbsp;{TOTAL_STEPS}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 pt-8 pb-36 overflow-y-auto">
        <div key={step} className="animate-slide-up">
          {/* Step 0 — Objectif */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Ton objectif&nbsp;?</h1>
              <p className="text-gray-500 text-sm mb-6">
                L'IA sélectionnera l'agent le mieux adapté.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {OBJECTIVES.map(({ id, emoji }) => (
                  <button
                    key={id}
                    onClick={() => update({ objective: id })}
                    className={`flex flex-col items-start p-4 border-2 rounded-2xl text-left transition-all duration-150 active:scale-[0.96] ${
                      form.objective === id
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <span className="text-3xl mb-2.5">{emoji}</span>
                    <span
                      className={`text-[13px] font-semibold leading-tight ${form.objective === id ? "text-white" : "text-gray-800"}`}
                    >
                      {OBJECTIVE_LABELS[id]}
                    </span>
                    {form.objective === id && <Check className="w-3.5 h-3.5 mt-2 text-gray-300" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Genre */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Tu es&hellip;</h1>
              <p className="text-gray-500 text-sm mb-6">
                Pour calibrer les charges et la nutrition.
              </p>
              <div className="space-y-3">
                <ChoiceCard
                  label="Homme"
                  emoji="👨"
                  selected={form.gender === "homme"}
                  onClick={() => update({ gender: "homme" })}
                />
                <ChoiceCard
                  label="Femme"
                  emoji="👩"
                  selected={form.gender === "femme"}
                  onClick={() => update({ gender: "femme" })}
                />
                <ChoiceCard
                  label="Autre / Je préfère ne pas préciser"
                  emoji="🧑"
                  selected={form.gender === "autre"}
                  onClick={() => update({ gender: "autre" })}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Niveau */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Ton niveau&nbsp;?</h1>
              <p className="text-gray-500 text-sm mb-6">Sois honnête&nbsp;— l'IA adapte tout.</p>
              <div className="space-y-3">
                <ChoiceCard
                  label="Débutant"
                  sub="Moins d'1 an de pratique"
                  emoji="🌱"
                  desc="Tu apprends les gestes de base, tu établis tes premières habitudes sportives et tu n’as pas encore de plan structuré."
                  selected={form.level === "débutant"}
                  onClick={() => update({ level: "débutant" })}
                />
                <ChoiceCard
                  label="Intermédiaire"
                  sub="1 à 3 ans de pratique régulière"
                  emoji="⚡"
                  desc="Tu maîtrises les exercices fondamentaux, tu t’entraînes régulièrement et tu progresses encore de manière linéaire."
                  selected={form.level === "intermédiaire"}
                  onClick={() => update({ level: "intermédiaire" })}
                />
                <ChoiceCard
                  label="Avancé"
                  sub="3+ ans, entraînement structuré"
                  emoji="🔥"
                  desc="Tu périodises ton entraînement, tu connais tes maximums et tu cherches à optimiser chaque variable pour continuer à progresser."
                  selected={form.level === "avancé"}
                  onClick={() => update({ level: "avancé" })}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Corps */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Ton corps</h1>
              <p className="text-gray-500 text-sm mb-6">Calibre les charges et l'intensité.</p>
              <div className="space-y-4">
                <BigNumberInput
                  inputId="age"
                  label="Âge"
                  unit="ans"
                  placeholder="25"
                  value={form.age}
                  min={12}
                  max={100}
                  onChange={(v) => update({ age: v })}
                />
                <BigNumberInput
                  inputId="height"
                  label="Taille"
                  unit="cm"
                  placeholder="175"
                  value={form.height}
                  min={100}
                  max={250}
                  onChange={(v) => update({ height: v })}
                />
                <BigNumberInput
                  inputId="weight"
                  label="Poids actuel"
                  unit="kg"
                  placeholder="70"
                  value={form.weight}
                  min={30}
                  max={300}
                  onChange={(v) => update({ weight: v })}
                />
              </div>
            </div>
          )}

          {/* Step 4 — Fréquence */}
          {step === 4 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Combien de séances&nbsp;?</h1>
              <p className="text-gray-500 text-sm mb-6">Par semaine, en moyenne.</p>
              <div className="space-y-3">
                {[
                  { val: "2", label: "2 séances / semaine", sub: "Minimum — idéal débutant" },
                  { val: "3", label: "3 séances / semaine", sub: "Classique et efficace" },
                  { val: "4", label: "4 séances / semaine", sub: "Bonne progression" },
                  { val: "5", label: "5 séances / semaine", sub: "Athlète confirmé" },
                  { val: "6", label: "6 séances / semaine", sub: "Haute performance" },
                ].map(({ val, label, sub }) => (
                  <ChoiceCard
                    key={val}
                    label={label}
                    sub={sub}
                    selected={form.weeklyFrequency === val}
                    onClick={() => update({ weeklyFrequency: val })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — Durée */}
          {step === 5 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Durée par séance&nbsp;?</h1>
              <p className="text-gray-500 text-sm mb-1">Temps disponible, échauffement compris.</p>
              <p className="text-xs text-gray-400 mb-6">Sélection multiple possible</p>
              <div className="space-y-3">
                {[
                  { val: "30", label: "30 minutes", sub: "Express — très dense" },
                  { val: "45", label: "45 minutes", sub: "Recommandé pour commencer" },
                  { val: "60", label: "1 heure", sub: "Format standard" },
                  { val: "75", label: "1h15", sub: "Format confortable" },
                  { val: "90", label: "1h30", sub: "Séance complète" },
                  { val: "120", label: "2h00+", sub: "Entraînement long et intensif" },
                ].map(({ val, label, sub }) => (
                  <ChoiceCard
                    key={val}
                    label={label}
                    sub={sub}
                    selected={form.sessionDuration.includes(val)}
                    onClick={() => toggleList("sessionDuration", val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 6 — Équipement */}
          {step === 6 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Ton équipement</h1>
              <p className="text-gray-500 text-sm mb-1">Sélectionne tout ce dont tu disposes.</p>
              <p className="text-xs text-gray-400 mb-6">Sélection multiple&nbsp;· facultatif</p>
              <div className="flex flex-wrap gap-2.5">
                {EQUIPMENT_LABELS.map((eq) => (
                  <ChipToggle
                    key={eq}
                    label={eq}
                    selected={hasEquipmentLabel(form.equipment, eq)}
                    onClick={() => toggleList("equipment", eq)}
                  />
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Tu ne trouves pas ton matériel ?
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Ajoute-le ici, on l'intégrera aussi dans ton programme.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomEquipmentInput((open) => !open)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${
                      showCustomEquipmentInput
                        ? "bg-black text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {!showCustomEquipmentInput && <Plus className="w-3.5 h-3.5" />}
                    {showCustomEquipmentInput ? "Fermer" : "J'aimerais ajouter"}
                  </button>
                </div>

                {showCustomEquipmentInput && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={customEquipmentDraft}
                        onChange={(e) => setCustomEquipmentDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomEquipment();
                          }
                        }}
                        placeholder="Ex : élastiques, anneaux, médecine ball..."
                        className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addCustomEquipment}
                        disabled={!canAddCustomEquipment}
                        className="rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-gray-900"
                      >
                        Ajouter
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {normalizeEquipmentLabel(customEquipmentDraft) &&
                      hasEquipmentLabel(form.equipment, customEquipmentDraft)
                        ? "Ce matériel est déjà sélectionné."
                        : "Tu pourras ensuite le retirer d'un simple clic."}
                    </p>
                  </div>
                )}

                {customEquipment.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Ajouts perso
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {customEquipment.map((equipment) => (
                        <ChipToggle
                          key={equipment}
                          label={equipment}
                          selected
                          onClick={() => toggleList("equipment", equipment)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 7 — Exercices favoris */}
          {step === 7 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Exercices que tu kiffes ✅</h1>
              <p className="text-gray-500 text-sm mb-6">
                L'IA les priorisera quand c'est pertinent dans ton programme.
              </p>
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_EXERCISES.map((ex) => (
                      <ChipToggle
                        key={ex}
                        label={ex}
                        selected={hasExerciseLabel(form.likedExercises, ex)}
                        disabled={hasExerciseLabel(form.dislikedExercises, ex)}
                        onClick={() => toggleList("likedExercises", ex)}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-gray-400">
                    Les exercices déjà marqués dans “à éviter” sont bloqués ici.
                  </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Tu veux rajouter un autre exercice ?
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Tu peux aussi nous indiquer tes mouvements favoris plus spécifiques.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLikedExerciseInput((open) => !open)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${
                        showLikedExerciseInput
                          ? "bg-black text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {!showLikedExerciseInput && <Plus className="w-3.5 h-3.5" />}
                      {showLikedExerciseInput ? "Fermer" : "J'aimerais ajouter"}
                    </button>
                  </div>

                  {showLikedExerciseInput && (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          value={likedExerciseDraft}
                          onChange={(e) => setLikedExerciseDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomExercise("likedExercises");
                            }
                          }}
                          placeholder="Ex : farmer walk, tractions australiennes..."
                          className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => addCustomExercise("likedExercises")}
                          disabled={!canAddLikedExercise}
                          className="rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-gray-900"
                        >
                          Ajouter
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-gray-400">
                        {normalizeExerciseLabel(likedExerciseDraft) &&
                        hasExerciseLabel(form.likedExercises, likedExerciseDraft)
                          ? "Cet exercice est déjà sélectionné."
                          : normalizeExerciseLabel(likedExerciseDraft) &&
                              hasExerciseLabel(form.dislikedExercises, likedExerciseDraft)
                            ? "Retire-le d'abord de la liste “à éviter” pour le mettre ici."
                            : "Tu pourras ensuite le retirer d'un simple clic."}
                      </p>
                    </div>
                  )}

                  {customLikedExercises.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Ajouts perso
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {customLikedExercises.map((exercise) => (
                          <ChipToggle
                            key={exercise}
                            label={exercise}
                            selected
                            onClick={() => toggleList("likedExercises", exercise)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden border-t border-gray-100 pt-5">
                  <p className="text-sm font-bold mb-3">
                    Exercices à <span className="text-red-500">éviter</span> ❌
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_EXERCISES.map((ex) => (
                      <ChipToggle
                        key={ex}
                        label={ex}
                        selected={hasExerciseLabel(form.dislikedExercises, ex)}
                        onClick={() => toggleList("dislikedExercises", ex)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 8 — Exercices à éviter */}
          {step === 8 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Exercices à éviter ❌</h1>
              <p className="text-gray-500 text-sm mb-6">
                L'IA les écartera autant que possible dans tes séances.
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_EXERCISES.map((ex) => (
                  <ChipToggle
                    key={ex}
                    label={ex}
                    selected={hasExerciseLabel(form.dislikedExercises, ex)}
                    disabled={hasExerciseLabel(form.likedExercises, ex)}
                    onClick={() => toggleList("dislikedExercises", ex)}
                  />
                ))}
              </div>
              <p className="mt-3 text-[11px] text-gray-400">
                Les exercices déjà marqués dans “kiffés” sont bloqués ici.
              </p>

              <div className="mt-5 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Tu veux en signaler un autre ?
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Ajoute tout mouvement que tu n'aimes pas ou que tu veux éviter.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDislikedExerciseInput((open) => !open)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${
                      showDislikedExerciseInput
                        ? "bg-black text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {!showDislikedExerciseInput && <Plus className="w-3.5 h-3.5" />}
                    {showDislikedExerciseInput ? "Fermer" : "J'aimerais ajouter"}
                  </button>
                </div>

                {showDislikedExerciseInput && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={dislikedExerciseDraft}
                        onChange={(e) => setDislikedExerciseDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomExercise("dislikedExercises");
                          }
                        }}
                        placeholder="Ex : burpee broad jump, pistols, sprint côte..."
                        className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomExercise("dislikedExercises")}
                        disabled={!canAddDislikedExercise}
                        className="rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-gray-900"
                      >
                        Ajouter
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {normalizeExerciseLabel(dislikedExerciseDraft) &&
                      hasExerciseLabel(form.dislikedExercises, dislikedExerciseDraft)
                        ? "Cet exercice est déjà sélectionné."
                        : normalizeExerciseLabel(dislikedExerciseDraft) &&
                            hasExerciseLabel(form.likedExercises, dislikedExerciseDraft)
                          ? "Retire-le d'abord de la liste “kiffés” pour le mettre ici."
                          : "Tu pourras ensuite le retirer d'un simple clic."}
                    </p>
                  </div>
                )}

                {customDislikedExercises.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Ajouts perso
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {customDislikedExercises.map((exercise) => (
                        <ChipToggle
                          key={exercise}
                          label={exercise}
                          selected
                          onClick={() => toggleList("dislikedExercises", exercise)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 9 — Disponibilité */}
          {step === 9 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Tu préfères t'entraîner&hellip;</h1>
              <p className="text-gray-500 text-sm mb-6">On adapte les conseils de récupération.</p>
              <div className="space-y-3">
                {(
                  [
                    {
                      id: "matin",
                      label: "Le matin",
                      sub: "Avant 13h — boost métabolique",
                      emoji: "🌅",
                    },
                    {
                      id: "midi",
                      label: "Le midi",
                      sub: "Entre 12h et 14h — pause déjeuner",
                      emoji: "☀️",
                    },
                    { id: "soir", label: "Le soir", sub: "Après 17h — décompression", emoji: "🌙" },
                    {
                      id: "indifférent",
                      label: "Indifférent",
                      sub: "Pas de préférence horaire",
                      emoji: "🔄",
                    },
                  ] as { id: AvailabilityType; label: string; sub: string; emoji: string }[]
                ).map(({ id, label, sub, emoji }) => (
                  <ChoiceCard
                    key={id}
                    label={label}
                    sub={sub}
                    emoji={emoji}
                    selected={form.availability.includes(id)}
                    onClick={() => toggleAvailability(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 10 — Contraintes */}
          {step === 10 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Contraintes</h1>
              <p className="text-gray-500 text-sm mb-6">L'IA adapte pour protéger ton corps.</p>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="injuries"
                    className="block text-sm font-semibold mb-2 text-gray-700"
                  >
                    Blessures ou douleurs actuelles
                  </label>
                  <textarea
                    id="injuries"
                    value={form.injuries}
                    onChange={(e) => update({ injuries: e.target.value })}
                    placeholder="Ex : tendinite épaule droite, douleur genou gauche… (ou aucune)"
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-black transition-colors resize-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="nutrition"
                    className="block text-sm font-semibold mb-2 text-gray-700"
                  >
                    Restrictions alimentaires
                  </label>
                  <textarea
                    id="nutrition"
                    value={form.nutritionRestrictions}
                    onChange={(e) => update({ nutritionRestrictions: e.target.value })}
                    placeholder="Ex : végétarien, sans gluten, diabète… (ou aucune)"
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-black transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 11 — Objectifs chiffrés */}
          {step === 11 && (
            <div>
              <h1 className="text-2xl font-black mb-1">En combien de temps ?</h1>
              <p className="text-gray-500 text-sm mb-6">
                Définis ton délai avec le curseur. On vérifie aussi si le rythme reste crédible par
                rapport à ton objectif.
              </p>
              <div className="space-y-4">
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Délai visé</p>
                      <p className="mt-1 text-xs text-gray-500">Minimum 1 mois · maximum 2 ans</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-gray-900">
                        {formatDurationMonths(targetDurationMonths)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Jusqu'au {formatDateLabel(targetTimelineDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <input
                      type="range"
                      min={MIN_TARGET_MONTHS}
                      max={MAX_TARGET_MONTHS}
                      step={1}
                      value={targetDurationMonths}
                      onChange={(e) => updateTargetDuration(e.target.value)}
                      className="range range-sm w-full accent-black"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-gray-400">
                      <span>1 mois</span>
                      <span>12 mois</span>
                      <span>24 mois</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Échéance
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {formatDateLabel(targetTimelineDate)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Durée estimée
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {monthsToWeeks(targetDurationMonths)} semaines
                      </p>
                    </div>
                  </div>
                </div>

                <BigNumberInput
                  inputId="target-weight"
                  label="Poids cible (optionnel)"
                  unit="kg"
                  placeholder="80"
                  value={form.targetWeight}
                  min={30}
                  max={300}
                  onChange={(v) => update({ targetWeight: v })}
                />

                <div
                  className={`rounded-3xl border p-4 ${targetTimelineToneClasses[targetTimelineAssessment.tone]}`}
                >
                  <p className="text-sm font-bold">{targetTimelineAssessment.title}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {targetTimelineAssessment.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 12 — Démarrer */}
          {step === 12 && (
            <div>
              <div className="text-5xl mb-4">🚀</div>
              <h1 className="text-2xl font-black mb-1">C'est parti&nbsp;!</h1>
              <p className="text-gray-500 text-sm mb-8">
                Comment veux-tu récupérer ton programme&nbsp;?
              </p>
              <div className="space-y-3">
                {isSignedIn ? (
                  <button
                    onClick={() => {
                      saveProfile();
                      void navigate("/generating");
                    }}
                    className="w-full flex items-start gap-4 bg-black text-white rounded-2xl p-5 text-left hover:bg-gray-900 transition-all active:scale-[0.98]"
                  >
                    <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center shrink-0 text-xl">
                      🚀
                    </div>
                    <div>
                      <div className="font-bold text-[15px]">Générer mon programme</div>
                      <div className="text-sm text-gray-300 mt-1 leading-relaxed">
                        Ton profil est sauvegardé&nbsp;· programme complet avec PDF
                      </div>
                    </div>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        saveProfile();
                        void navigate("/sign-up");
                      }}
                      className="w-full flex items-start gap-4 bg-black text-white rounded-2xl p-5 text-left hover:bg-gray-900 transition-all active:scale-[0.98]"
                    >
                      <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center shrink-0 text-xl">
                        🚀
                      </div>
                      <div>
                        <div className="font-bold text-[15px]">Créer un compte (recommandé)</div>
                        <div className="text-sm text-gray-300 mt-1 leading-relaxed">
                          PDF + séances quotidiennes&nbsp;· suivi de progression&nbsp;· ajustements
                          IA
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        saveProfile();
                        void navigate("/generating");
                      }}
                      className="w-full flex items-start gap-4 border-2 border-gray-200 rounded-2xl p-5 text-left hover:border-gray-400 transition-all active:scale-[0.98]"
                    >
                      <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-xl">
                        📄
                      </div>
                      <div>
                        <div className="font-bold text-[15px]">PDF uniquement</div>
                        <div className="text-sm text-gray-500 mt-1 leading-relaxed">
                          Génération immédiate, téléchargement PDF. Aucun compte requis.
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      {showFooter && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 pt-3"
          style={{ maxWidth: 480, paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="w-full bg-black text-white font-bold py-4 rounded-2xl text-[15px] disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors active:scale-[0.98]"
          >
            {step === 11 ? "Finaliser" : "Continuer →"}
          </button>
        </div>
      )}
    </div>
  );
}
