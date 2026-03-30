import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";
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
  const progressPct =
    totalSessions > 0 ? Math.min((completedSessions / totalSessions) * 100, 100) : 0;
  const goalReached = totalSessions > 0 && completedSessions === totalSessions;

  return (
    <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Cette semaine
          </p>
          {currentWeek ? (
            <p className="mt-0.5 text-sm font-black text-gray-900">
              Semaine {currentWeek.week_number}
              {currentWeek.focus && (
                <span className="font-medium text-gray-500"> - {currentWeek.focus}</span>
              )}
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-black text-gray-900">Objectif hebdo</p>
          )}
        </div>

        {hasProgram && (
          <Link
            to="/result"
            className="flex items-center gap-1 text-xs font-bold text-gray-400 transition-colors hover:text-black"
          >
            Programme <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-black transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-black text-gray-700">
          {completedSessions} / {totalSessions}
        </span>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        La jauge avance uniquement quand tu coches tes seances faites.
      </p>

      {goalReached && (
        <p className="mt-2 text-xs font-bold text-green-600">Objectif hebdo atteint.</p>
      )}

      {currentWeek && currentWeek.sessions.length > 0 && (
        <div className="mt-4 space-y-2">
          {currentWeek.sessions.map((session) => (
            <button
              key={`${currentWeek.week_number}-${session.session_id}-${session.day}`}
              type="button"
              onClick={() => onToggleSession?.(session.session_id, !session.completed)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                session.completed
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-gray-200 bg-gray-50 hover:bg-white"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  session.completed ? "bg-emerald-600 text-white" : "bg-white text-gray-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-black ${
                    session.completed ? "text-emerald-900" : "text-gray-900"
                  }`}
                >
                  {session.day}
                </div>
                <div className="truncate text-xs text-gray-500">{session.type}</div>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  session.completed ? "bg-white text-emerald-700" : "bg-white text-gray-500"
                }`}
              >
                {session.completed ? "Fait" : "Je check"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
