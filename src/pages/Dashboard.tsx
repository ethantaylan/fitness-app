import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Dumbbell,
  Calendar,
  TrendingUp,
  Zap,
  Clock,
  ChevronRight,
  Download,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../lib/store";
import { generateDailySession } from "../lib/openai";
import { exportProgramToPDF } from "../lib/pdf";
import { OBJECTIVE_LABELS } from "../lib/agents";
import type { UserProfile } from "../lib/types";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [generatingSession, setGeneratingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  if (!state.currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Connecte-toi pour accéder à ton dashboard.</p>
          <Link to="/login" className="bg-black text-white px-6 py-3 rounded-xl font-bold">
            Connexion
          </Link>
        </div>
      </div>
    );
  }

  const { currentUser, program, sessions, profile } = state;
  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = sessions.find(
    (s) =>
      s.date ===
      new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
  );
  const lastFeedback = sessions.find((s) => s.feedback)?.feedback;

  async function handleGenerateSession() {
    if (!profile?.objective) {
      void navigate("/onboarding");
      return;
    }
    setGeneratingSession(true);
    setSessionError("");
    try {
      const session = await generateDailySession(profile as UserProfile, lastFeedback);
      dispatch({ type: "ADD_SESSION", session: { ...session, date: todayDate } });
      void navigate("/session");
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setGeneratingSession(false);
    }
  }

  async function handleDownloadPDF() {
    if (!program) return;
    setDownloadingPDF(true);
    try {
      await exportProgramToPDF(program);
    } finally {
      setDownloadingPDF(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16 sm:px-6">
        {/* Header */}
        <div className="mt-8 mb-8">
          <p className="text-sm text-gray-400 mb-1">{todayDate}</p>
          <h1 className="text-2xl sm:text-3xl font-black">Bonjour 👋</h1>
          <p className="text-gray-500 text-sm mt-1">{currentUser.email}</p>
        </div>

        {/* Profile summary */}
        {profile?.objective && (
          <div className="bg-black text-white rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <span className="font-bold">Ton profil</span>
              </div>
              <Link to="/settings" className="text-xs text-white/50 hover:text-white underline">
                Modifier
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-white/50 text-xs">Objectif</div>
                <div className="font-semibold">{OBJECTIVE_LABELS[profile.objective]}</div>
              </div>
              <div>
                <div className="text-white/50 text-xs">Niveau</div>
                <div className="font-semibold capitalize">{profile.level ?? "—"}</div>
              </div>
              <div>
                <div className="text-white/50 text-xs">Fréquence</div>
                <div className="font-semibold">{profile.weeklyFrequency ?? "—"}× / sem</div>
              </div>
            </div>
          </div>
        )}

        {/* Today's session */}
        <div className="mb-6">
          <h2 className="font-black text-lg mb-3">Séance du jour</h2>
          {today ? (
            <div
              className="border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-black transition-colors"
              onClick={() => navigate("/session")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm font-semibold text-green-600">Générée</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  {today.duration_min} min
                </span>
                <span className="flex items-center gap-1 text-gray-500">
                  <Zap className="w-3.5 h-3.5" />
                  {today.intensity}
                </span>
              </div>
              {today.feedback && (
                <div className="mt-3 text-xs bg-gray-50 rounded-xl p-2 text-gray-500">
                  Feedback donné :{" "}
                  <strong>
                    {today.feedback === "good"
                      ? "👍 Bien passé"
                      : today.feedback === "hard"
                        ? "👎 Trop dur"
                        : "😐 Normal"}
                  </strong>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Dumbbell className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Pas encore de séance pour aujourd'hui.
                {!profile?.objective && (
                  <span className="block mt-1 text-xs text-gray-400">
                    Configure ton profil d'abord.
                  </span>
                )}
              </p>
              {sessionError && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl p-2 mb-3">{sessionError}</p>
              )}
              <button
                onClick={handleGenerateSession}
                disabled={generatingSession || !profile?.objective}
                className="flex items-center gap-2 bg-black text-white font-bold px-5 py-2.5 rounded-xl text-sm mx-auto disabled:opacity-40 hover:bg-gray-900 transition-colors"
              >
                {generatingSession ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Génération…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Générer ma séance
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Program card */}
        {program ? (
          <div className="border border-gray-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black">Mon programme</h2>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingPDF ? "Export…" : "PDF"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xl font-black">{program.program_overview.duration_weeks}</div>
                <div className="text-xs text-gray-400">semaines</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xl font-black">
                  {program.program_overview.training_days_per_week}
                </div>
                <div className="text-xs text-gray-400">séances/sem</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xl font-black">{program.weeks?.length ?? 0}</div>
                <div className="text-xs text-gray-400">semaines planif.</div>
              </div>
            </div>
            <Link
              to="/result"
              className="mt-3 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold hover:border-black hover:bg-black hover:text-white transition-all"
            >
              Voir le programme complet
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-2xl p-5 mb-6 text-center">
            <p className="text-sm text-gray-500 mb-3">Aucun programme généré.</p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 bg-black text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-900 transition-colors"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Créer mon programme
            </Link>
          </div>
        )}

        {/* Session history */}
        {sessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-lg">Historique</h2>
              <span className="text-xs text-gray-400">
                {sessions.length} séance{sessions.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-gray-100 rounded-xl p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium text-xs">{s.date}</div>
                      <div className="text-xs text-gray-400">
                        {s.duration_min} min · {s.intensity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.feedback && (
                      <span className="text-base">
                        {s.feedback === "good" ? "👍" : s.feedback === "hard" ? "👎" : "😐"}
                      </span>
                    )}
                    <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!profile?.objective && (
          <div className="mt-6 text-center">
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors"
            >
              Configurer mon profil
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
