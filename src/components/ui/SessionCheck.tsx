import { useState } from "react";
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
  disabled = false,
}: Readonly<{
  completed: boolean;
  /** Jour de la séance, repris dans le libellé accessible (« lundi »). */
  day: string;
  onChange: (completed: boolean) => void | Promise<void>;
  variant?: "box" | "button";
  className?: string;
  disabled?: boolean;
}>) {
  const [pending, setPending] = useState(false);
  const dayLabel = day.trim().toLocaleLowerCase("fr-FR");
  const context = /^séance /i.test(day) ? dayLabel : `séance du ${dayLabel}`;
  const label = completed
    ? `Marquer la ${context} comme non réalisée`
    : `Marquer la ${context} comme réalisée`;

  async function toggle() {
    if (pending || disabled) return;
    const next = !completed;
    setPending(true);
    void selectionFeedback();
    try {
      await onChange(next);
      if (next)
        showToast({
          message: `${context.charAt(0).toUpperCase() + context.slice(1)} marquée comme réalisée.`,
          actionLabel: "Annuler",
          onAction: () => {
            void Promise.resolve(onChange(false)).catch(() =>
              showToast({ message: "Annulation impossible. Réessaie." }),
            );
          },
        });
    } catch {
      showToast({
        message: "Validation impossible. Vérifie ta connexion et les semaines précédentes.",
      });
    } finally {
      setPending(false);
    }
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
        disabled={disabled || pending}
        onClick={() => void toggle()}
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
      disabled={disabled || pending}
      onClick={() => void toggle()}
      className={`relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${className}`}
    >
      {box}
    </button>
  );
}
