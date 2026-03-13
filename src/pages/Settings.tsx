import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ChevronLeft } from "lucide-react";
import { useApp } from "../lib/store";
import type { ObjectiveType, LevelType, GenderType, AvailabilityType } from "../lib/types";
import { OBJECTIVE_LABELS } from "../lib/agents";
import Navbar from "../components/Navbar";

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

export default function Settings() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const profile = state.profile;
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    objective: (profile?.objective ?? "") as ObjectiveType | "",
    gender: (profile?.gender ?? "") as GenderType | "",
    age: profile?.age?.toString() ?? "",
    height: profile?.height?.toString() ?? "",
    weight: profile?.weight?.toString() ?? "",
    level: (profile?.level ?? "") as LevelType | "",
    weeklyFrequency: profile?.weeklyFrequency?.toString() ?? "3",
    sessionDuration: profile?.sessionDuration?.toString() ?? "45",
    equipment: profile?.equipment ?? [],
    injuries: profile?.injuries ?? "",
    nutritionRestrictions: profile?.nutritionRestrictions ?? "",
    availability: (profile?.availability ?? "") as AvailabilityType | "",
  });

  function update(data: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...data }));
  }

  function handleSave() {
    dispatch({
      type: "SET_PROFILE_PARTIAL",
      data: {
        objective: form.objective as ObjectiveType,
        gender: form.gender as GenderType,
        age: form.age ? parseInt(form.age) : undefined,
        height: form.height ? parseInt(form.height) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        level: form.level as LevelType,
        weeklyFrequency: parseInt(form.weeklyFrequency),
        sessionDuration: parseInt(form.sessionDuration),
        equipment: form.equipment,
        injuries: form.injuries,
        nutritionRestrictions: form.nutritionRestrictions,
        availability: form.availability as AvailabilityType,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 pt-20 pb-16 sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="mt-6 flex items-center gap-1.5 text-sm text-gray-400 hover:text-black mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        <h1 className="text-2xl font-black mb-8">Mes paramètres</h1>

        {/* Account info */}
        {state.currentUser && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <h2 className="font-bold mb-2 text-sm uppercase tracking-wider text-gray-400">
              Compte
            </h2>
            <p className="text-sm font-medium">{state.currentUser.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Compte créé le {new Date(state.currentUser.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Objective */}
          <div>
            <label className="block text-sm font-bold mb-2">Objectif</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(OBJECTIVE_LABELS) as ObjectiveType[]).map((id) => (
                <button
                  key={id}
                  onClick={() => update({ objective: id })}
                  className={`py-2 px-3 border-2 rounded-xl text-xs font-semibold text-left transition-all ${
                    form.objective === id
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-black"
                  }`}
                >
                  {OBJECTIVE_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          {/* Physical info */}
          <div>
            <label className="block text-sm font-bold mb-2">Infos corporelles</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Genre",
                  key: "gender",
                  type: "select",
                  options: ["homme", "femme", "autre"],
                },
                { label: "Âge", key: "age", type: "number", unit: "ans" },
                { label: "Taille", key: "height", type: "number", unit: "cm" },
                { label: "Poids", key: "weight", type: "number", unit: "kg" },
              ].map(({ label, key, type, unit, options }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  {type === "select" && options ? (
                    <select
                      value={form[key as keyof typeof form] as string}
                      onChange={(e) => update({ [key]: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                    >
                      <option value="">—</option>
                      {options.map((o) => (
                        <option key={o} value={o} className="capitalize">
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        value={form[key as keyof typeof form] as string}
                        onChange={(e) => update({ [key]: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:border-black"
                      />
                      {unit && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {unit}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-bold mb-2">Niveau sportif</label>
            <div className="flex gap-2">
              {(["débutant", "intermédiaire", "avancé"] as LevelType[]).map((l) => (
                <button
                  key={l}
                  onClick={() => update({ level: l })}
                  className={`flex-1 py-2 border-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                    form.level === l
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-black"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Training preferences */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">Séances / semaine</label>
              <select
                value={form.weeklyFrequency}
                onChange={(e) => update({ weeklyFrequency: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} séances
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Durée par séance</label>
              <select
                value={form.sessionDuration}
                onChange={(e) => update({ sessionDuration: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
              >
                {[30, 45, 60, 75, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-sm font-bold mb-2">Matériel disponible</label>
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
                  className={`text-xs px-3 py-1.5 border rounded-full transition-all ${
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

          {/* Availability */}
          <div>
            <label className="block text-sm font-bold mb-2">Disponibilité préférée</label>
            <div className="flex gap-2">
              {(["matin", "soir", "indifférent"] as AvailabilityType[]).map((a) => (
                <button
                  key={a}
                  onClick={() => update({ availability: a })}
                  className={`flex-1 py-2 border-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                    form.availability === a
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-black"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Injuries */}
          <div>
            <label className="block text-sm font-bold mb-1">Blessures / limitations</label>
            <textarea
              value={form.injuries}
              onChange={(e) => update({ injuries: e.target.value })}
              placeholder="Aucune..."
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Nutrition restrictions */}
          <div>
            <label className="block text-sm font-bold mb-1">Restrictions alimentaires</label>
            <textarea
              value={form.nutritionRestrictions}
              onChange={(e) => update({ nutritionRestrictions: e.target.value })}
              placeholder="Aucune..."
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-900 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? "Enregistré ✓" : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
