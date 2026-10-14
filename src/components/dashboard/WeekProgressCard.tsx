import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { programSessionLink } from "../../lib/program";
import type { Week } from "../../lib/types";

interface Props {
  readonly currentWeek: Week | null;
  readonly completedSessions: number;
  readonly totalSessions: number;
  readonly hasProgram: boolean;
  readonly onToggleSession?: (sessionId: string, completed: boolean) => void;
}
export default function WeekProgressCard({
  currentWeek,
  completedSessions,
  totalSessions,
  hasProgram,
  onToggleSession,
}: Props) {
  const percent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="font-bold">
          {currentWeek ? `Semaine ${currentWeek.week_number}` : "Cette semaine"}
        </h2>
        {hasProgram && (
          <Link
            className="text-sm font-semibold text-gray-500"
            to={`/result?week=${currentWeek?.week_number ?? 1}`}
          >
            Programme <ChevronRight className="inline" size={14} />
          </Link>
        )}
      </div>
      {currentWeek?.focus && <p className="mb-3 text-sm text-gray-500">{currentWeek.focus}</p>}
      <div className="flex items-center gap-3">
        <progress
          className="h-2 w-full accent-emerald-600"
          max={totalSessions || 1}
          value={completedSessions}
          aria-label="Séances réalisées"
        />
        <span className="shrink-0 text-sm font-semibold">
          {completedSessions}/{totalSessions}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-500">{percent}% des séances réalisées</p>
      <div className="mt-4 space-y-2">
        {currentWeek?.sessions.map((session) => (
          <div
            key={session.session_id}
            className={`flex items-center gap-3 rounded-xl border p-3 ${session.completed ? "border-emerald-200 bg-emerald-50" : "border-gray-200"}`}
          >
            <Link
              to={programSessionLink(currentWeek.week_number, session.session_id)}
              className="min-w-0 flex-1"
            >
              <p className="font-semibold">{session.day}</p>
              <p className="mt-1 text-sm text-gray-500 break-words">
                {session.type} · {session.duration_min} min
              </p>
            </Link>
            <button
              type="button"
              role="checkbox"
              aria-checked={Boolean(session.completed)}
              aria-label={`${session.completed ? "Marquer non réalisée" : "Marquer réalisée"} : ${session.day} ${session.type}`}
              onClick={() => onToggleSession?.(session.session_id, !session.completed)}
              className={`app-icon-button ${session.completed ? "text-emerald-700" : ""}`}
            >
              <Check size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
