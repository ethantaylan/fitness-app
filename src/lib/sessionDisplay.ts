import type { Session } from "./types";

export function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase("fr-FR") + text.slice(1) : text;
}

/** « lundi » → « Lun. » */
export function shortDay(day: string): string {
  const clean = day.trim();
  return clean.length > 3 ? `${capitalize(clean.slice(0, 3))}.` : capitalize(clean);
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** « Aujourd'hui », « Demain » ou « jeudi 15 octobre » ; repli sur le jour saisi dans le plan. */
export function whenLabel(date: Date | null, fallbackDay: string, now = new Date()): string {
  if (!date) return capitalize(fallbackDay);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(date, now)) return "Aujourd'hui";
  if (sameDay(date, tomorrow)) return "Demain";
  return capitalize(
    date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
  );
}

/** Sous-titre porteur de contenu : les deux premiers blocs de la séance. */
export function sessionFocus(session: Session): string {
  return session.blocks
    .map((block) => block.block_name)
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");
}
