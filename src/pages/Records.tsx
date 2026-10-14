import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Trophy, NotebookPen, CalendarCheck, Flame } from "lucide-react";
import { useApp } from "../lib/store";
import Navbar from "../components/Navbar";
import Modal from "../components/ui/Modal";
import NotesPanel from "../components/tracking/NotesPanel";
import NoteDialog, { type NoteDraft } from "../components/tracking/NoteDialog";
import { collectNotes, type NoteItem } from "../lib/notes";
import { showToast } from "../lib/toast";
import { validateRecord, type RecordErrors } from "../lib/records";
import { practiceDays, practiceStats } from "../lib/practice";
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

const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function Regularity() {
  const { state } = useApp();
  const stats = useMemo(
    () => practiceStats(practiceDays(state.program, state.sessions)),
    [state.program, state.sessions],
  );
  const goal =
    state.profile?.weeklyFrequency ?? state.program?.program_overview.training_days_per_week;
  const tiles = [
    {
      Icon: CalendarCheck,
      value: goal ? `${stats.thisWeek}/${goal}` : String(stats.thisWeek),
      label: "séances cette semaine",
    },
    {
      Icon: Flame,
      value: String(stats.weekStreak),
      label: `semaine${stats.weekStreak > 1 ? "s" : ""} d'affilée`,
    },
    {
      Icon: Flame,
      value: String(stats.dayStreak),
      label: `jour${stats.dayStreak > 1 ? "s" : ""} d'affilée`,
    },
  ];
  const practicedDays = stats.calendar.flat().filter((cell) => cell.practiced).length;
  return (
    <section aria-label="Régularité">
      <dl className="grid grid-cols-3 gap-3">
        {tiles.map(({ Icon, value, label }) => (
          <div key={label} className="rounded-2xl border border-line bg-card p-3 text-center">
            <Icon className="mx-auto mb-1 h-5 w-5 text-brand" aria-hidden="true" />
            <dd className="font-display text-2xl font-black tabular-nums">{value}</dd>
            <dt className="text-xs leading-tight text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-black">Calendrier de pratique</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {practicedDays} jour{practicedDays > 1 ? "s" : ""} de pratique sur les 5 dernières
          semaines.
        </p>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center" aria-hidden="true">
          {WEEKDAY_LETTERS.map((letter, index) => (
            <span key={`${letter}-${index}`} className="text-xs font-semibold text-ink-soft">
              {letter}
            </span>
          ))}
          {stats.calendar.flat().map((cell) => (
            <span
              key={cell.key}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                cell.practiced
                  ? "bg-brand text-brand-fg"
                  : cell.future
                    ? "text-ink-soft opacity-50"
                    : "bg-card-soft text-ink-soft"
              } ${cell.today ? "ring-2 ring-ink ring-offset-2 ring-offset-card" : ""}`}
            >
              {cell.day}
            </span>
          ))}
        </div>
      </div>

      {stats.total === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong p-5 text-center">
          <p className="text-sm text-ink-soft">
            Pas encore de séance réalisée. Coche une séance de ton programme pour lancer ta série.
          </p>
          <Link to="/result" className="app-secondary mt-3">
            Voir mon programme
          </Link>
        </div>
      )}
    </section>
  );
}

export default function Records() {
  const { state, dispatch, addRecord } = useApp();
  const [tab, setTab] = useState<"regularite" | "performances" | "notes">("regularite");
  const [showAdd, setShowAdd] = useState(false);
  /** `undefined` : fermé · `null` : nouvelle note · élément : modification. */
  const [noteEditor, setNoteEditor] = useState<NoteItem | null | undefined>(undefined);
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

  const noteItems = useMemo(
    () => collectNotes(state.notes, state.sessions),
    [state.notes, state.sessions],
  );
  function saveNoteDraft(draft: NoteDraft) {
    const editing = noteEditor;
    if (editing?.kind === "session")
      dispatch({ type: "UPDATE_SESSION_NOTES", uid: editing.id, notes: draft.content });
    else {
      const note = {
        id: editing?.id ?? crypto.randomUUID(),
        title: draft.title || undefined,
        content: draft.content,
        date: draft.date,
      };
      dispatch({ type: editing ? "UPDATE_NOTE" : "ADD_NOTE", note });
    }
    setNoteEditor(undefined);
    setStatus("Note enregistrée.");
  }
  function deleteNote(item: NoteItem) {
    if (item.kind === "session") {
      dispatch({ type: "UPDATE_SESSION_NOTES", uid: item.id, notes: undefined });
      showToast({
        message: "Note supprimée.",
        actionLabel: "Annuler",
        onAction: () =>
          dispatch({ type: "UPDATE_SESSION_NOTES", uid: item.id, notes: item.content }),
      });
      return;
    }
    dispatch({ type: "DELETE_NOTE", id: item.id });
    showToast({
      message: "Note supprimée.",
      actionLabel: "Annuler",
      onAction: () =>
        dispatch({
          type: "ADD_NOTE",
          note: { id: item.id, title: item.title, content: item.content, date: item.date },
        }),
    });
  }

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
      setStatus("Performance enregistrée.");
    } catch {
      setSaveError(
        "La performance n'a pas pu être enregistrée. Ta saisie est conservée. Réessaie.",
      );
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
        <p id={`error-${key}`} className="mt-1 text-sm text-danger" role="alert">
          {errors[key as keyof RecordErrors]}
        </p>
      )}
    </div>
  );
  return (
    <div className="theme-app-page min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-36 pt-20 sm:px-6">
        <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Suivi</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Régularité, performances et notes de séance
            </p>
          </div>
          {tab === "performances" && (
            <button type="button" className="app-primary" onClick={() => openAdd()}>
              <Plus size={18} aria-hidden="true" /> Ajouter une performance
            </button>
          )}
          {tab === "notes" && (
            <button type="button" className="app-primary" onClick={() => setNoteEditor(null)}>
              <Plus size={18} aria-hidden="true" /> Ajouter une note
            </button>
          )}
        </div>
        {status && (
          <p role="status" className="mb-4 text-sm font-semibold text-brand">
            {status}
          </p>
        )}
        <div
          className="mb-6 grid grid-cols-3 rounded-2xl bg-card-soft p-1"
          role="tablist"
          aria-label="Suivi"
        >
          {(
            [
              ["regularite", "Régularité", CalendarCheck],
              ["performances", "Performances", Trophy],
              ["notes", "Notes", NotebookPen],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              data-active={tab === value}
              className={`theme-segment-tab flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 text-xs font-bold sm:text-sm ${
                tab === value ? "bg-card text-ink shadow-sm" : "text-ink-soft"
              }`}
              onClick={() => setTab(value)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {tab === "regularite" ? (
          <Regularity />
        ) : tab === "notes" ? (
          <NotesPanel
            items={noteItems}
            onAdd={() => setNoteEditor(null)}
            onEdit={setNoteEditor}
            onDelete={deleteNote}
          />
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand"
              aria-hidden="true"
            >
              <Trophy size={30} />
            </div>
            <h2 className="text-lg font-bold">Aucune performance enregistrée</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
              Note ta meilleure charge, ton meilleur temps ou ton nombre de répétitions pour suivre
              ta progression.
            </p>
            <button type="button" className="app-primary mt-5" onClick={() => openAdd()}>
              <Plus size={18} aria-hidden="true" /> Ajouter ma première performance
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((entries) => {
              const latest = entries[0];
              const delta = comparison(latest, entries[1]);
              return (
                <article
                  key={`${latest.category}:${latest.name}`}
                  className="rounded-2xl border border-line bg-card p-4"
                >
                  <p className="mb-1 text-xs font-semibold text-ink-soft">
                    {CATEGORIES[latest.category]}
                  </p>
                  <h2 className="text-lg font-bold break-words">{latest.name}</h2>
                  <p className="font-display mt-2 text-xl font-bold">{formatRecord(latest)}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Dernière entrée ·{" "}
                    {new Date(`${latest.date}T12:00:00`).toLocaleDateString("fr-FR")}
                  </p>
                  {delta && <p className="mt-2 text-sm font-semibold text-brand">{delta}</p>}
                  <button
                    type="button"
                    className="app-secondary mt-3"
                    onClick={() => openAdd(latest)}
                  >
                    <Plus size={16} aria-hidden="true" /> Nouvelle entrée
                  </button>
                  <details className="mt-4 border-t border-line pt-1">
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
                      Historique ({entries.length})
                    </summary>
                    <ul className="mt-2 space-y-3">
                      {entries.map((record) => (
                        <li key={record.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{formatRecord(record)}</p>
                            <p className="text-xs text-ink-soft">
                              {new Date(`${record.date}T12:00:00`).toLocaleDateString("fr-FR")}
                            </p>
                            {record.notes && (
                              <p className="mt-1 text-sm break-words text-ink-soft">
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
                            <Trash2 size={16} aria-hidden="true" />
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
      {noteEditor !== undefined && (
        <NoteDialog
          key={noteEditor?.id ?? "new"}
          item={noteEditor}
          onClose={() => setNoteEditor(undefined)}
          onSave={saveNoteDraft}
        />
      )}
      <Modal
        open={showAdd}
        title="Nouvelle performance"
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
                  className={`min-h-11 rounded-xl border-2 p-2 text-sm font-semibold ${form.category === category ? "border-brand bg-brand-soft text-ink" : "border-line-strong"}`}
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
                className="min-h-11 rounded-lg border border-line-strong px-3 text-sm"
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
            <p className="text-sm text-ink-soft">Renseigne au moins une des deux mesures.</p>
          )}
          {field("date", "Date", "date", true)}
          {field("notes", "Note (facultatif)", "text")}
          {saveError && (
            <p role="alert" className="text-sm text-danger">
              {saveError}
            </p>
          )}
          <button type="submit" className="app-primary w-full" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer la performance"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
