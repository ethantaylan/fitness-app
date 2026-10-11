import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { timerFeedback } from "../lib/native";
import { formatTimer, remainingSeconds } from "../lib/timer";

export default function RestTimer() {
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (deadline === null) return;
    let notified = false;
    const tick = () => {
      const seconds = remainingSeconds(deadline, Date.now());
      setRemaining(seconds);
      if (seconds === 0 && !notified) {
        notified = true;
        setDeadline(null);
        setCompleted(true);
        void timerFeedback();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline]);

  const reset = (seconds: number) => {
    setDeadline(null);
    setDuration(seconds);
    setRemaining(seconds);
    setCompleted(false);
  };
  return (
    <section className="rest-timer" aria-label="Minuteur">
      <div className="flex items-center gap-2">
        <Timer className="shrink-0 text-emerald-600" size={18} aria-hidden="true" />
        <div className="min-w-0">
          <span className="block text-xs font-semibold text-gray-500">Minuteur</span>
          <output className="timer-digits tabular-nums" aria-label="Temps restant" aria-live="off">
            {formatTimer(remaining)}
          </output>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            className="app-icon-button"
            aria-label={deadline === null ? "Démarrer le minuteur" : "Mettre en pause"}
            title={deadline === null ? "Démarrer" : "Pause"}
            onClick={() => {
              if (deadline !== null) {
                setRemaining(remainingSeconds(deadline, Date.now()));
                setDeadline(null);
              } else {
                setCompleted(false);
                setDeadline(Date.now() + (remaining || duration) * 1000);
              }
            }}
          >
            {deadline === null ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button
            type="button"
            className="app-icon-button"
            aria-label="Réinitialiser le minuteur"
            title="Réinitialiser"
            onClick={() => reset(duration)}
          >
            <RotateCcw size={20} />
          </button>
          <button
            type="button"
            className="app-icon-button"
            aria-label={expanded ? "Masquer les durées" : "Choisir une durée"}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="timer-presets" role="group" aria-label="Durée du minuteur">
          {[30, 60, 90, 120].map((seconds) => (
            <button
              key={seconds}
              type="button"
              className="timer-preset"
              aria-pressed={duration === seconds}
              disabled={deadline !== null}
              onClick={() => {
                reset(seconds);
                setExpanded(false);
              }}
            >
              {seconds} s
            </button>
          ))}
        </div>
      )}
      <span role="status" className="sr-only">
        {completed ? "Minuteur terminé." : ""}
      </span>
    </section>
  );
}
