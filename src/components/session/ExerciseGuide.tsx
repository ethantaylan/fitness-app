import { useState } from "react";
import { BookOpen } from "lucide-react";
import { findExerciseGuide } from "../../lib/exerciseGuides";
import Modal from "../ui/Modal";

export default function ExerciseGuide({ name, notes }: Readonly<{ name: string; notes?: string }>) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(1);
  const [failed, setFailed] = useState(false);
  const guide = findExerciseGuide(name);
  return (
    <>
      <button
        type="button"
        className="app-secondary mt-3 min-h-11 w-full gap-2"
        aria-label={`Comment faire : ${name}`}
        onClick={(event) => {
          event.currentTarget.focus();
          setPosition(1);
          setFailed(false);
          setOpen(true);
        }}
      >
        <BookOpen size={18} aria-hidden="true" /> Comment faire ?
      </button>
      <Modal open={open} title={name} onClose={() => setOpen(false)}>
        {guide ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-line">
              {failed ? (
                <p className="p-5 text-sm text-ink-soft" role="status">
                  Illustration indisponible. Les consignes restent accessibles ci-dessous.
                </p>
              ) : (
                <img
                  key={`${guide.id}-${position}`}
                  src={`/exercises/everkinetic/${guide.id}-${position}.webp`}
                  alt={`${guide.title} — position ${position} sur 2`}
                  width={560}
                  height={560}
                  onError={() => setFailed(true)}
                  className="h-64 w-full bg-white object-contain sm:h-80"
                />
              )}
              <div
                className="flex gap-2 bg-card-soft p-2"
                role="group"
                aria-label="Positions du mouvement"
              >
                {[1, 2].map((step) => (
                  <button
                    key={step}
                    type="button"
                    aria-pressed={position === step}
                    className={`${position === step ? "app-primary" : "app-secondary"} min-h-11 flex-1`}
                    onClick={() => {
                      setPosition(step);
                      setFailed(false);
                    }}
                  >
                    Position {step}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-ink-soft">
              Deux positions illustrées pour comprendre le mouvement.
            </p>
            <section>
              <h3 className="mb-3 font-bold">Les étapes</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
            <section className="rounded-xl bg-card-soft p-4">
              <h3 className="font-bold">À éviter</h3>
              <p className="mt-1 text-sm leading-relaxed">{guide.mistake}</p>
            </section>
            {notes && (
              <section>
                <h3 className="font-bold">Dans ta séance</h3>
                <p className="mt-1 text-sm text-ink-soft">{notes}</p>
              </section>
            )}
            <p className="text-xs leading-relaxed text-ink-soft">
              Illustrations : Everkinetic / Greg Priday. Images redimensionnées et consignes
              adaptées en français par Vincere.{" "}
              <a
                className="underline"
                href="/exercises/everkinetic/NOTICE.md"
                target="_blank"
                rel="noreferrer"
              >
                Sources et crédits
              </a>{" "}
              ·{" "}
              <a
                className="underline"
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              La démonstration de cet exercice n’est pas encore disponible dans la bibliothèque.
            </p>
            {notes && (
              <section>
                <h3 className="font-bold">Consignes de ta séance</h3>
                <p className="mt-2 text-sm leading-relaxed">{notes}</p>
              </section>
            )}
          </div>
        )}
        <button
          type="button"
          className="app-secondary mt-5 min-h-11 w-full"
          onClick={() => setOpen(false)}
        >
          Revenir à ma séance
        </button>
      </Modal>
    </>
  );
}
