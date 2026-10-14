import { useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowRight, Calendar, Gauge, Pencil, Target } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useGeneration } from "../lib/generationContext";
import { FREE_SESSION_BUILDER_ENABLED } from "../lib/features";
import { useApp } from "../lib/store";
import { LEVEL_META } from "../lib/constants";
import { programSchedule, programSessionLink, weekSessionStates } from "../lib/program";
import { capitalize, whenLabel } from "../lib/sessionDisplay";
import { OBJECTIVE_LABELS } from "../lib/agents";
import type { UserProfile } from "../lib/types";
import Navbar from "../components/Navbar";
import WeekStrip from "../components/dashboard/WeekStrip";
import FreeSessionCard from "../components/dashboard/FreeSessionCard";

function Chip({
  icon: Icon,
  children,
}: Readonly<{ icon: typeof Target; children: React.ReactNode }>) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-card-soft px-3 py-1.5 text-xs font-semibold">
      <Icon className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, userFirstName } = useAuth();
  const { program, sessions, profile } = state;
  const generating = ["running", "saving"].includes(useGeneration().state.phase);

  useEffect(() => {
    const shouldOpenBonus = new URLSearchParams(location.search).get("bonus") === "1";
    if (!shouldOpenBonus) return;

    if (!profile?.objective) {
      void navigate("/onboarding", { replace: true });
      return;
    }

    // Builder de séance libre masqué pour le moment (voir src/lib/features.ts).
    void navigate(FREE_SESSION_BUILDER_ENABLED ? "/builder" : "/dashboard", { replace: true });
  }, [location.search, navigate, profile?.objective]);

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <p className="mb-4 text-ink-soft">Connecte-toi pour accéder à ton suivi.</p>
          <Link to="/sign-in" className="app-primary">
            Connexion
          </Link>
        </div>
      </div>
    );
  }

  const schedule = programSchedule(program, state.programStartDate);
  const activeWeek = schedule.activeWeek;
  const weekStates = weekSessionStates(activeWeek, state.programStartDate);
  const next = schedule.next;

  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const todaySessions = sessions.filter((s) => s.date === todayDate);
  const levelMeta = profile?.level ? LEVEL_META[profile.level] : null;
  const firstName = userFirstName ?? "Athlète";

  function handleGenerateSession() {
    if (!profile?.objective) {
      void navigate("/onboarding");
      return;
    }
    // Builder de séance libre masqué pour le moment (voir src/lib/features.ts).
    if (FREE_SESSION_BUILDER_ENABLED) void navigate("/builder");
  }

  return (
    <div className="theme-app-page min-h-screen">
      <Navbar />

      <main className="app-dashboard-content mx-auto max-w-3xl space-y-4 px-4 pb-28 pt-20 sm:px-6 md:pb-24">
        <section
          aria-labelledby="home-title"
          className="mt-6 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6"
        >
          <p className="text-xs font-bold text-ink-soft">{capitalize(todayDate)}</p>
          <h1 id="home-title" className="mt-1 text-2xl font-black leading-tight">
            Bonjour {firstName}
          </h1>

          {profile?.objective && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip icon={Target}>{profile.goalDetail || OBJECTIVE_LABELS[profile.objective]}</Chip>
              {levelMeta && <Chip icon={Gauge}>{levelMeta.label}</Chip>}
              {profile.weeklyFrequency && (
                <Chip icon={Calendar}>{profile.weeklyFrequency} séances / semaine</Chip>
              )}
              <Link
                to="/settings"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-bold underline underline-offset-2"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Modifier mon profil
              </Link>
            </div>
          )}

          <div className="mt-5 border-t border-line pt-5">
            {!program && generating ? (
              <>
                <h2 className="text-lg font-black">Ton programme est en cours de création</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Tu peux continuer à utiliser l'application : on te prévient dès qu'il est prêt.
                </p>
              </>
            ) : !program ? (
              <>
                <h2 className="text-lg font-black">Aucun programme actif</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Réponds à quelques questions : ton plan sur mesure est prêt en 2 minutes.
                </p>
                <Link to="/onboarding" className="app-primary mt-4 w-full sm:w-auto">
                  Créer mon programme
                </Link>
              </>
            ) : next ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-brand">
                  Prochaine séance · {whenLabel(next.date, next.session.day)}
                </p>
                <h2 className="font-display mt-1 text-2xl font-black">{next.session.type}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Semaine {next.weekNumber} · {next.session.duration_min} min ·{" "}
                  {next.session.intensity}
                </p>
                <Link
                  className="app-primary mt-4 w-full sm:w-auto"
                  to={programSessionLink(next.weekNumber, next.session.session_id)}
                >
                  Commencer la séance
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-lg font-black">Aucune séance à venir</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {schedule.overdueCount > 0
                    ? "Il te reste des séances à rattraper dans ton programme."
                    : "Ton programme est terminé : bravo ! Tu peux en générer un nouveau."}
                </p>
              </>
            )}
          </div>
        </section>

        {program && activeWeek && (
          <WeekStrip
            weekNumber={activeWeek.week_number}
            totalWeeks={program.weeks.length}
            states={weekStates}
          />
        )}

        {/* Bloc « Séance libre » masqué avec le builder (voir src/lib/features.ts). */}
        {FREE_SESSION_BUILDER_ENABLED && (
          <FreeSessionCard
            todaySessions={todaySessions}
            profile={profile as UserProfile | null}
            onGenerate={handleGenerateSession}
            onNavigate={(uid) => navigate(`/session?uid=${uid}`)}
          />
        )}
      </main>
    </div>
  );
}
