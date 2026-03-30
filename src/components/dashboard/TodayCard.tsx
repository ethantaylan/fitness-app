import { Link } from "react-router-dom";
import { Clock, Zap, Dumbbell, RotateCcw, Play, ChevronRight } from "lucide-react";
import { FEEDBACK_META } from "../../lib/constants";
import type { FeedbackType, ObjectiveMeta } from "../../lib/constants";
import type { UserProfile } from "../../lib/types";

const MAX_SESSIONS_PER_DAY = 3;

interface SessionSummary {
  uid: string;
  date: string;
  duration_min: number;
  intensity: string;
  goal: string;
  feedback?: string;
}

interface Props {
  readonly todaySessions: SessionSummary[];
  readonly profile: UserProfile | null;
  readonly objMeta: ObjectiveMeta | null;
  readonly generatingSession: boolean;
  readonly sessionError: string;
  readonly onGenerate: () => void;
  readonly onNavigate: (uid: string) => void;
}

export default function TodayCard({
  todaySessions,
  profile,
  objMeta,
  generatingSession,
  sessionError,
  onGenerate,
  onNavigate,
}: Props) {
  const canGenerate = !!profile?.objective && todaySessions.length < MAX_SESSIONS_PER_DAY;

  if (!profile?.objective) {
    return (
      <div className="text-center">
        <div
          className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3"
          aria-hidden="true"
        >
          <Dumbbell className="w-5 h-5 text-gray-400" />
        </div>
        <p className="font-black text-gray-900 mb-1 text-sm">Configure ton profil</p>
        <p className="text-xs text-gray-400 mb-4">
          Remplis ton profil pour debloquer les seances bonus a ajouter en plus du programme.
        </p>
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-2 bg-black text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-900 transition-colors"
        >
          Configurer mon profil <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-black text-gray-900">Tu as plus de dispo aujourd'hui ?</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          Cette zone sert a generer une seance bonus en plus de ton programme si tu veux t'entrainer
          davantage.
        </p>
      </div>

      {todaySessions.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
            Seances bonus du jour
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Tu peux revoir ici les seances supplementaires que tu as deja ajoutees aujourd'hui.
          </p>
        </div>
      )}

      {todaySessions.map((s, i) => {
        const fb = s.feedback ? FEEDBACK_META[s.feedback as FeedbackType] : null;
        return (
          <button
            key={s.uid}
            type="button"
            aria-label={`Voir la seance bonus ${s.goal}`}
            className="w-full flex items-center justify-between text-left rounded-2xl border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 active:scale-[0.99]"
            onClick={() => onNavigate(s.uid)}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <span className="text-xs font-black text-green-600">#{i + 1}</span>
              </div>
              <div>
                <div className="font-black text-gray-900 text-sm">{s.goal || "Seance prete"}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {s.duration_min} min
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Zap className="w-3 h-3" aria-hidden="true" />
                    {s.intensity}
                  </span>
                  {fb && (
                    <span
                      className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${fb.bg} ${fb.border} ${fb.color}`}
                    >
                      {fb.emoji} {fb.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div
              className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </div>
          </button>
        );
      })}

      {todaySessions.length > 0 && canGenerate && (
        <div className="h-px bg-gray-100 my-1" aria-hidden="true" />
      )}

      {canGenerate ? (
        <div className={todaySessions.length === 0 ? "text-center" : ""}>
          {todaySessions.length === 0 && (
            <>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${objMeta?.bg ?? "bg-gray-100"}`}
                aria-hidden="true"
              >
                <Dumbbell className={`w-5 h-5 ${objMeta?.color ?? "text-gray-400"}`} />
              </div>
              <p className="font-black text-gray-900 mb-1 text-sm">
                Tu veux rajouter une seance en plus ?
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Si tu as une disponibilite supplementaire, l'IA te prepare une seance bonus adaptee
                a ton niveau en quelques secondes.
              </p>
            </>
          )}
          {sessionError && (
            <p role="alert" className="text-xs text-red-500 bg-red-50 rounded-xl p-2 mb-3">
              {sessionError}
            </p>
          )}
          <button
            onClick={onGenerate}
            disabled={generatingSession}
            aria-busy={generatingSession}
            className={`${todaySessions.length === 0 ? "inline-flex" : "w-full flex"} items-center justify-center gap-2 bg-black text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 hover:bg-gray-900`}
          >
            {generatingSession ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" aria-hidden="true" />
                Generation de la seance bonus...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" aria-hidden="true" />
                {todaySessions.length === 0
                  ? "Generer une seance bonus"
                  : "Ajouter une autre seance bonus"}
              </>
            )}
          </button>
        </div>
      ) : (
        <p className="text-xs text-center text-gray-400 py-1">
          Maximum {MAX_SESSIONS_PER_DAY} seances bonus par jour atteint
        </p>
      )}
    </div>
  );
}
