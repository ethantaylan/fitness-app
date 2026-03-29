import { useState, useMemo } from "react";
import { Plus, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "../lib/store";
import Navbar from "../components/Navbar";
import type { PersonalRecord, RecordCategory } from "../lib/types";

// ── Metadata ──────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  RecordCategory,
  {
    label: string;
    emoji: string;
    text: string;
    border: string;
    lightBg: string;
    dot: string;
  }
> = {
  force: {
    label: "Force",
    emoji: "🏋️",
    text: "text-amber-700",
    border: "border-amber-200",
    lightBg: "bg-amber-50",
    dot: "bg-amber-400",
  },
  cardio: {
    label: "Cardio",
    emoji: "🏃",
    text: "text-sky-700",
    border: "border-sky-200",
    lightBg: "bg-sky-50",
    dot: "bg-sky-400",
  },
  corps: {
    label: "Corps",
    emoji: "💪",
    text: "text-emerald-700",
    border: "border-emerald-200",
    lightBg: "bg-emerald-50",
    dot: "bg-emerald-400",
  },
  autre: {
    label: "Autre",
    emoji: "🎯",
    text: "text-purple-700",
    border: "border-purple-200",
    lightBg: "bg-purple-50",
    dot: "bg-purple-400",
  },
};

const SUGGESTIONS: Record<RecordCategory, string[]> = {
  force: [
    "Développé couché",
    "Squat",
    "Soulevé de terre",
    "Développé militaire",
    "Rowing barre",
    "Curl biceps",
  ],
  cardio: ["Running 5km", "Running 10km", "Vélo 20km", "Natation 1km", "Running 1km"],
  corps: ["Tractions", "Dips", "Pompes", "Burpees", "Gainage"],
  autre: ["Saut en hauteur", "Lancé de poids", "Grimper de corde", "Plongeon"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Formatters ───────────────────────────────────────────────────────────────

function formatForce(r: PersonalRecord): string {
  if (r.weight_kg && r.reps) return `${r.weight_kg} kg × ${r.reps} reps`;
  if (r.weight_kg) return `${r.weight_kg} kg`;
  if (r.reps) return `${r.reps} reps`;
  return "—";
}

function formatCardio(r: PersonalRecord): string {
  if (r.distance_km && r.time_min) return `${r.distance_km} km en ${r.time_min} min`;
  if (r.distance_km) return `${r.distance_km} km`;
  if (r.time_min) return `${r.time_min} min`;
  return "—";
}

function formatCorps(r: PersonalRecord): string {
  if (r.reps && r.time_min) return `${r.reps} reps · ${r.time_min} sec`;
  if (r.reps) return `${r.reps} reps`;
  if (r.time_min) return `${r.time_min} sec`;
  return "—";
}

const FORMATTERS: Record<RecordCategory, (r: PersonalRecord) => string> = {
  force: formatForce,
  cardio: formatCardio,
  corps: formatCorps,
  autre: formatCorps,
};

function formatRecord(r: PersonalRecord): string {
  const formatted = FORMATTERS[r.category](r);
  if (formatted === "—") return r.notes ?? "—";
  return formatted;
}

function scoreRecord(r: PersonalRecord): number {
  if (r.category === "force") return (r.weight_kg ?? 0) * (r.reps ?? 1);
  if (r.category === "cardio") {
    if (r.distance_km && r.time_min) return r.distance_km / r.time_min;
    return r.distance_km ?? 0;
  }
  return r.reps ?? r.time_min ?? 0;
}

function getBest(entries: PersonalRecord[]): PersonalRecord {
  return entries.reduce((best, r) => (scoreRecord(r) > scoreRecord(best) ? r : best), entries[0]);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  category: RecordCategory;
  weight_kg: string;
  reps: string;
  distance_km: string;
  time_min: string;
  notes: string;
  date: string;
}

const BLANK_FORM: FormState = {
  name: "",
  category: "force",
  weight_kg: "",
  reps: "",
  distance_km: "",
  time_min: "",
  notes: "",
  date: new Date().toISOString().split("T")[0],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Records() {
  const { state, dispatch } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => state.records, [state.records]);

  const grouped = useMemo(
    () =>
      filtered?.reduce<Record<string, PersonalRecord[]>>((acc, r) => {
        const key = r.name;
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
      }, {}),
    [filtered],
  );

  const sortedExercises = useMemo(
    () =>
      Object.keys(grouped ?? {}).sort((a, b) => {
        const aTime = Math.max(...(grouped?.[a]?.map((r) => new Date(r.date).getTime()) ?? [0]));
        const bTime = Math.max(...(grouped?.[b]?.map((r) => new Date(r.date).getTime()) ?? [0]));
        return bTime - aTime;
      }),
    [grouped],
  );

  const visibleSuggestions = useMemo(() => {
    const all = SUGGESTIONS[form.category];
    if (!form.name) return all;
    return all.filter((s) => s.toLowerCase().includes(form.name.toLowerCase()));
  }, [form.category, form.name]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openAdd(name?: string, category?: RecordCategory) {
    setForm({ ...BLANK_FORM, name: name ?? "", category: category ?? "force" });
    setShowSuggestions(false);
    setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false);
    setShowSuggestions(false);
  }

  function setCategory(cat: RecordCategory) {
    setForm((f) => ({
      ...f,
      category: cat,
      weight_kg: "",
      reps: "",
      distance_km: "",
      time_min: "",
    }));
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    const record: PersonalRecord = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      category: form.category,
      date: form.date,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      reps: form.reps ? Number(form.reps) : undefined,
      distance_km: form.distance_km ? Number(form.distance_km) : undefined,
      time_min: form.time_min ? Number(form.time_min) : undefined,
      notes: form.notes || undefined,
    };
    dispatch({ type: "ADD_RECORD", record });
    closeAdd();
  }

  function toggleExpand(name: string) {
    setExpandedExercise((prev) => (prev === name ? null : name));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-28 sm:px-6">
        {/* Header */}
        <div className="mt-6 mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Performance</p>
            <h1 className="text-2xl font-black">🏆 Mes Records</h1>
            {sortedExercises.length > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                {sortedExercises.length} exercice{sortedExercises.length > 1 ? "s" : ""} suivi
                {sortedExercises.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Empty state */}
        {sortedExercises.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-sm">
              🏆
            </div>
            <h2 className="text-lg font-black mb-2">Aucun record encore</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Ajoute ta première perf — développé couché, tractions, 5km... chaque PR compte.
            </p>
            <button
              onClick={() => openAdd()}
              className="mt-6 bg-black text-white font-bold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-transform"
            >
              + Ajouter un record
            </button>
          </div>
        )}

        {/* Records list */}
        <div className="flex flex-col gap-3">
          {sortedExercises.map((exerciseName) => {
            const entries = grouped[exerciseName];
            const best = getBest(entries);
            const meta = CATEGORY_META[best.category];
            const isExpanded = expandedExercise === exerciseName;
            const sortedEntries = [...entries].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );

            return (
              <div
                key={exerciseName}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
              >
                {/* Main row */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${meta.lightBg} ${meta.text} rounded-full px-2 py-0.5`}
                        >
                          {meta.emoji} {meta.label}
                        </span>
                        {entries.length > 1 && (
                          <span className="text-[10px] text-gray-400">
                            {entries.length} entrées
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-base text-gray-900 leading-tight">
                        {exerciseName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(best.date)}</p>
                    </div>

                    {/* Best value */}
                    <div className="shrink-0 text-right">
                      <div className={`text-lg font-black leading-none ${meta.text}`}>
                        {formatRecord(best)}
                      </div>
                      {best.notes && (
                        <p className="text-[11px] text-gray-400 mt-1 max-w-30 truncate">
                          {best.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => openAdd(exerciseName, best.category)}
                      className="text-xs font-semibold text-gray-400 hover:text-black transition-colors"
                    >
                      + Nouvelle entrée
                    </button>
                    {entries.length > 1 && (
                      <button
                        onClick={() => toggleExpand(exerciseName)}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        Historique
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* History */}
                {isExpanded && (
                  <div className={`${meta.lightBg} ${meta.border} border-t px-4 py-3`}>
                    <div className="flex flex-col gap-2.5">
                      {sortedEntries.map((entry) => {
                        const isBestEntry = entry.id === best.id;
                        return (
                          <div key={entry.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isBestEntry && (
                                <span className="text-[10px] font-black text-amber-600 bg-amber-100 rounded-full px-1.5 py-0.5 shrink-0">
                                  PR
                                </span>
                              )}
                              <span className="text-sm font-semibold text-gray-800 truncate">
                                {formatRecord(entry)}
                              </span>
                              {entry.notes && (
                                <span className="text-xs text-gray-400 truncate hidden sm:inline">
                                  — {entry.notes}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-gray-400">
                                {new Date(`${entry.date}T12:00:00`).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                              <button
                                onClick={() => dispatch({ type: "DELETE_RECORD", id: entry.id })}
                                className="text-gray-300 hover:text-red-400 transition-colors"
                                aria-label="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      {sortedExercises.length > 0 && (
        <button
          onClick={() => openAdd()}
          className="fixed bottom-24 right-4 w-14 h-14 bg-black text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-900 active:scale-95 transition-all z-40 md:bottom-8"
          aria-label="Ajouter un record"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Add record bottom sheet */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-60 backdrop-blur-sm" onClick={closeAdd} />
          <div className="fixed bottom-0 inset-x-0 z-60 bg-white rounded-t-3xl shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="p-5 pb-8">
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

              {/* Sheet header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black">Nouveau record</h2>
                <button
                  onClick={closeAdd}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Catégorie
              </p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {(["force", "cardio", "corps", "autre"] as RecordCategory[]).map((cat) => {
                  const m = CATEGORY_META[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
                        form.category === cat
                          ? `${m.lightBg} ${m.border} ${m.text}`
                          : "border-gray-100 text-gray-400 bg-gray-50"
                      }`}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-xs font-bold">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Exercise name */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Exercice
              </p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onFocus={() => setShowSuggestions(true)}
                placeholder="ex: Développé couché"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
              />
              {showSuggestions && visibleSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setForm((f) => ({ ...f, name: s }));
                        setShowSuggestions(false);
                      }}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full px-2.5 py-1 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Force fields */}
              {form.category === "force" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Poids (kg)
                    </p>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.weight_kg}
                      onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
                      placeholder="ex: 120"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Répétitions
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.reps}
                      onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
                      placeholder="ex: 3"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              )}

              {/* Cardio fields */}
              {form.category === "cardio" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Distance (km)
                    </p>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={form.distance_km}
                      onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))}
                      placeholder="ex: 5"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Temps (min)
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.time_min}
                      onChange={(e) => setForm((f) => ({ ...f, time_min: e.target.value }))}
                      placeholder="ex: 23"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              )}

              {/* Corps fields */}
              {form.category === "corps" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Répétitions max
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.reps}
                      onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
                      placeholder="ex: 30"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Durée (sec)
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.time_min}
                      onChange={(e) => setForm((f) => ({ ...f, time_min: e.target.value }))}
                      placeholder="ex: 60"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              )}

              {/* Date + Notes */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Date
                  </p>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Note (optionnel)
                  </p>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="conditions, ceinture…"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim()}
                className="w-full mt-5 bg-black text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                Enregistrer le record
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
