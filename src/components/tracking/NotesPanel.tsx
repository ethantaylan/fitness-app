import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import type { NoteItem } from "../../lib/notes";

/** Liste des notes : même présentation que les performances (cartes, état vide avec action). */
export default function NotesPanel({
  items,
  onAdd,
  onEdit,
  onDelete,
}: Readonly<{
  items: NoteItem[];
  onAdd: () => void;
  onEdit: (item: NoteItem) => void;
  onDelete: (item: NoteItem) => void;
}>) {
  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand"
          aria-hidden="true"
        >
          <NotebookPen size={30} />
        </div>
        <h2 className="text-lg font-bold">Aucune note</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
          Garde en tête ton ressenti, une douleur, une charge ou un objectif. Tu peux ajouter une
          note à tout moment.
        </p>
        <button type="button" className="app-primary mt-5" onClick={onAdd}>
          <Plus size={18} aria-hidden="true" /> Ajouter ma première note
        </button>
      </div>
    );

  return (
    <ul className="space-y-4" aria-label="Notes">
      {items.map((item) => {
        const label = item.title || "Note";
        return (
          <li key={`${item.kind}:${item.id}`}>
            <article className="rounded-2xl border border-line bg-card p-4">
              <p className="mb-1 text-xs font-semibold text-ink-soft">
                {item.date
                  ? new Date(`${item.date}T12:00:00`).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Date inconnue"}
                {item.kind === "session" && " · Séance libre"}
              </p>
              {item.title && <h2 className="text-lg font-bold break-words">{item.title}</h2>}
              <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
                {item.content}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" className="app-secondary" onClick={() => onEdit(item)}>
                  <Pencil size={16} aria-hidden="true" /> Modifier
                  <span className="sr-only"> la note : {label}</span>
                </button>
                <button
                  type="button"
                  className="app-icon-button"
                  aria-label={`Supprimer la note : ${label}`}
                  onClick={() => onDelete(item)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
