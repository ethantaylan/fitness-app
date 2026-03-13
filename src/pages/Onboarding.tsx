import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, X, Plus } from "lucide-react";
import { useApp } from "../lib/store";
import type {
  ObjectiveType,
  LevelType,
  GenderType,
  AvailabilityType,
  UserProfile,
} from "../lib/types";
import { OBJECTIVE_LABELS } from "../lib/agents";

const TOTAL_STEPS = 6;

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

const EQUIPMENT_OPTIONS = [
  "Haltères",
  "Barre + disques",
  "Kettlebell",
  "Machine câbles",
  "Banc de musculation",
  "Rack / cage",
  "TRX / Sangles",
  "Corde à sauter",
  "Vélo / Rameur",
  "Tapis de course",
  "Poids du corps uniquement",
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
];

interface FormState {
  // Step 1
  objective: ObjectiveType | "";
  // Step 2
  gender: GenderType | "";
  age: string;
  height: string;
  weight: string;
  level: LevelType | "";
  // Step 3
  equipment: string[];
  sessionDuration: string;
  weeklyFrequency: string;
  likedExercises: string[];
  dislikedExercises: string[];
  // Step 4
  injuries: string;
  nutritionRestrictions: string;
  availability: AvailabilityType | "";
  // Step 5 (optional)
  targetWeight: string;
  targetDate: string;
  // Step 6 handled by navigation
}

const defaultForm: FormState = {
  objective: "",
  gender: "",
  age: "",
  height: "",
  weight: "",
  level: "",
  equipment: [],
  sessionDuration: "45",
  weeklyFrequency: "3",
  likedExercises: [],
  dislikedExercises: [],
  injuries: "",
  nutritionRestrictions: "",
  availability: "",
  targetWeight: "",
  targetDate: "",
};

// TagInput component for liked/disliked exercises
function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-black text-white text-sm px-3 py-1 rounded-full"
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-gray-300">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-black"
        />
        <button
          onClick={() => addTag(input)}
          className="border border-gray-300 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {suggestions
          .filter((s) => !value.includes(s))
          .slice(0, 8)
          .map((s) => (
            <button
              key={s}
              onClick={() => addTag(s)}
              className="text-xs border border-gray-200 rounded-full px-2.5 py-1 hover:border-black hover:bg-black hover:text-white transition-all"
            >
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const { dispatch } = useApp();
  const navigate = useNavigate();

  function update(data: Partial<FormState>) {
    setForm((f) => ({ ...f, ...data }));
  }

  function canProceed(): boolean {
    if (step === 0) return form.objective !== "";
    if (step === 1)
      return (
        form.gender !== "" &&
        form.age !== "" &&
        form.height !== "" &&
        form.weight !== "" &&
        form.level !== ""
      );
    if (step === 2) return form.weeklyFrequency !== "" && form.sessionDuration !== "";
    if (step === 3) return form.availability !== "";
    if (step === 4) return true; // optional step
    return true;
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  }

  function startAnonymous() {
    saveProfile();
    void navigate("/generating");
  }

  function startWithAccount() {
    saveProfile();
    void navigate("/register");
  }

  function saveProfile() {
    const profile: Partial<UserProfile> = {
      objective: form.objective as ObjectiveType,
      gender: form.gender as GenderType,
      age: parseInt(form.age),
      height: parseInt(form.height),
      weight: parseFloat(form.weight),
      level: form.level as LevelType,
      equipment: form.equipment,
      sessionDuration: parseInt(form.sessionDuration),
      weeklyFrequency: parseInt(form.weeklyFrequency),
      likedExercises: form.likedExercises,
      dislikedExercises: form.dislikedExercises,
      injuries: form.injuries,
      nutritionRestrictions: form.nutritionRestrictions,
      availability: form.availability as AvailabilityType,
      targetWeight: form.targetWeight ? parseFloat(form.targetWeight) : undefined,
      targetDate: form.targetDate || undefined,
    };
    dispatch({ type: "SET_PROFILE_PARTIAL", data: profile });
  }

  const steps = [
    "Objectif",
    "Profil",
    "Préférences",
    "Contraintes",
    "Objectifs chiffrés",
    "Démarrer",
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress header */}
      <div className="fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {steps[step]}
            </span>
            <span className="text-xs text-gray-400">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center pt-28 pb-24 px-4">
        <div className="w-full max-w-xl">
          {/* Step 0: Objective */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2">Quel est ton objectif ?</h1>
              <p className="text-gray-500 mb-8">On choisit l'agent IA le mieux adapté pour toi.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {OBJECTIVES.map(({ id, emoji }) => (
                  <button
                    key={id}
                    onClick={() => update({ objective: id })}
                    className={`flex flex-col items-start p-4 border-2 rounded-2xl text-left transition-all ${
                      form.objective === id
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-black"
                    }`}
                  >
                    <span className="text-2xl mb-2">{emoji}</span>
                    <span className="text-sm font-semibold leading-tight">
                      {OBJECTIVE_LABELS[id]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2">Ton profil</h1>
              <p className="text-gray-500 mb-8">
                Ces données permettent de calibrer les charges et l'intensité.
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Genre</label>
                  <div className="flex gap-3">
                    {(["homme", "femme", "autre"] as GenderType[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => update({ gender: g })}
                        className={`flex-1 py-2.5 border-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                          form.gender === g
                            ? "border-black bg-black text-white"
                            : "border-gray-200 hover:border-black"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Âge", key: "age", unit: "ans", type: "number", min: 12, max: 100 },
                    {
                      label: "Taille",
                      key: "height",
                      unit: "cm",
                      type: "number",
                      min: 100,
                      max: 250,
                    },
                    {
                      label: "Poids",
                      key: "weight",
                      unit: "kg",
                      type: "number",
                      min: 30,
                      max: 300,
                    },
                  ].map(({ label, key, unit, type, min, max }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold mb-1">{label}</label>
                      <div className="relative">
                        <input
                          type={type}
                          min={min}
                          max={max}
                          value={form[key as keyof FormState] as string}
                          onChange={(e) => update({ [key]: e.target.value })}
                          placeholder="—"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-black"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Niveau sportif</label>
                  <div className="flex gap-3">
                    {(
                      [
                        { id: "débutant", label: "Débutant", desc: "< 1 an" },
                        { id: "intermédiaire", label: "Intermédiaire", desc: "1-3 ans" },
                        { id: "avancé", label: "Avancé", desc: "3+ ans" },
                      ] as { id: LevelType; label: string; desc: string }[]
                    ).map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => update({ level: id })}
                        className={`flex-1 py-3 border-2 rounded-xl text-left px-3 transition-all ${
                          form.level === id
                            ? "border-black bg-black text-white"
                            : "border-gray-200 hover:border-black"
                        }`}
                      >
                        <div className="text-sm font-semibold">{label}</div>
                        <div
                          className={`text-xs ${form.level === id ? "text-gray-300" : "text-gray-400"}`}
                        >
                          {desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2">Tes préférences</h1>
              <p className="text-gray-500 mb-8">Pour que le programme s'adapte à ta vie.</p>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Séances / semaine</label>
                    <select
                      value={form.weeklyFrequency}
                      onChange={(e) => update({ weeklyFrequency: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                    >
                      {[2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} séances
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Durée par séance</label>
                    <select
                      value={form.sessionDuration}
                      onChange={(e) => update({ sessionDuration: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                    >
                      {[30, 45, 60, 75, 90].map((n) => (
                        <option key={n} value={n}>
                          {n} min
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Matériel disponible</label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <button
                        key={eq}
                        onClick={() =>
                          update({
                            equipment: form.equipment.includes(eq)
                              ? form.equipment.filter((e) => e !== eq)
                              : [...form.equipment, eq],
                          })
                        }
                        className={`text-sm px-3 py-1.5 border rounded-full transition-all ${
                          form.equipment.includes(eq)
                            ? "bg-black text-white border-black"
                            : "border-gray-200 hover:border-black"
                        }`}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Exercices que tu kiffes
                  </label>
                  <TagInput
                    value={form.likedExercises}
                    onChange={(tags) => update({ likedExercises: tags })}
                    suggestions={COMMON_EXERCISES}
                    placeholder="Ex: Squat, Développé couché..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Exercices à éviter</label>
                  <TagInput
                    value={form.dislikedExercises}
                    onChange={(tags) => update({ dislikedExercises: tags })}
                    suggestions={COMMON_EXERCISES}
                    placeholder="Ex: Burpees, Fentes..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Constraints */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2">Contraintes & sécurité</h1>
              <p className="text-gray-500 mb-8">Le coach adapte tout pour protéger ton corps.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Blessures ou douleurs actuelles
                  </label>
                  <textarea
                    value={form.injuries}
                    onChange={(e) => update({ injuries: e.target.value })}
                    placeholder="Ex: Tendinite épaule droite, douleur genou gauche... (ou aucune)"
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Restrictions alimentaires
                  </label>
                  <textarea
                    value={form.nutritionRestrictions}
                    onChange={(e) => update({ nutritionRestrictions: e.target.value })}
                    placeholder="Ex: Végétarien, sans gluten, diabète… (ou aucune)"
                    rows={2}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Disponibilité horaire préférée
                  </label>
                  <div className="flex gap-3">
                    {(["matin", "soir", "indifférent"] as AvailabilityType[]).map((a) => (
                      <button
                        key={a}
                        onClick={() => update({ availability: a })}
                        className={`flex-1 py-3 border-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                          form.availability === a
                            ? "border-black bg-black text-white"
                            : "border-gray-200 hover:border-black"
                        }`}
                      >
                        {a === "matin" ? "🌅 Matin" : a === "soir" ? "🌙 Soir" : "🔄 Indifférent"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Quantified goals (optional) */}
          {step === 4 && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2">Objectifs chiffrés</h1>
              <p className="text-gray-500 mb-2">
                Optionnel — mais ça aide l'IA à calibrer la progression.
              </p>
              <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded-full px-3 py-1 mb-8">
                Tu peux passer cette étape
              </span>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-1">Poids cible (kg)</label>
                  <div className="relative max-w-40">
                    <input
                      type="number"
                      value={form.targetWeight}
                      onChange={(e) => update({ targetWeight: e.target.value })}
                      placeholder="Ex: 80"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-black"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      kg
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Date cible (compétition, événement...)
                  </label>
                  <input
                    type="date"
                    value={form.targetDate}
                    onChange={(e) => update({ targetDate: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Account or anonymous */}
          {step === 5 && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2">Dernière étape !</h1>
              <p className="text-gray-500 mb-8">Comment tu veux récupérer ton programme ?</p>
              <div className="space-y-4">
                <button
                  onClick={startAnonymous}
                  className="w-full flex items-start gap-4 border-2 border-gray-200 rounded-2xl p-5 text-left hover:border-black transition-all group"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white transition-all">
                    📄
                  </div>
                  <div>
                    <div className="font-bold">Programme PDF uniquement</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Génération immédiate, téléchargement PDF. Aucun compte requis.
                    </div>
                  </div>
                </button>
                <button
                  onClick={startWithAccount}
                  className="w-full flex items-start gap-4 border-2 border-black bg-black text-white rounded-2xl p-5 text-left hover:bg-gray-900 transition-all"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 text-black">
                    🚀
                  </div>
                  <div>
                    <div className="font-bold">Créer un compte (recommandé)</div>
                    <div className="text-sm text-gray-300 mt-1">
                      PDF + séances quotidiennes adaptatives + suivi de progression +
                      recommandations.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation footer */}
      {step < 5 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 border border-gray-300 rounded-xl px-4 py-3 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white rounded-xl px-4 py-3 font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
            >
              {step === 4 ? "Finaliser" : "Continuer"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
