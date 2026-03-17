import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Check, X } from "lucide-react";
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

const TOTAL_STEPS = 12;

const STEP_LABELS = [
  "Objectif",
  "Genre",
  "Niveau",
  "Mensuration",
  "Fréquence",
  "Durée",
  "Équipement",
  "Exercices",
  "Timing",
  "Contraintes",
  "Objectif chiffré",
  "Démarrer",
];

// Steps that auto-advance on selection (single-choice only)
const AUTO_ADVANCE = new Set([1, 2, 4]);

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
  targetDate: "",
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

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

const DATE_PRESETS = [
  { label: "3 mois", months: 3 },
  { label: "6 mois", months: 6 },
  { label: "1 an", months: 12 },
  { label: "18 mois", months: 18 },
  { label: "2 ans", months: 24 },
];

function addMonthsToToday(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split("T")[0];
}

function DatePicker({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (v: string) => void }>) {
  const today = new Date();
  const parsed = value ? new Date(`${value}T12:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }
  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    onChange(d.toISOString().split("T")[0]);
    setOpen(false);
  }

  const displayLabel = parsed
    ? parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "Choisir une date";

  return (
    <div>
      {/* Preset pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* No deadline option */}
        <button
          type="button"
          onClick={() => onChange("")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all active:scale-95 ${
            value === ""
              ? "bg-black text-white border-black"
              : "border-gray-200 hover:border-gray-400"
          }`}
        >
          Sans échéance
        </button>
        {DATE_PRESETS.map(({ label, months }) => {
          const preset = addMonthsToToday(months);
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(preset)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all active:scale-95 ${
                value === preset
                  ? "bg-black text-white border-black"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between border-2 rounded-2xl px-5 py-4 text-left transition-colors ${
          open ? "border-black" : "border-gray-200 hover:border-gray-400"
        }`}
      >
        <span className={`font-semibold text-sm ${value ? "text-black" : "text-gray-400"}`}>
          {displayLabel}
        </span>
        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {/* Calendar panel */}
      {open && (
        <div className="mt-2 border-2 border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-black text-sm">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = new Date(viewYear, viewMonth, day).toISOString().split("T")[0];
              const isPast =
                new Date(viewYear, viewMonth, day) <
                new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isSelected = value === dateStr;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => selectDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-black text-white font-black"
                      : isPast
                        ? "text-gray-300 cursor-not-allowed"
                        : "hover:bg-gray-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {/* Clear */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-3 w-full text-xs text-gray-400 hover:text-red-400 transition-colors py-1"
            >
              Effacer la date
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ChipToggle({
  label,
  selected,
  onClick,
}: Readonly<{ label: string; selected: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.96] ${
        selected ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-400"
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
  const { dispatch } = useApp();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  function update(data: Partial<FormState>) {
    setForm((f) => ({ ...f, ...data }));
  }

  function pick(data: Partial<FormState>) {
    setForm((f) => ({ ...f, ...data }));
    setTimeout(() => setStep((s) => s + 1), 220);
  }

  function toggleList(
    field: "equipment" | "likedExercises" | "dislikedExercises" | "sessionDuration",
    val: string,
  ) {
    setForm((f) => {
      const list = f[field];
      return { ...f, [field]: list.includes(val) ? list.filter((x) => x !== val) : [...list, val] };
    });
  }

  function toggleAvailability(val: AvailabilityType) {
    setForm((f) => ({
      ...f,
      availability: f.availability.includes(val)
        ? f.availability.filter((x) => x !== val)
        : [...f.availability, val],
    }));
  }

  function canProceed(): boolean {
    if (step === 0) return form.objective !== "";
    if (step === 3) return form.age !== "" && form.height !== "" && form.weight !== "";
    if (step === 5) return form.sessionDuration.length > 0;
    if (step === 8) return form.availability.length > 0;
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

  const showFooter = !AUTO_ADVANCE.has(step) && step < TOTAL_STEPS - 1;

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
                L&apos;IA sélectionnera l&apos;agent le mieux adapté.
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
                  onClick={() => pick({ gender: "homme" })}
                />
                <ChoiceCard
                  label="Femme"
                  emoji="👩"
                  selected={form.gender === "femme"}
                  onClick={() => pick({ gender: "femme" })}
                />
                <ChoiceCard
                  label="Autre / Je préfère ne pas préciser"
                  emoji="🧑"
                  selected={form.gender === "autre"}
                  onClick={() => pick({ gender: "autre" })}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Niveau */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Ton niveau&nbsp;?</h1>
              <p className="text-gray-500 text-sm mb-6">
                Sois honnête&nbsp;— l&apos;IA adapte tout.
              </p>
              <div className="space-y-3">
                <ChoiceCard
                  label="Débutant"
                  sub="Moins d'1 an de pratique"
                  emoji="🌱"
                  desc="Tu apprends les gestes de base, tu établis tes premières habitudes sportives et tu n’as pas encore de plan structuré."
                  selected={form.level === "débutant"}
                  onClick={() => pick({ level: "débutant" })}
                />
                <ChoiceCard
                  label="Intermédiaire"
                  sub="1 à 3 ans de pratique régulière"
                  emoji="⚡"
                  desc="Tu maîtrises les exercices fondamentaux, tu t’entraînes régulièrement et tu progresses encore de manière linéaire."
                  selected={form.level === "intermédiaire"}
                  onClick={() => pick({ level: "intermédiaire" })}
                />
                <ChoiceCard
                  label="Avancé"
                  sub="3+ ans, entraînement structuré"
                  emoji="🔥"
                  desc="Tu périodises ton entraînement, tu connais tes maximums et tu cherches à optimiser chaque variable pour continuer à progresser."
                  selected={form.level === "avancé"}
                  onClick={() => pick({ level: "avancé" })}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Corps */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Ton corps</h1>
              <p className="text-gray-500 text-sm mb-6">Calibre les charges et l&apos;intensité.</p>
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
                    onClick={() => pick({ weeklyFrequency: val })}
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
                    selected={form.equipment.includes(eq)}
                    onClick={() => toggleList("equipment", eq)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 7 — Exercices */}
          {step === 7 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Tes préférences</h1>
              <p className="text-gray-500 text-sm mb-6">
                L&apos;IA priorisera tes exercices favoris.
              </p>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-bold mb-3">
                    Exercices que tu <span className="text-green-600">kiffes</span> ✅
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_EXERCISES.map((ex) => (
                      <ChipToggle
                        key={ex}
                        label={ex}
                        selected={form.likedExercises.includes(ex)}
                        onClick={() => toggleList("likedExercises", ex)}
                      />
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-sm font-bold mb-3">
                    Exercices à <span className="text-red-500">éviter</span> ❌
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_EXERCISES.map((ex) => (
                      <ChipToggle
                        key={ex}
                        label={ex}
                        selected={form.dislikedExercises.includes(ex)}
                        onClick={() => toggleList("dislikedExercises", ex)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 8 — Disponibilité */}
          {step === 8 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Tu préfères t&apos;entraîner&hellip;</h1>
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

          {/* Step 9 — Contraintes */}
          {step === 9 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Contraintes</h1>
              <p className="text-gray-500 text-sm mb-6">
                L&apos;IA adapte pour protéger ton corps.
              </p>
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

          {/* Step 10 — Objectifs chiffrés */}
          {step === 10 && (
            <div>
              <h1 className="text-2xl font-black mb-1">Objectifs chiffrés</h1>
              <p className="text-gray-500 text-sm mb-1">
                Optionnel — aide l&apos;IA à calibrer la progression.
              </p>
              <button
                type="button"
                onClick={() => setStep(TOTAL_STEPS - 1)}
                className="inline-block text-xs bg-gray-100 text-gray-500 rounded-full px-3 py-1 mb-6 font-medium hover:bg-gray-200 transition-colors active:scale-95"
              >
                Tu peux passer cette étape →
              </button>
              <div className="space-y-4">
                <BigNumberInput
                  inputId="target-weight"
                  label="Poids cible"
                  unit="kg"
                  placeholder="80"
                  value={form.targetWeight}
                  min={30}
                  max={300}
                  onChange={(v) => update({ targetWeight: v })}
                />
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Date cible (compétition, évènement…)
                  </label>
                  <DatePicker value={form.targetDate} onChange={(v) => update({ targetDate: v })} />
                </div>
              </div>
            </div>
          )}

          {/* Step 11 — Démarrer */}
          {step === 11 && (
            <div>
              <div className="text-5xl mb-4">🚀</div>
              <h1 className="text-2xl font-black mb-1">C&apos;est parti&nbsp;!</h1>
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

      {/* Footer CTA (non-auto-advance steps) */}
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
            {step === 10 ? "Finaliser" : "Continuer →"}
          </button>
        </div>
      )}
    </div>
  );
}
