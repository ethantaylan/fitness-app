import { useNavigate } from "react-router-dom";
import { ThumbsUp, ThumbsDown, Minus, Clock, Flame, ChevronLeft, Zap } from "lucide-react";
import { useApp } from "../lib/store";
import Navbar from "../components/Navbar";

export default function DailySession() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const session = state.sessions.find((s) => s.date === todayDate) ?? state.sessions[0];

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Aucune séance trouvée.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  function giveFeedback(feedback: "good" | "normal" | "hard") {
    dispatch({ type: "UPDATE_SESSION_FEEDBACK", date: session.date, feedback });
  }

  const intensityColor = session.intensity?.toLowerCase().includes("intense")
    ? "bg-red-100 text-red-700"
    : session.intensity?.toLowerCase().includes("modér")
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16 sm:px-6">
        {/* Back */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 flex items-center gap-1.5 text-sm text-gray-400 hover:text-black mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Séance du jour</p>
          <h1 className="text-2xl sm:text-3xl font-black capitalize">{session.date}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${intensityColor}`}>
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
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="space-y-2">
                {session.warmup.map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-gray-400">
                      {w.duration_sec ? `${w.duration_sec}s` : w.reps ? `${w.reps} reps` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Blocks */}
        <div className="mb-6 space-y-5">
          {session.blocks?.map((block, bi) => (
            <div key={bi}>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                {block.block_name}
              </h2>
              <div className="space-y-3">
                {block.exercises?.map((ex, ei) => (
                  <div key={ei} className="border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-bold">{ex.name}</div>
                        {ex.notes && <div className="text-xs text-gray-500 mt-0.5">{ex.notes}</div>}
                      </div>
                      {ex.load_kg && (
                        <div className="shrink-0 bg-black text-white text-xs font-black px-2.5 py-1 rounded-lg">
                          {ex.load_kg}
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
                      {ex.tempo && (
                        <span className="bg-gray-100 rounded-full px-2.5 py-1 font-medium">
                          Tempo {ex.tempo}
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
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="space-y-2">
                {session.cooldown.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400">
                      {c.duration_sec ? `${c.duration_sec}s` : c.reps ? `${c.reps} reps` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Motivation message */}
        {session.motivation_message && (
          <div className="bg-black text-white rounded-2xl p-5 mb-6">
            <div className="text-lg mb-2">💬</div>
            <p className="font-semibold text-sm leading-relaxed">{session.motivation_message}</p>
            <p className="text-xs text-white/40 mt-2">— Ton coach IA</p>
          </div>
        )}

        {/* Feedback */}
        <div>
          <h2 className="font-black mb-3">Comment s'est passée la séance ?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ton feedback permet à l'IA d'ajuster l'intensité des prochaines séances.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                value: "good" as const,
                icon: ThumbsUp,
                label: "Bien passé",
                color: "hover:border-green-500 hover:bg-green-50",
                activeColor: "border-green-500 bg-green-50 text-green-700",
              },
              {
                value: "normal" as const,
                icon: Minus,
                label: "Normal",
                color: "hover:border-yellow-500 hover:bg-yellow-50",
                activeColor: "border-yellow-500 bg-yellow-50 text-yellow-700",
              },
              {
                value: "hard" as const,
                icon: ThumbsDown,
                label: "Trop dur",
                color: "hover:border-red-400 hover:bg-red-50",
                activeColor: "border-red-400 bg-red-50 text-red-600",
              },
            ].map(({ value, icon: Icon, label, color, activeColor }) => (
              <button
                key={value}
                onClick={() => giveFeedback(value)}
                className={`flex flex-col items-center gap-2 border-2 rounded-2xl p-4 transition-all ${
                  session.feedback === value ? activeColor : `border-gray-200 ${color}`
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
          {session.feedback && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Feedback enregistré ! L'IA en tiendra compte pour ta prochaine séance. 🎯
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
