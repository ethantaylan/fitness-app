import { Check } from "lucide-react";
import { selectionFeedback } from "../../lib/native";
import { showToast } from "../../lib/toast";

/**
 * Case « séance réalisée » : le seul composant utilisé pour cocher une séance du
 * programme (Accueil, Programme, détail de séance). Même carré, même coche, même
 * libellé accessible contextualisé, retour immédiat et annulation depuis le toast.
 */
export default function SessionCheck({
  completed,
  day,
  onChange,
  variant = "box",
  className = "",
}: Readonly<{
  completed: boolean;
  /** Jour de la séance, repris dans le libellé accessible (« lundi »). */
  day: string;
  onChange: (completed: boolean) => void;
  variant?: "box" | "button";
  className?: string;
}>) {
  const dayLabel = day.trim().toLocaleLowerCase("fr-FR");
  const label = completed
    ? `Marquer la séance du ${dayLabel} comme non réalisée`
    : `Marquer la séance du ${dayLabel} comme réalisée`;

  function toggle() {
    const next = !completed;
    void selectionFeedback();
    onChange(next);
    if (next)
      showToast({
        message: `Séance du ${dayLabel} marquée comme réalisée.`,
        actionLabel: "Annuler",
        onAction: () => onChange(false),
      });
  }

  const box = (
    <span
      aria-hidden="true"
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
        completed
          ? "border-brand bg-brand text-brand-fg"
          : "border-line-strong bg-card text-transparent"
      }`}
    >
      <Check size={16} strokeWidth={3} />
    </span>
  );

  if (variant === "button")
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={label}
        onClick={toggle}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink transition-colors hover:bg-card-soft ${className}`}
      >
        {box}
        <span aria-hidden="true">
          {completed ? "Séance réalisée · annuler" : "Marquer comme réalisée"}
        </span>
      </button>
    );

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-label={label}
      onClick={toggle}
      className={`relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${className}`}
    >
      {box}
    </button>
  );
}
