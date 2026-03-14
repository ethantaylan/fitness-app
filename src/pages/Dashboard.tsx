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
  Flame,
  Target,
  Play,
  CheckCircle2,
} from "lucide-react";
import { useUser } from "@clerk/react";
import { useApp } from "../lib/store";
import { generateDailySession } from "../lib/openai";
import { exportProgramToPDF } from "../lib/pdf";
import { OBJECTIVE_LABELS } from "../lib/agents";
import type { UserProfile, ObjectiveType } from "../lib/types";
import Navbar from "../components/Navbar";

// same palette as Settings.tsx
const OBJECTIVE_META: Record<
  ObjectiveType,
  { emoji: string; color: string; bg: string; border: string }
> = {
  "perte-poids": {
    emoji: "🔥",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-400",
  },
  "prise-masse": {
    emoji: "💪",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-400",
  },
  entretien: {
    emoji: "🌿",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-400",
  },
  competition: {
    emoji: "🏆",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-400",
  },
  hyrox: { emoji: "⚡", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-400" },
  crossfit: { emoji: "🎯", color: "text-red-600", bg: "bg-red-50", border: "border-red-400" },
  running: { emoji: "👟", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-400" },
  yoga: { emoji: "🧘", color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-400" },
  "remise-en-forme": {
    emoji: "✨",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-400",
  },
};

const LEVEL_META = {
  débutant: { emoji: "🌱", label: "Débutant" },
  intermédiaire: { emoji: "⚡", label: "Intermédiaire" },
  avancé: { emoji: "🔥", label: "Avancé" },
};

function isThisWeek(dateStr: string) {
  const d = new Date();
  const start = new Date(d.setDate(d.getDate() - d.getDay()));
  return new Date(dateStr) >= start;
}

const FEEDBACK_EMOJI: Record<string, string> = { good: "👍", hard: "👎", normal: "😐" };
const FEEDBACK_LABEL: Record<string, string> = {
  good: "Bien passé",
  hard: "Trop difficile",
  normal: "Normal",
};
const FEEDBACK_COLOR: Record<string, string> = {
  good: "bg-green-50 border-green-100 text-green-700",
  hard: "bg-red-50 border-red-100 text-red-700",
  normal: "bg-amber-50 border-amber-100 text-amber-700",
};

// ── Shared Section wrapper (same as Settings.tsx) ─────────────────────────────
function Section({
  icon,
  title,
  color,
  bg,
  children,
  noPad = false,
  badge,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  children: React.ReactNode;
  noPad?: boolean;
  badge?: React.ReactNode;
}>) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className={`flex items-center justify-between gap-2.5 px-5 py-4 border-b border-gray-50 ${bg}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={color}>{icon}</div>
          <h2 className={`text-xs font-black uppercase tracking-wider ${color}`}>{title}</h2>
        </div>
        {badge}
      </div>
      <div className={noPad ? "" : "p-5"}>{children}</div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type ObjMeta = { emoji: string; color: string; bg: string; border: string } | null;

interface TodayCardProps {
  readonly today:
    | { date: string; duration_min: number; intensity: string; feedback?: string }
    | undefined;
  readonly profile: UserProfile | null;
  readonly objMeta: ObjMeta;
  readonly generatingSession: boolean;
  readonly sessionError: string;
  readonly onGenerate: () => void;
  readonly onNavigate: () => void;
}
function TodayCard({
  today,
  profile,
  objMeta,
  generatingSession,
  sessionError,
  onGenerate,
  onNavigate,
}: TodayCardProps) {
  if (today) {
    const emoji = today.feedback ? (FEEDBACK_EMOJI[today.feedback] ?? "😐") : null;
    const label = today.feedback ? (FEEDBACK_LABEL[today.feedback] ?? "Normal") : null;
    return (
      <button
        type="button"
        className="w-full flex items-center justify-between text-left rounded-xl hover:bg-gray-50 transition-colors p-1 -m-1 active:scale-[0.99]"
        onClick={onNavigate}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center shrink-0">
            <Dumbbell className="w-4.5 h-4.5 text-green-600" />
          </div>
          <div>
            <div className="font-black text-gray-900 text-sm">Séance prête</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {today.duration_min} min
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Zap className="w-3 h-3" />
                {today.intensity}
              </span>
              {label && (
                <span
                  className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${FEEDBACK_COLOR[today.feedback ?? ""] ?? "bg-gray-50 border-gray-100 text-gray-500"}`}
                >
                  {emoji} {label}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shrink-0">
          <ChevronRight className="w-4 h-4 text-white" />
        </div>
      </button>
    );
  }

  const btnClass = objMeta
    ? `bg-black text-white hover:bg-gray-900`
    : `bg-gray-200 text-gray-400 cursor-not-allowed`;

  return (
    <div className={`text-center ${profile?.objective ? "" : "opacity-75"}`}>
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${objMeta?.bg ?? "bg-gray-100"}`}
      >
        <Dumbbell className={`w-5 h-5 ${objMeta?.color ?? "text-gray-400"}`} />
      </div>
      <p className="font-black text-gray-900 mb-1 text-sm">
        {profile?.objective ? "Prêt pour ta séance ?" : "Configure ton profil"}
      </p>
      <p className="text-xs text-gray-400 mb-4">
        {profile?.objective
          ? "L'IA génère une séance adaptée à ton niveau en 10 secondes."
          : "Remplis ton profil pour débloquer les séances quotidiennes."}
      </p>
      {sessionError && (
        <p className="text-xs text-red-500 bg-red-50 rounded-xl p-2 mb-3">{sessionError}</p>
      )}
      {profile?.objective ? (
        <button
          onClick={onGenerate}
          disabled={generatingSession}
          className={`inline-flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 ${btnClass}`}
        >
          {generatingSession ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" /> Génération en cours…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Générer ma séance
            </>
          )}
        </button>
      ) : (
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-2 bg-black text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-900 transition-colors"
        >
          Configurer mon profil <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function ProgramSection({
  program,
  downloadingPDF,
  onDownloadPDF,
}: Readonly<{
  program: {
    program_overview: { duration_weeks: number; training_days_per_week: number };
    weeks?: unknown[];
  } | null;
  downloadingPDF: boolean;
  onDownloadPDF: () => void;
}>) {
  if (!program) {
    return (
      <Section
        icon={<Dumbbell className="w-4 h-4" />}
        title="Programme"
        color="text-indigo-600"
        bg="bg-indigo-50"
      >
        <div className="text-center">
          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Target className="w-4 h-4 text-gray-400" />
          </div>
          <p className="font-bold text-gray-900 text-sm mb-1">Aucun programme généré</p>
          <p className="text-xs text-gray-400 mb-4">
            Réponds à quelques questions, l'IA crée ton plan sur mesure.
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 bg-black text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-900 transition-colors"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Créer mon programme
          </Link>
        </div>
      </Section>
    );
  }
  return (
    <Section
      icon={<Dumbbell className="w-4 h-4" />}
      title="Programme"
      color="text-indigo-600"
      bg="bg-indigo-50"
      noPad
    >
      <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-50">
        {[
          { value: program.program_overview.duration_weeks, label: "semaines" },
          { value: program.program_overview.training_days_per_week, label: "séances / sem" },
          { value: program.weeks?.length ?? 0, label: "semaines planif." },
        ].map(({ value, label }) => (
          <div key={label} className="py-4 text-center">
            <div className="text-xl font-black text-gray-900">{value}</div>
            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="p-4 flex items-center gap-3">
        <Link
          to="/result"
          className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-100 rounded-xl py-2.5 text-sm font-black hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all"
        >
          Voir le programme complet <ChevronRight className="w-4 h-4" />
        </Link>
        <button
          onClick={onDownloadPDF}
          disabled={downloadingPDF}
          className="flex items-center gap-1.5 border-2 border-gray-100 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-600 hover:border-gray-300 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          {downloadingPDF ? "…" : "PDF"}
        </button>
      </div>
    </Section>
  );
}

function HistoryList({
  sessions,
}: Readonly<{
  sessions: Array<{ date: string; duration_min: number; intensity: string; feedback?: string }>;
}>) {
  return (
    <div className="divide-y divide-gray-50">
      {sessions.slice(0, 5).map((s, i) => {
        const fc = s.feedback
          ? (FEEDBACK_COLOR[s.feedback] ?? "bg-gray-50 border-gray-100 text-gray-500")
          : "";
        const emoji = s.feedback ? (FEEDBACK_EMOJI[s.feedback] ?? "") : "";
        const lbl = s.feedback ? (FEEDBACK_LABEL[s.feedback] ?? "") : "";
        const fl = emoji && lbl ? `${emoji} ${lbl}` : null;
        return (
          <div key={`${s.date}-${i}`} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-8 h-8 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-gray-900 capitalize leading-tight">
                {s.date}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {s.duration_min} min · {s.intensity}
              </div>
            </div>
            {fl && (
              <span
                className={`text-[10px] font-bold border px-2.5 py-1 rounded-full shrink-0 ${fc}`}
              >
                {fl}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [generatingSession, setGeneratingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const { isSignedIn, user } = useUser();

  if (!isSignedIn || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Connecte-toi pour accéder à ton suivi.</p>
          <Link to="/sign-in" className="bg-black text-white px-6 py-3 rounded-xl font-bold">
            Connexion
          </Link>
        </div>
      </div>
    );
  }

  const { program, sessions, profile } = state;
  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = sessions.find((s) => s.date === todayDate);
  const lastFeedback = sessions.find((s) => s.feedback)?.feedback;

  const totalSessions = sessions.length;
  const thisWeekSessions = sessions.filter((s) => isThisWeek(s.date)).length;
  const goodSessions = sessions.filter((s) => s.feedback === "good").length;

  const objMeta = profile?.objective ? OBJECTIVE_META[profile.objective] : null;
  const levelMeta = profile?.level ? LEVEL_META[profile.level] : null;
  const firstName =
    user.firstName ?? user.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "Athlète";
  // same heroBg logic as Settings.tsx
  const heroBg = objMeta ? `${objMeta.bg} border-2 ${objMeta.border}` : "bg-black";

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

  function handleDownloadPDF() {
    if (!program) return;
    setDownloadingPDF(true);
    void exportProgramToPDF(program).finally(() => setDownloadingPDF(false));
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-24 sm:px-6">
        {/* Hero — même style que Settings */}
        <div className={`relative overflow-hidden rounded-3xl p-6 mt-6 mb-6 ${heroBg}`}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-black" />
          <div className="absolute -bottom-12 -right-4 w-56 h-56 rounded-full opacity-5 bg-black" />

          <div className="relative flex items-start justify-between">
            <div>
              <div
                className={`text-xs font-bold uppercase tracking-widest mb-1 ${objMeta ? objMeta.color : "text-white/50"}`}
              >
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <h1
                className={`text-2xl font-black leading-tight ${objMeta ? "text-gray-900" : "text-white"}`}
              >
                Bonjour {objMeta?.emoji ?? "👋"}
                <br />
                {firstName}
              </h1>
              {user.emailAddresses[0] && (
                <p className={`text-xs mt-0.5 ${objMeta ? "text-gray-500" : "text-white/50"}`}>
                  {user.emailAddresses[0].emailAddress}
                </p>
              )}
            </div>
            <Link
              to="/settings"
              className={`text-[11px] font-semibold transition-colors ${objMeta ? "text-gray-400 hover:text-gray-900" : "text-white/40 hover:text-white"}`}
            >
              Modifier →
            </Link>
          </div>

          {/* Pills — même que Settings */}
          {profile?.objective && (
            <div className="relative mt-4 flex flex-wrap gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${objMeta ? "bg-white/70 text-gray-700" : "bg-white/10 text-white"}`}
              >
                <Target className="w-3 h-3" />
                <span>{OBJECTIVE_LABELS[profile.objective]}</span>
              </div>
              {levelMeta && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${objMeta ? "bg-white/70 text-gray-700" : "bg-white/10 text-white"}`}
                >
                  <span>{levelMeta.emoji}</span>
                  <span>{levelMeta.label}</span>
                </div>
              )}
              {profile.weeklyFrequency && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${objMeta ? "bg-white/70 text-gray-700" : "bg-white/10 text-white"}`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{profile.weeklyFrequency}x / sem</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Stats */}
          {totalSessions > 0 && (
            <Section
              icon={<Flame className="w-4 h-4" />}
              title="Mes stats"
              color="text-orange-600"
              bg="bg-orange-50"
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: <Flame className="w-4 h-4 text-orange-500" />,
                    value: totalSessions,
                    label: "séances total",
                  },
                  {
                    icon: <Calendar className="w-4 h-4 text-indigo-500" />,
                    value: thisWeekSessions,
                    label: "cette semaine",
                  },
                  {
                    icon: <TrendingUp className="w-4 h-4 text-green-500" />,
                    value: goodSessions,
                    label: "bien passées",
                  },
                ].map(({ icon, value, label }) => (
                  <div
                    key={label}
                    className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center"
                  >
                    <div className="flex justify-center mb-1">{icon}</div>
                    <div className="text-xl font-black text-gray-900">{value}</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Séance du jour */}
          <Section
            icon={<Zap className="w-4 h-4" />}
            title="Séance du jour"
            color="text-green-600"
            bg="bg-green-50"
            badge={
              today ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Générée
                </span>
              ) : undefined
            }
          >
            <TodayCard
              today={today}
              profile={profile as UserProfile | null}
              objMeta={objMeta}
              generatingSession={generatingSession}
              sessionError={sessionError}
              onGenerate={handleGenerateSession}
              onNavigate={() => navigate("/session")}
            />
          </Section>

          {/* Programme */}
          <ProgramSection
            program={program}
            downloadingPDF={downloadingPDF}
            onDownloadPDF={handleDownloadPDF}
          />

          {/* Historique */}
          {sessions.length > 0 && (
            <Section
              icon={<TrendingUp className="w-4 h-4" />}
              title="Historique récent"
              color="text-gray-600"
              bg="bg-gray-50"
              noPad
              badge={
                <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2.5 py-1 rounded-full">
                  {sessions.length} séance{sessions.length > 1 ? "s" : ""}
                </span>
              }
            >
              <HistoryList sessions={sessions} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
