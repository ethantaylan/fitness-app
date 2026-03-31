import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Calendar, Zap, Target } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { generateDailySession } from "../lib/openai";
import { exportProgramToPDF } from "../lib/pdf";
import { OBJECTIVE_META, LEVEL_META } from "../lib/constants";
import { OBJECTIVE_LABELS } from "../lib/agents";
import type { UserProfile, ObjectiveType } from "../lib/types";
import Navbar from "../components/Navbar";
import SessionPickerSheet from "../components/SessionPickerSheet";
import Section from "../components/ui/Section";
import TodayCard from "../components/dashboard/TodayCard";
import ProgramSection from "../components/dashboard/ProgramSection";
import WeekProgressCard from "../components/dashboard/WeekProgressCard";

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, userEmail, userFirstName } = useAuth();

  const [generatingSession, setGeneratingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Connecte-toi pour acceder a ton suivi.</p>
          <Link to="/sign-in" className="bg-black text-white px-6 py-3 rounded-xl font-bold">
            Connexion
          </Link>
        </div>
      </div>
    );
  }

  const { program, sessions, profile } = state;
  const weeksWithSessions = program?.weeks.filter((week) => (week.sessions?.length ?? 0) > 0) ?? [];
  const currentProgramWeek =
    weeksWithSessions.find((week) => week.sessions.some((session) => !session.completed)) ??
    weeksWithSessions[weeksWithSessions.length - 1] ??
    null;
  const completedSessions =
    currentProgramWeek?.sessions.filter((session) => session.completed).length ?? 0;
  const totalSessions = currentProgramWeek?.sessions.length ?? 0;

  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const todaySessions = sessions.filter((s) => s.date === todayDate);
  const lastFeedback = sessions.find((s) => s.feedback)?.feedback;

  const objMeta = profile?.objective ? OBJECTIVE_META[profile.objective] : null;
  const levelMeta = profile?.level ? LEVEL_META[profile.level] : null;
  const firstName = userFirstName ?? "Athlete";
  const heroBg = objMeta ? `${objMeta.bg} border-2 ${objMeta.border}` : "bg-black";
  const heroChipClass = objMeta ? "theme-hero-chip" : "bg-white/10 text-white";
  const heroActionClass = objMeta
    ? "theme-hero-chip-action"
    : "bg-white/15 text-white hover:bg-white/25";

  useEffect(() => {
    const shouldOpenBonus = new URLSearchParams(location.search).get("bonus") === "1";
    if (!shouldOpenBonus) return;

    if (!profile?.objective) {
      void navigate("/onboarding", { replace: true });
      return;
    }

    setShowSessionPicker(true);
    void navigate("/dashboard", { replace: true });
  }, [location.search, navigate, profile?.objective]);

  function handleGenerateSession() {
    if (!profile?.objective) {
      void navigate("/onboarding");
      return;
    }
    setShowSessionPicker(true);
  }

  async function handleConfirmSessionType(objective: ObjectiveType, duration: number) {
    setShowSessionPicker(false);
    setGeneratingSession(true);
    setSessionError("");
    try {
      const profileForSession: UserProfile = {
        ...(profile as UserProfile),
        objective,
        sessionDuration: [duration],
      };
      const session = await generateDailySession(profileForSession, lastFeedback);
      const uid = crypto.randomUUID();
      dispatch({ type: "ADD_SESSION", session: { ...session, uid, date: todayDate } });
      void navigate(`/session?uid=${uid}`);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Erreur lors de la generation.");
    } finally {
      setGeneratingSession(false);
    }
  }

  function handleDownloadPDF() {
    if (!program) return;
    setDownloadingPDF(true);
    void exportProgramToPDF(program).finally(() => setDownloadingPDF(false));
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {showSessionPicker && profile && (
        <SessionPickerSheet
          profile={profile as UserProfile}
          onConfirm={(obj, dur) => {
            void handleConfirmSessionType(obj, dur);
          }}
          onClose={() => setShowSessionPicker(false)}
          onBuildOwn={() => {
            setShowSessionPicker(false);
            void navigate("/builder");
          }}
        />
      )}

      <main className="max-w-2xl mx-auto px-4 pt-20 pb-28 md:pb-24 sm:px-6">
        <div
          className={`relative overflow-hidden rounded-3xl p-6 mt-6 mb-6 ${heroBg}`}
          role="banner"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-widest mb-1 ${objMeta ? objMeta.color : "text-white/50"}`}
              >
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <h1
                className={`text-2xl font-black leading-tight ${objMeta ? "text-gray-900" : "text-white"}`}
              >
                Bonjour {firstName}
                {objMeta?.emoji ? ` ${objMeta.emoji}` : ""}
              </h1>
              {userEmail && (
                <p className={`text-xs mt-0.5 ${objMeta ? "text-gray-500" : "text-white/50"}`}>
                  {userEmail}
                </p>
              )}
            </div>
            <Link
              to="/settings"
              aria-label="Modifier mon profil"
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${heroActionClass}`}
            >
              Modifier
            </Link>
          </div>

          {profile?.objective && (
            <div className="relative mt-4 flex flex-wrap gap-2" aria-label="Profil sportif">
              <span
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${heroChipClass}`}
              >
                <Target className="w-3 h-3" aria-hidden="true" />
                {OBJECTIVE_LABELS[profile.objective]}
              </span>
              {levelMeta && (
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${heroChipClass}`}
                >
                  <span aria-hidden="true">{levelMeta.emoji}</span>
                  {levelMeta.label}
                </span>
              )}
              {profile.weeklyFrequency && (
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${heroChipClass}`}
                >
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  {profile.weeklyFrequency}x / sem
                </span>
              )}
            </div>
          )}
        </div>

        {program !== null && (
          <WeekProgressCard
            currentWeek={currentProgramWeek}
            completedSessions={completedSessions}
            totalSessions={totalSessions}
            hasProgram={program !== null}
            onToggleSession={(sessionId, completed) => {
              if (!currentProgramWeek) return;
              dispatch({
                type: "SET_PROGRAM_SESSION_COMPLETION",
                weekNumber: currentProgramWeek.week_number,
                sessionId,
                completed,
              });
            }}
          />
        )}

        <div className="space-y-4">
          <ProgramSection
            program={program}
            downloadingPDF={downloadingPDF}
            onDownloadPDF={handleDownloadPDF}
          />

          <Section
            icon={<Zap className="w-4 h-4" />}
            title="Séance bonus"
            color="text-green-600"
            bg="bg-green-50"
            badge={
              <span className="rounded-full border border-green-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-green-700">
                Optionnel
              </span>
            }
          >
            <TodayCard
              todaySessions={todaySessions}
              profile={profile as UserProfile | null}
              objMeta={objMeta}
              generatingSession={generatingSession}
              sessionError={sessionError}
              onGenerate={handleGenerateSession}
              onNavigate={(uid) => navigate(`/session?uid=${uid}`)}
            />
          </Section>
        </div>
      </main>
    </div>
  );
}
