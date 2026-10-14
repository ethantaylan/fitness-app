import { useEffect, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserPlus,
  Check,
  Dumbbell,
  Clock,
  Flame,
  Target,
  Apple,
  Droplets,
  Trash2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { OBJECTIVE_LABELS } from "../lib/agents";
import { exerciseMetrics, formatSeconds } from "../lib/exerciseDisplay";
import { programSchedule, profileDifferences } from "../lib/program";
import type { Session, Week } from "../lib/types";
import Navbar from "../components/Navbar";

function ExerciseRow({
  ex,
}: Readonly<{
  ex: {
    name: string;
    sets: number;
    reps: number | string;
    load_kg?: string;
    rest_sec?: number;
    alternative?: string;
    notes?: string;
  };
}>) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4">
        <div className="text-sm font-semibold">{ex.name}</div>
        {ex.notes && <p className="mt-1 text-sm text-gray-500">{ex.notes}</p>}
        {ex.alternative && (
          <p className="mt-1 text-sm text-gray-500">Alternative : {ex.alternative}</p>
        )}
      </td>
      <td className="py-3 text-sm">
        {exerciseMetrics(ex)
          .map((metric) => `${metric.label} : ${metric.value}`)
          .join(" · ") || "Mesures non renseignées"}
      </td>
    </tr>
  );
}

function ExerciseMobileCard({
  ex,
}: Readonly<{
  ex: {
    name: string;
    sets: number;
    reps: number | string;
    load_kg?: string;
    rest_sec?: number;
    alternative?: string;
    notes?: string;
  };
}>) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="font-black text-gray-900">{ex.name}</div>
      {(ex.notes || ex.alternative) && (
        <div className="mt-1 space-y-1 text-xs leading-relaxed text-gray-500">
          {ex.notes && <p>{ex.notes}</p>}
          {ex.alternative && <p>Alternative : {ex.alternative}</p>}
        </div>
      )}
      <dl className="mt-3 flex flex-wrap gap-2">
        {exerciseMetrics(ex).map((metric) => (
          <div key={metric.label} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <dt className="text-gray-500">{metric.label}</dt>
            <dd className="font-semibold">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SessionCard({
  session,
  onToggleCompletion,
  initiallyExpanded = false,
}: Readonly<{
  initiallyExpanded?: boolean;
  session: Session;
  onToggleCompletion?: (completed: boolean) => void;
}>) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  useEffect(() => {
    if (initiallyExpanded) setExpanded(true);
  }, [initiallyExpanded]);
  const intensity = session.intensity?.toLowerCase() ?? "";

  let intensityColor = "bg-green-50 text-green-600";
  if (intensity.includes("intense")) {
    intensityColor = "bg-red-50 text-red-500";
  } else if (intensity.includes("moder") || intensity.includes("mod")) {
    intensityColor = "bg-yellow-50 text-yellow-600";
  }

  return (
    <div
      id={`program-session-${session.session_id}`}
      tabIndex={-1}
      className={`overflow-hidden rounded-2xl border ${
        session.completed
          ? "theme-program-session-completed border-green-200 bg-green-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-black text-white">
              {session.day?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">
                {session.day} - {session.type}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" /> {session.duration_min} min
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${intensityColor}`}>
                  {session.intensity}
                </span>
              </div>
            </div>
          </div>

          {session.completed && (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
              Faite
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onToggleCompletion?.(!session.completed)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              session.completed
                ? "border-green-200 bg-green-100 text-green-800 hover:bg-green-200"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {session.completed ? (
              <>
                <Check className="h-4 w-4" />
                Marquer non réalisée
              </>
            ) : (
              <>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] border border-current">
                  <Check className="h-2.5 w-2.5" strokeWidth={2.8} />
                </span>
                Marquer réalisée
              </>
            )}
          </button>

          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {expanded ? "Masquer le détail" : "Voir le détail"}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {session.warmup?.length > 0 && (
            <div className="mb-4 mt-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                Échauffement
              </div>
              <div className="flex flex-wrap gap-2">
                {session.warmup.map((item) => (
                  <span key={item.name} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">
                    {item.name} {item.duration_sec ? `- ${formatSeconds(item.duration_sec)}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {session.blocks?.map((block) => (
            <div key={block.block_name} className="mb-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                {block.block_name}
              </div>
              <div className="space-y-3 sm:hidden">
                {block.exercises?.map((exercise) => (
                  <ExerciseMobileCard key={exercise.name} ex={exercise} />
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full w-max">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="py-2 pr-4 text-left font-semibold">Exercice</th>
                      <th className="py-2 text-left font-semibold">Travail prévu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.exercises?.map((exercise) => (
                      <ExerciseRow key={exercise.name} ex={exercise} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {session.cooldown?.length > 0 && (
            <div className="mt-2">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                Récupération
              </div>
              <div className="flex flex-wrap gap-2">
                {session.cooldown.map((item) => (
                  <span key={item.name} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">
                    {item.name} {item.duration_sec ? `- ${formatSeconds(item.duration_sec)}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {session.notes && (
            <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs italic text-gray-500">
              {session.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function WeekSection({
  week,
  targetSession,
  onToggleCompletion,
}: Readonly<{
  week: Week;
  targetSession?: string | null;
  onToggleCompletion?: (sessionId: string, completed: boolean) => void;
}>) {
  const [open, setOpen] = useState(true);
  const sessionCount = week.sessions?.length ?? 0;
  const completedCount = week.sessions?.filter((session) => session.completed).length ?? 0;
  const progress = sessionCount === 0 ? 0 : Math.round((completedCount / sessionCount) * 100);

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <button
        type="button"
        aria-expanded={open}
        className="w-full text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-black">Semaine {week.week_number}</span>
              {week.focus && (
                <span className="text-sm font-medium text-gray-500">{week.focus}</span>
              )}
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-gray-500">
                <span>
                  {completedCount} / {sessionCount} séances cochées
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="theme-progress-fill h-full rounded-full bg-black transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {week.sessions?.map((session) => (
            <SessionCard
              key={session.session_id}
              session={session}
              initiallyExpanded={session.session_id === targetSession}
              onToggleCompletion={(completed) =>
                onToggleCompletion?.(session.session_id, completed)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProgramResult() {
  const { state, dispatch } = useApp();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const schedule = programSchedule(state.program, state.programStartDate);
  const selectedWeek = Number(params.get("week")) || schedule.activeWeek?.week_number || 1;
  const targetSession = params.get("session");
  useEffect(() => {
    if (!targetSession) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`program-session-${targetSession}`);
      element?.scrollIntoView({ block: "start", behavior: "smooth" });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [targetSession, selectedWeek]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const program = state.program;

  if (!program) {
    return (
      <div className="theme-app-page min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 pb-28 pt-20 sm:px-6">
          <div className="mb-6 mt-6">
            <p className="mb-1 text-xs uppercase tracking-wider text-gray-400">Entraînement</p>
            <h1 className="text-2xl font-black">Mon programme</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-4xl shadow-sm">
              P
            </div>
            <h2 className="mb-2 text-lg font-black">Aucun programme actif</h2>
            <p className="max-w-xs text-sm leading-relaxed text-gray-400">
              Réponds à quelques questions, ton plan sur mesure est prêt en 2 minutes.
            </p>
            <button
              type="button"
              onClick={() => void navigate("/onboarding")}
              className="mt-6 rounded-2xl bg-black px-6 py-3 text-sm font-bold text-white transition-transform active:scale-95"
            >
              Créer mon programme
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { program_overview, weeks, nutrition_recommendations, general_advice, user_profile } =
    program;
  const differences = profileDifferences(user_profile, state.profile);
  const profileDetails = [
    user_profile?.gender && { k: "Genre", v: user_profile.gender },
    user_profile?.age && { k: "Age", v: `${user_profile.age} ans` },
    user_profile?.height && { k: "Taille", v: `${user_profile.height} cm` },
    user_profile?.weight && { k: "Poids", v: `${user_profile.weight} kg` },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div className="theme-app-page min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6 md:pb-16">
        <div className="mb-8 mt-8">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-sm font-semibold text-green-600">
              {(location.state as { generated?: boolean } | null)?.generated
                ? "Programme généré avec succès"
                : "Programme actif"}
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-black sm:text-4xl">Ton programme Vincere</h1>
          <p className="text-gray-500">{program_overview.summary}</p>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          {program.generated_at
            ? `Créé le ${new Date(program.generated_at).toLocaleDateString("fr-FR")}`
            : state.programStartDate
              ? `Démarré le ${new Date(state.programStartDate + "T12:00:00").toLocaleDateString("fr-FR")}`
              : "Date de création non disponible"}
        </p>
        {differences.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-bold">Ton profil a évolué</h2>
            <p className="mt-1 text-sm text-gray-700">
              Différences : {differences.join(", ")}. Ce plan conserve les paramètres utilisés à sa
              création. Modifier ton profil adapte les futures séances libres ; le programme reste
              inchangé jusqu'à sa régénération.
            </p>
            <button
              type="button"
              className="app-secondary mt-3"
              onClick={() => void navigate("/onboarding", { state: { prefill: true } })}
            >
              Mettre à jour mon programme
            </button>
          </div>
        )}
        <div className="mb-10">
          <h2 className="mb-3 text-xl font-black">Tes séances</h2>
          <label htmlFor="program-week" className="mb-2 block text-sm font-semibold">
            Semaine
          </label>
          <select
            id="program-week"
            className="app-input mb-4"
            value={selectedWeek}
            onChange={(event) => setParams({ week: event.target.value })}
          >
            {weeks.map((week) => (
              <option key={week.week_number} value={week.week_number}>
                Semaine {week.week_number}
                {week.focus ? ` · ${week.focus}` : ""}
              </option>
            ))}
          </select>
          {(weeks.filter((week) => week.week_number === selectedWeek).length
            ? weeks.filter((week) => week.week_number === selectedWeek)
            : weeks.slice(0, 1)
          ).map((week) => (
            <WeekSection
              key={week.week_number}
              week={week}
              targetSession={targetSession}
              onToggleCompletion={(sessionId, completed) =>
                dispatch({
                  type: "SET_PROGRAM_SESSION_COMPLETION",
                  weekNumber: week.week_number,
                  sessionId,
                  completed,
                })
              }
            />
          ))}
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              icon: Dumbbell,
              label: "Discipline",
              value: user_profile?.objective ? OBJECTIVE_LABELS[user_profile.objective] : "-",
            },
            {
              icon: Target,
              label: "Objectif",
              value:
                user_profile?.goalDetail ||
                (user_profile?.objective
                  ? OBJECTIVE_LABELS[user_profile.objective]
                  : state.profile?.goalDetail || "Objectif non renseigné"),
            },
            { icon: Clock, label: "Durée", value: `${program_overview.duration_weeks} semaines` },
            {
              icon: Flame,
              label: "Fréquence",
              value: `${program_overview.training_days_per_week} x / semaine`,
            },
            { icon: Clock, label: "Niveau", value: user_profile?.level ?? "-" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-200 p-4">
              <Icon className="mb-2 h-4 w-4 text-gray-400" />
              <div className="text-xs text-gray-400">{label}</div>
              <div className="text-sm font-bold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-10 flex flex-col gap-3 sm:flex-row">
          {!isSignedIn && (
            <button
              type="button"
              onClick={() => void navigate("/sign-up")}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 py-3 font-semibold transition-colors hover:bg-gray-50"
            >
              <UserPlus className="h-4 w-4" />
              Créer un compte pour le suivi
            </button>
          )}

          {isSignedIn && (
            <button
              type="button"
              onClick={() => void navigate("/dashboard")}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 py-3 font-semibold transition-colors hover:bg-gray-50"
            >
              Aller à l’accueil
            </button>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2">
              <span className="text-sm font-medium text-red-700">Supprimer ce programme ?</span>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "CLEAR_PROGRAM" });
                  void navigate("/dashboard");
                }}
                className="text-sm font-bold text-red-600 transition-colors hover:text-red-800"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-red-200 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer le programme
            </button>
          )}
        </div>

        {profileDetails.length > 0 && (
          <div className="mb-8 rounded-2xl bg-gray-50 p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-gray-400">
              Paramètres à la création
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white px-4">
              {profileDetails.map((item, index) => (
                <div
                  key={item.k}
                  className={`flex items-center justify-between gap-4 py-3 text-sm ${
                    index === 0 ? "" : "border-t border-gray-100"
                  }`}
                >
                  <span className="text-gray-400">{item.k}</span>
                  <span className="text-right font-semibold capitalize">{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {nutrition_recommendations && (
          <div className="mb-8 rounded-2xl border border-gray-200 p-6">
            <h2 className="mb-4 font-black">Recommandations nutritionnelles</h2>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
                <div className="text-xl font-black">
                  {nutrition_recommendations.daily_calories_estimate}
                </div>
                <div className="text-xs text-gray-400">kcal/jour</div>
              </div>
              <div className="text-center">
                <Apple className="mx-auto mb-1 h-5 w-5 text-red-500" />
                <div className="text-xl font-black">
                  {nutrition_recommendations.protein_target_g} g
                </div>
                <div className="text-xs text-gray-400">protéines/jour</div>
              </div>
              <div className="text-center">
                <Droplets className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                <div className="text-xl font-black">
                  {nutrition_recommendations.water_intake_l} L
                </div>
                <div className="text-xs text-gray-400">eau/jour</div>
              </div>
            </div>
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              {nutrition_recommendations.notes}
            </p>
          </div>
        )}

        {general_advice && (
          <div className="mb-8 border-l-4 border-black pl-5">
            <h2 className="mb-2 font-black">Conseils du coach</h2>
            <p className="text-sm leading-relaxed text-gray-600">{general_advice}</p>
          </div>
        )}

        <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-400">
          {program.legal_disclaimer ??
            "Ces recommandations sont à titre informatif uniquement et ne remplacent pas l'avis d'un professionnel de santé ou d'un coach certifié."}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => void navigate("/onboarding")}
            className="mx-auto flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-black"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Générer un nouveau programme
          </button>
        </div>
      </div>
    </div>
  );
}
