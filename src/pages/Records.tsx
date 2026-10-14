import { useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2, Trophy, NotebookPen } from "lucide-react";
import { useApp } from "../lib/store";
import Navbar from "../components/Navbar";
import Modal from "../components/ui/Modal";
import SessionNotes from "../components/tracking/SessionNotes";
import { validateRecord, type RecordErrors } from "../lib/records";
import type { PersonalRecord, RecordCategory } from "../lib/types";

const CATEGORIES: Record<RecordCategory, string> = {
  force: "Force",
  cardio: "Cardio",
  corps: "Poids du corps",
  autre: "Autre",
};
const SUGGESTIONS: Record<RecordCategory, string[]> = {
  force: ["Développé couché", "Squat", "Soulevé de terre", "Développé militaire"],
  cardio: ["Running 5 km", "Running 10 km", "Vélo 20 km", "Natation 1 km"],
  corps: ["Tractions", "Dips", "Pompes", "Gainage"],
  autre: ["Saut", "Grimper de corde"],
};
type RecordForm = {
  name: string;
  category: RecordCategory;
  date: string;
  weight_kg: string;
  reps: string;
  distance_km: string;
  time_min: string;
  notes: string;
};
const emptyForm = (): RecordForm => ({
  name: "",
  category: "force",
  date: new Date().toLocaleDateString("en-CA"),
  weight_kg: "",
  reps: "",
  distance_km: "",
  time_min: "",
  notes: "",
});

function formatRecord(record: PersonalRecord) {
  const values = [];
  if (record.weight_kg !== undefined) values.push(`${record.weight_kg} kg`);
  if (record.reps !== undefined)
    values.push(`${record.reps} répétition${record.reps === 1 ? "" : "s"}`);
  if (record.distance_km !== undefined) values.push(`${record.distance_km} km`);
  if (record.time_min !== undefined)
    values.push(`${record.time_min} ${record.category === "cardio" ? "min" : "s"}`);
  return values.join(" · ") || "Mesure non renseignée";
}
function comparison(latest: PersonalRecord, previous?: PersonalRecord) {
  if (!previous || latest.category !== previous.category) return null;
  let change: number | null = null;
  let unit = "";
  if (
    latest.category === "force" &&
    latest.reps === previous.reps &&
    latest.weight_kg !== undefined &&
    previous.weight_kg !== undefined
  ) {
    change = latest.weight_kg - previous.weight_kg;
    unit = `kg à ${latest.reps} répétitions`;
  } else if (
    latest.category === "cardio" &&
    latest.distance_km !== undefined &&
    latest.distance_km === previous.distance_km &&
    latest.time_min !== undefined &&
    previous.time_min !== undefined
  ) {
    change = latest.time_min - previous.time_min;
    unit = `min sur ${latest.distance_km} km`;
  } else if (
    latest.category === "corps" &&
    latest.reps !== undefined &&
    previous.reps !== undefined
  ) {
    change = latest.reps - previous.reps;
    unit = "répétitions";
  }
  return change === null
    ? null
    : `${change > 0 ? "+" : ""}${Number(change.toFixed(2))} ${unit} depuis la précédente entrée`;
}

export default function Records() {
  const { state, dispatch, addRecord } = useApp();
  const [tab, setTab] = useState<"records" | "notes">("records");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [errors, setErrors] = useState<RecordErrors>({});
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState("");
  const grouped = useMemo(() => {
    const groups = new Map<string, PersonalRecord[]>();
    for (const record of state.records) {
      const key = `${record.category}:${record.name}`;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    return [...groups.values()]
      .map((entries) => entries.sort((a, b) => b.date.localeCompare(a.date)))
      .sort((a, b) => b[0].date.localeCompare(a[0].date));
  }, [state.records]);

  function openAdd(record?: PersonalRecord) {
    setForm({ ...emptyForm(), name: record?.name ?? "", category: record?.category ?? "force" });
    setErrors({});
    setSaveError("");
    setShowAdd(true);
  }
  function update(key: keyof RecordForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSaveError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const number = (value: string) => (value.trim() === "" ? undefined : Number(value));
    const record: PersonalRecord = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      category: form.category,
      date: form.date,
      weight_kg: number(form.weight_kg),
      reps: number(form.reps),
      distance_km: number(form.distance_km),
      time_min: number(form.time_min),
      notes: form.notes.trim() || undefined,
    };
    const issues = validateRecord(record);
    setErrors(issues);
    if (Object.keys(issues).length) return;
    submitting.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await addRecord(record);
      setShowAdd(false);
      setStatus("Record enregistré.");
    } catch {
      setSaveError("Le record n'a pas pu être enregistré. Ta saisie est conservée. Réessaie.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  const field = (
    key: Exclude<keyof RecordForm, "category">,
    label: string,
    type = "number",
    required = false,
  ) => (
    <div>
      <label htmlFor={`record-${key}`} className="mb-1.5 block text-sm font-semibold">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={`record-${key}`}
        type={type}
        className="app-input"
        value={form[key]}
        onChange={(event) => update(key, event.target.value)}
        disabled={saving}
        aria-required={required}
        step={key === "reps" ? "1" : "any"}
        inputMode={type === "number" ? "decimal" : undefined}
        aria-invalid={Boolean(errors[key as keyof RecordErrors])}
        aria-describedby={errors[key as keyof RecordErrors] ? `error-${key}` : undefined}
      />
      {errors[key as keyof RecordErrors] && (
        <p id={`error-${key}`} className="mt-1 text-sm text-red-600" role="alert">
          {errors[key as keyof RecordErrors]}
        </p>
      )}
    </div>
  );
  return (
    <div className="theme-app-page min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-36 pt-20 sm:px-6">
        <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Progression</h1>
            <p className="mt-1 text-sm text-gray-500">Performances et notes de séance</p>
          </div>
          {tab === "records" && (
            <button type="button" className="app-primary" onClick={() => openAdd()}>
              <Plus size={18} /> Ajouter un record
            </button>
          )}
        </div>
        {status && (
          <p role="status" className="mb-4 text-sm text-emerald-700">
            {status}
          </p>
        )}
        <div
          className="mb-6 grid grid-cols-2 rounded-2xl bg-gray-100 p-1"
          role="tablist"
          aria-label="Suivi"
        >
          {(["records", "notes"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={`theme-segment-tab flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${tab === value ? "bg-white text-gray-900" : "text-gray-500"}`}
              onClick={() => setTab(value)}
            >
              {value === "records" ? <Trophy size={18} /> : <NotebookPen size={18} />}
              {value === "records" ? "Records" : "Notes"}
            </button>
          ))}
        </div>
        {tab === "notes" ? (
          <SessionNotes />
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="mx-auto mb-4 text-amber-600" size={32} />
            <h2 className="text-lg font-bold">Aucun record encore</h2>
            <p className="mt-2 text-sm text-gray-500">
              Enregistre ta première performance pour suivre son évolution.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((entries) => {
              const latest = entries[0];
              const delta = comparison(latest, entries[1]);
              return (
                <article
                  key={`${latest.category}:${latest.name}`}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <p className="mb-1 text-xs font-semibold text-gray-500">
                    {CATEGORIES[latest.category]}
                  </p>
                  <h2 className="text-lg font-bold break-words">{latest.name}</h2>
                  <p className="mt-2 font-semibold">{formatRecord(latest)}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Dernière entrée ·{" "}
                    {new Date(`${latest.date}T12:00:00`).toLocaleDateString("fr-FR")}
                  </p>
                  {delta && <p className="mt-2 text-sm text-gray-600">{delta}</p>}
                  <button
                    type="button"
                    className="app-secondary mt-3"
                    onClick={() => openAdd(latest)}
                  >
                    <Plus size={16} /> Nouvelle entrée
                  </button>
                  <details className="mt-4 border-t border-gray-100 pt-3">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Historique ({entries.length})
                    </summary>
                    <ul className="mt-3 space-y-3">
                      {entries.map((record) => (
                        <li key={record.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{formatRecord(record)}</p>
                            <p className="text-xs text-gray-500">{record.date}</p>
                            {record.notes && (
                              <p className="mt-1 text-sm text-gray-600 break-words">
                                {record.notes}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="app-icon-button"
                            aria-label={`Supprimer l'entrée du ${record.date}`}
                            onClick={() => dispatch({ type: "DELETE_RECORD", id: record.id })}
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Modal
        open={showAdd}
        title="Nouveau record"
        onClose={() => {
          if (!saving) setShowAdd(false);
        }}
      >
        <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
          <fieldset disabled={saving}>
            <legend className="mb-2 text-sm font-semibold">Catégorie</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORIES) as RecordCategory[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={form.category === category}
                  className={`min-h-11 rounded-xl border-2 p-2 text-sm font-semibold ${form.category === category ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200"}`}
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      category,
                      weight_kg: "",
                      reps: "",
                      distance_km: "",
                      time_min: "",
                    }));
                    setErrors({});
                  }}
                >
                  {CATEGORIES[category]}
                </button>
              ))}
            </div>
          </fieldset>
          {field("name", "Exercice", "text", true)}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS[form.category].map((name) => (
              <button
                type="button"
                key={name}
                disabled={saving}
                onClick={() => update("name", name)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.category === "force" ? (
              <>
                {field("weight_kg", "Charge (kg)", "number", true)}
                {field("reps", "Répétitions", "number", true)}
              </>
            ) : form.category === "cardio" ? (
              <>
                {field("distance_km", "Distance (km)")}
                {field("time_min", "Durée (min)")}
              </>
            ) : (
              <>
                {field("reps", "Répétitions")}
                {field("time_min", "Durée (s)")}
              </>
            )}
          </div>
          {form.category !== "force" && (
            <p className="text-sm text-gray-500">Renseigne au moins une des deux mesures.</p>
          )}
          {field("date", "Date", "date", true)}
          {field("notes", "Note (facultatif)", "text")}
          {saveError && (
            <p role="alert" className="text-sm text-red-600">
              {saveError}
            </p>
          )}
          <button type="submit" className="app-primary w-full" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer le record"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
