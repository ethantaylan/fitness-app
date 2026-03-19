import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Props {
  readonly sessionsThisWeek: number;
  readonly weeklyFreq: number;
  readonly currentWeekNum: number | null;
  readonly currentWeekFocus: string | null | undefined;
  readonly hasProgram: boolean;
}

export default function WeekProgressCard({
  sessionsThisWeek,
  weeklyFreq,
  currentWeekNum,
  currentWeekFocus,
  hasProgram,
}: Props) {
  const progressPct = Math.min((sessionsThisWeek / weeklyFreq) * 100, 100);
  const goalReached = sessionsThisWeek >= weeklyFreq;

  return (
    <div className="mb-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Cette semaine
          </p>
          {currentWeekNum === null ? (
            <p className="text-sm font-black text-gray-900 mt-0.5">Objectif hebdo</p>
          ) : (
            <p className="text-sm font-black text-gray-900 mt-0.5">
              Semaine {currentWeekNum}
              {currentWeekFocus && (
                <span className="font-medium text-gray-500"> · {currentWeekFocus}</span>
              )}
            </p>
          )}
        </div>
        {hasProgram && (
          <Link
            to="/result"
            className="text-xs font-bold text-gray-400 hover:text-black transition-colors flex items-center gap-1"
          >
            Programme <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-black text-gray-700 shrink-0">
          {sessionsThisWeek} / {weeklyFreq}
        </span>
      </div>

      {goalReached && (
        <p className="text-xs text-green-600 font-bold mt-2">🎯 Objectif hebdo atteint !</p>
      )}
    </div>
  );
}
