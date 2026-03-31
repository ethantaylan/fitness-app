import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Clock, Flame, Zap, ChevronLeft } from "lucide-react";
import { formatLoadValue } from "../lib/formatLoad";
import type { DailySession } from "../lib/types";

function intensityClasses(intensity: string) {
  const i = intensity?.toLowerCase() ?? "";
  if (i.includes("intense")) return "bg-red-100 text-red-700";
  if (i.includes("modér")) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

export default function SharedSession() {
  const [searchParams] = useSearchParams();

  const session = useMemo<DailySession | null>(() => {
    const d = searchParams.get("d");
    if (!d) return null;
    try {
      return JSON.parse(decodeURIComponent(atob(d))) as DailySession;
    } catch {
      return null;
    }
  }, [searchParams]);

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <Zap className="w-7 h-7 text-gray-300" />
        </div>
        <h1 className="font-black text-xl mb-2">Séance introuvable</h1>
        <p className="text-sm text-gray-400 mb-6">Le lien est invalide ou a expiré.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const badgeClass = intensityClasses(session.intensity);

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-bold">Séance partagée via Vincere</span>
        <Link
          to="/"
          className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors"
        >
          Créer mon compte →
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-16 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Séance partagée</p>
          <h1 className="text-2xl sm:text-3xl font-black capitalize">{session.date}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeClass}`}>
              {session.intensity}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.duration_min} min
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {session.goal}
            </span>
          </div>
        </div>

        {/* Warmup */}
        {session.warmup?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
              Échauffement
            </h2>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              {session.warmup.map((w) => (
                <div key={w.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-gray-400">
                    {w.duration_sec ? `${w.duration_sec}s` : w.reps ? `${w.reps} reps` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocks */}
        <div className="mb-6 space-y-5">
          {session.blocks?.map((block) => (
            <div key={block.block_name}>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                {block.block_name}
              </h2>
              <div className="space-y-3">
                {block.exercises?.map((ex) => (
                  <div key={ex.name} className="border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-bold">{ex.name}</div>
                        {ex.notes && <div className="text-xs text-gray-500 mt-0.5">{ex.notes}</div>}
                      </div>
                      {ex.load_kg && (
                        <div className="shrink-0 bg-black text-white text-xs font-black px-2.5 py-1 rounded-lg">
                          {formatLoadValue(ex.load_kg, "")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-gray-100 rounded-full px-2.5 py-1 font-medium">
                        {ex.sets} séries
                      </span>
                      <span className="bg-gray-100 rounded-full px-2.5 py-1 font-medium">
                        {ex.reps} reps
                      </span>
                      {ex.rest_sec && (
                        <span className="bg-gray-100 rounded-full px-2.5 py-1 font-medium">
                          {ex.rest_sec}s repos
                        </span>
                      )}
                    </div>
                    {ex.alternative && (
                      <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Alternative :{" "}
                        <span className="font-medium text-gray-600">{ex.alternative}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Cooldown */}
        {session.cooldown?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
              Récupération
            </h2>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              {session.cooldown.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-400">
                    {c.duration_sec ? `${c.duration_sec}s` : c.reps ? `${c.reps} reps` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivation */}
        {session.motivation_message && (
          <div className="bg-black text-white rounded-2xl p-5 mb-8">
            <div className="text-lg mb-2">💬</div>
            <p className="font-semibold text-sm leading-relaxed">{session.motivation_message}</p>
            <p className="text-xs text-white/40 mt-2">- Coach IA Vincere</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
          <p className="font-black text-lg mb-1">Génère tes propres séances</p>
          <p className="text-sm text-gray-500 mb-4">
            Vincere crée des séances personnalisées adaptées à ton niveau, tes objectifs et ton
            équipement.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </div>
    </div>
  );
}
