import { useState, type FormEvent } from "react";
import Modal from "../ui/Modal";
import { MAX_NOTE_LENGTH, validateNote, type NoteItem } from "../../lib/notes";

export interface NoteDraft {
  title: string;
  content: string;
  date: string;
}

/** Fenêtre d'ajout / de modification d'une note (les champs vivent le temps de l'ouverture). */
export default function NoteDialog({
  item,
  onClose,
  onSave,
}: Readonly<{
  /** `null` : nouvelle note. */
  item: NoteItem | null;
  onClose: () => void;
  onSave: (draft: NoteDraft) => void;
}>) {
  const [title, setTitle] = useState(item?.title && item.kind === "note" ? item.title : "");
  const [content, setContent] = useState(item?.content ?? "");
  const [date, setDate] = useState(item?.date || new Date().toLocaleDateString("en-CA"));
  const [errors, setErrors] = useState<{ content?: string; date?: string }>({});
  const legacy = item?.kind === "session";

  function submit(event: FormEvent) {
    event.preventDefault();
    const issues = validateNote(content, date);
    setErrors(issues);
    if (Object.keys(issues).length) return;
    onSave({ title: title.trim(), content: content.trim(), date });
  }

  return (
    <Modal open title={item ? "Modifier la note" : "Nouvelle note"} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4">
        {legacy && item?.title && (
          <p className="text-sm text-ink-soft">Note de la séance libre « {item.title} ».</p>
        )}
        {!legacy && (
          <div>
            <label htmlFor="note-title" className="mb-1.5 block text-sm font-semibold">
              Titre (facultatif)
            </label>
            <input
              id="note-title"
              type="text"
              className="app-input"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex : Genou gauche, objectif du mois…"
            />
          </div>
        )}
        <div>
          <label htmlFor="note-content" className="mb-1.5 block text-sm font-semibold">
            Note *
          </label>
          <textarea
            id="note-content"
            rows={6}
            className="app-input resize-none"
            maxLength={MAX_NOTE_LENGTH}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setErrors((current) => ({ ...current, content: undefined }));
            }}
            aria-required
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? "note-content-error" : undefined}
            placeholder="Ressenti, charges utilisées, douleur éventuelle, objectif…"
          />
          <div className="mt-1 flex items-start justify-between gap-3">
            {errors.content ? (
              <p id="note-content-error" role="alert" className="text-sm text-danger">
                {errors.content}
              </p>
            ) : (
              <span />
            )}
            <span className="shrink-0 text-xs text-ink-soft">
              {content.length}/{MAX_NOTE_LENGTH}
            </span>
          </div>
        </div>
        {!legacy && (
          <div>
            <label htmlFor="note-date" className="mb-1.5 block text-sm font-semibold">
              Date *
            </label>
            <input
              id="note-date"
              type="date"
              className="app-input"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setErrors((current) => ({ ...current, date: undefined }));
              }}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? "note-date-error" : undefined}
            />
            {errors.date && (
              <p id="note-date-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.date}
              </p>
            )}
          </div>
        )}
        <button type="submit" className="app-primary w-full">
          Enregistrer la note
        </button>
      </form>
    </Modal>
  );
}
