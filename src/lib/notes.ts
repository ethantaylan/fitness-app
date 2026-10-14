import { parseFrenchDate } from "./practice";
import type { DailySession, UserNote } from "./types";

export const MAX_NOTE_LENGTH = 2000;

/**
 * Élément affiché dans l'onglet Notes : une note libre, ou une ancienne note rattachée à une
 * séance libre (créée avant que les notes soient indépendantes) qui reste consultable et modifiable.
 */
export type NoteItem =
  | { kind: "note"; id: string; title?: string; content: string; date: string }
  | { kind: "session"; id: string; title?: string; content: string; date: string };

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function collectNotes(
  notes: UserNote[],
  sessions: DailySession[],
  now = new Date(),
): NoteItem[] {
  const items: NoteItem[] = notes.map((note) => ({ kind: "note", ...note }));
  for (const session of sessions) {
    const content = session.notes?.trim();
    if (!content) continue;
    const date = parseFrenchDate(session.date, now);
    items.push({
      kind: "session",
      id: session.uid,
      title: session.goal?.trim() || "Séance libre",
      content,
      date: date ? toKey(date) : "",
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export function validateNote(content: string, date: string): { content?: string; date?: string } {
  const errors: { content?: string; date?: string } = {};
  if (!content.trim()) errors.content = "Écris le contenu de ta note.";
  else if (content.length > MAX_NOTE_LENGTH)
    errors.content = `Ta note est trop longue (${MAX_NOTE_LENGTH} caractères maximum).`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date).getTime()))
    errors.date = "Choisis une date valide.";
  return errors;
}
