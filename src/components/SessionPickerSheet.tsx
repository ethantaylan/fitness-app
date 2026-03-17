import { useState } from "react";
import { ChevronRight, Target, Hammer, X } from "lucide-react";
import { OBJECTIVE_META, DURATION_OPTIONS } from "../lib/constants";
import { OBJECTIVE_LABELS } from "../lib/agents";
import type { ObjectiveType, UserProfile } from "../lib/types";

interface Props {
  readonly profile: UserProfile;
  readonly onConfirm: (objective: ObjectiveType, duration: number) => void;
  readonly onClose: () => void;
  readonly onBuildOwn: () => void;
}

const ALL_OBJECTIVES = Object.entries(OBJECTIVE_LABELS) as [ObjectiveType, string][];

export default function SessionPickerSheet({ profile, onConfirm, onClose, onBuildOwn }: Props) {
  const [duration, setDuration] = useState<number>(profile.sessionDuration?.[0] ?? 45);

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Générer une séance"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl px-5 pt-5 pb-8 sm:mx-4">
        {/* Handle (mobile only) */}
        <div
          className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-lg">Générer une séance</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choisis le type de séance</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Quick-start: selon profil */}
        <button
          onClick={() => onConfirm(profile.objective, duration)}
          className="w-full flex items-center gap-3 bg-black text-white rounded-2xl px-4 py-3.5 mb-3 hover:bg-gray-900 active:scale-[0.99] transition-all"
        >
          <div
            className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Target className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="font-black text-sm">Selon mon profil</div>
            <div className="text-xs text-white/60">
              {OBJECTIVE_LABELS[profile.objective]} · {profile.level}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto opacity-50" aria-hidden="true" />
        </button>

        {/* Duration picker */}
        <fieldset className="mb-4">
          <legend className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
            Durée de la séance
          </legend>
          <div className="grid grid-cols-4 gap-2" role="group">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                aria-pressed={duration === d}
                className={`py-2 rounded-xl text-sm font-bold transition-all ${
                  duration === d
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </fieldset>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-3" aria-hidden="true">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            ou choisir un sport
          </span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Sport grid */}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choix du sport">
          {ALL_OBJECTIVES.map(([key, label]) => {
            const meta = OBJECTIVE_META[key];
            const isActive = key === profile.objective;
            return (
              <button
                key={key}
                onClick={() => onConfirm(key, duration)}
                aria-pressed={isActive}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all active:scale-95 ${
                  isActive
                    ? `${meta.bg} border-transparent`
                    : "bg-gray-50 border-transparent hover:border-gray-200"
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {meta.emoji}
                </span>
                <span
                  className={`text-[10px] font-bold leading-tight text-center ${isActive ? meta.color : "text-gray-600"}`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-4 mb-3" aria-hidden="true">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ou</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Workout builder shortcut */}
        <button
          onClick={onBuildOwn}
          className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 hover:bg-gray-100 transition-colors active:scale-[0.99]"
        >
          <div
            className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            aria-hidden="true"
          >
            <Hammer className="w-4 h-4 text-gray-700" />
          </div>
          <div className="text-left">
            <div className="font-black text-sm text-gray-900">Construire moi-même</div>
            <div className="text-xs text-gray-400">Choisis les zones à travailler</div>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto text-gray-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
