import { useMemo, useState } from "react";
import { Check, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { useApp } from "../../lib/store";
import type { DailySession } from "../../lib/types";

const MAX_NOTE_LENGTH = 2000;

function sessionTitle(session: DailySession) {
  return session.goal?.trim() || "Séance sans titre";
}

export default function SessionNotes() {
  const { state, dispatch } = useApp();
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUid, setSelectedUid] = useState("");
  const [newNote, setNewNote] = useState("");

  const sessions = useMemo(() => state.sessions, [state.sessions]);
  const notesCount = sessions.filter((session) => session.notes?.trim()).length;

  function startEditing(session: DailySession) {
    setEditingUid(session.uid);
    setDraft(session.notes ?? "");
  }

  function closeEditor() {
    setEditingUid(null);
    setDraft("");
  }

  function saveNote(uid: string) {
    const notes = draft.trim();
    dispatch({ type: "UPDATE_SESSION_NOTES", uid, notes: notes || undefined });
    closeEditor();
  }

  function deleteNote(uid: string) {
    dispatch({ type: "UPDATE_SESSION_NOTES", uid, notes: undefined });
    if (editingUid === uid) closeEditor();
  }

  function openAdd() {
    const session = sessions.find((item) => !item.notes?.trim()) ?? sessions[0];
    setSelectedUid(session?.uid ?? "");
    setNewNote(session?.notes ?? "");
    setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false);
    setSelectedUid("");
    setNewNote("");
  }

  function saveNewNote() {
    const notes = newNote.trim();
    if (!selectedUid || !notes) return;
    dispatch({ type: "UPDATE_SESSION_NOTES", uid: selectedUid, notes });
    closeAdd();
  }

  const addNoteSheet = showAdd && (
    <>
      <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm" onClick={closeAdd} />
      <div
        className="fixed inset-x-0 bottom-0 z-60 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-note-title"
      >
        <div className="p-5 pb-8">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200" />
          <div className="mb-5 flex items-center justify-between">
            <h2 id="new-note-title" className="text-lg font-black">
              Nouvelle note
            </h2>
            <button
              type="button"
              onClick={closeAdd}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {sessions.length > 0 ? (
            <>
              <label
                htmlFor="new-note-session"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                Séance
              </label>
              <select
                id="new-note-session"
                value={selectedUid}
                onChange={(event) => {
                  const uid = event.target.value;
                  setSelectedUid(uid);
                  setNewNote(sessions.find((session) => session.uid === uid)?.notes ?? "");
                }}
                className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium outline-none transition-colors focus:border-black"
              >
                {sessions.map((session) => (
                  <option key={session.uid} value={session.uid}>
                    {sessionTitle(session)} · {session.date}
                  </option>
                ))}
              </select>

              <label
                htmlFor="new-note-content"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                Note
              </label>
              <textarea
                id="new-note-content"
                autoFocus
                rows={5}
                maxLength={MAX_NOTE_LENGTH}
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Ressenti, charges utilisées, douleur éventuelle, objectif pour la prochaine séance…"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-black"
              />
              <p className="mt-2 text-right text-[11px] text-gray-400">
                {newNote.length}/{MAX_NOTE_LENGTH}
              </p>
            </>
          ) : (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
              Termine d'abord une séance pour pouvoir lui associer une note.
            </div>
          )}

          <button
            type="button"
            onClick={saveNewNote}
            disabled={!selectedUid || !newNote.trim()}
            className="mt-5 w-full rounded-2xl bg-black py-4 text-base font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
          >
            Enregistrer la note
          </button>
        </div>
      </div>
    </>
  );

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-500">
          <FileText className="h-9 w-9" />
        </div>
        <h2 className="mb-2 text-lg font-black">Aucune séance à annoter</h2>
        <p className="max-w-xs text-sm leading-relaxed text-gray-400">
          Tes séances apparaîtront ici pour que tu puisses noter ton ressenti, tes charges ou ce que
          tu souhaites ajuster la prochaine fois.
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="mt-6 rounded-2xl bg-black px-6 py-3 text-sm font-bold text-white transition-transform active:scale-95"
        >
          + Ajouter une note
        </button>
        {addNoteSheet}
      </div>
    );
  }

  return (
    <section aria-label="Notes de séance">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-700">
            {notesCount} note{notesCount === 1 ? "" : "s"} enregistrée{notesCount === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">Une note personnelle par séance.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-black px-4 text-xs font-bold text-white transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const isEditing = editingUid === session.uid;
          const hasNote = Boolean(session.notes?.trim());

          return (
            <article
              key={session.uid}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {session.date}
                  </p>
                  <h3 className="mt-1 truncate text-base font-black text-gray-900">
                    {sessionTitle(session)}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {session.duration_min} min · {session.intensity}
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => startEditing(session)}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    {hasNote ? (
                      <Pencil className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {hasNote ? "Modifier" : "Ajouter"}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <label htmlFor={`session-note-${session.uid}`} className="sr-only">
                    Note pour {sessionTitle(session)}
                  </label>
                  <textarea
                    id={`session-note-${session.uid}`}
                    autoFocus
                    rows={4}
                    maxLength={MAX_NOTE_LENGTH}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ressenti, charges utilisées, douleur éventuelle, objectif pour la prochaine séance…"
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm leading-relaxed text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-amber-400"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-gray-400">
                      {draft.length}/{MAX_NOTE_LENGTH}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={closeEditor}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-gray-500 hover:bg-gray-100"
                      >
                        <X className="h-3.5 w-3.5" /> Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => saveNote(session.uid)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-black px-3 text-xs font-bold text-white hover:bg-gray-800"
                      >
                        <Check className="h-3.5 w-3.5" /> Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              ) : hasNote ? (
                <div className="mt-4 rounded-xl bg-amber-50/70 p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {session.notes}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteNote(session.uid)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer la note
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-sm italic text-gray-400">Aucune note pour cette séance.</p>
              )}
            </article>
          );
        })}
      </div>
      {addNoteSheet}
    </section>
  );
}
