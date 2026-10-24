import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  Flame,
  ChevronRight,
  Zap,
  Dumbbell,
  CalendarDays,
  RefreshCw,
  Share2,
  Check,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { useApp } from "../lib/store";
import Navbar from "../components/Navbar";
import RestTimer from "../components/RestTimer";
import { getAppBaseUrl } from "../lib/appUrl";
import { shareLink } from "../lib/native";
import { encodeSharedSession } from "../lib/sharedSession";
import { replaceExercise } from "../lib/openai";
import { FEEDBACK_META } from "../lib/constants";
import { formatLoadValue } from "../lib/formatLoad";
import ExerciseGuide from "../components/session/ExerciseGuide";
import Modal from "../components/ui/Modal";
import {
  exerciseMetrics,
  formatSeconds,
  hasMeasure,
  usesHolds,
  workoutTitle,
} from "../lib/exerciseDisplay";
import { capitalize } from "../lib/sessionDisplay";
import { FREE_SESSION_BUILDER_ENABLED } from "../lib/features";
import { estimateMinutes, quickWorkoutsFor } from "../lib/quickWorkouts";
import type { DailySession, UserProfile } from "../lib/types";

// ── Session List ──────────────────────────────────────────────────────────────

function SessionList({
  sessions,
  profile,
  onCreate,
}: Readonly<{
  sessions: DailySession[];
  profile: UserProfile | null;
  onCreate: () => void;
}>) {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function handleDeleteClick(uid: string) {
    if (pendingDelete === uid) {
      dispatch({ type: "DELETE_SESSION", uid });
      setPendingDelete(null);
    } else {
      setPendingDelete(uid);
      setTimeout(() => setPendingDelete((p) => (p === uid ? null : p)), 4000);
    }
  }

  const grouped = sessions.reduce<Record<string, DailySession[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});
  // Création de séance libre masquée pour le moment (voir src/lib/features.ts).
  const canCreate = FREE_SESSION_BUILDER_ENABLED;
  const templates = canCreate ? quickWorkoutsFor().slice(0, 4) : [];

  return (
    <div className="theme-app-page min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-20 sm:px-6">
        <header className="mb-6 mt-6">
          <h1 className="text-2xl font-black">Séances libres</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {canCreate
              ? "Des séances ponctuelles, en plus de ton programme."
              : "L'historique de tes séances libres."}
          </p>
        </header>

        {canCreate && sessions.length > 0 && (
          <button
            type="button"
            onClick={onCreate}
            disabled={!profile}
            className="app-primary w-full"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Créer une séance libre
          </button>
        )}

        {templates.length > 0 && (
          <section className={sessions.length > 0 ? "mt-8" : ""} aria-labelledby="quick-templates">
            <h2 id="quick-templates" className="mb-3 text-base font-black">
              Modèles rapides
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => void navigate("/builder", { state: { cart: template.cart } })}
                    className="flex min-h-[4.5rem] w-full flex-col items-start justify-center gap-0.5 rounded-2xl border border-line bg-card p-3 text-left transition-colors hover:bg-card-soft"
                  >
                    <span className="text-sm font-bold">{template.label}</span>
                    <span className="flex items-center gap-1 text-xs text-ink-soft">
                      <Clock className="h-3 w-3" aria-hidden="true" />~
                      {estimateMinutes(template.cart)} min
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sessions.length === 0 ? (
          <section
            className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-card px-6 py-10 text-center"
            aria-labelledby="empty-title"
          >
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand"
              aria-hidden="true"
            >
              <Dumbbell className="h-8 w-8" />
            </div>
            <h2 id="empty-title" className="text-lg font-black">
              Aucune séance libre
            </h2>
            {canCreate ? (
              <>
                <p className="mt-1 max-w-xs text-sm text-ink-soft">
                  Crée ta première séance : elle apparaîtra ici avec ton ressenti.
                </p>
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={!profile}
                  className="app-primary mt-5"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Créer une séance libre
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 max-w-xs text-sm text-ink-soft">
                  La création de séances libres arrive bientôt. En attendant, retrouve toutes tes
                  séances dans ton programme.
                </p>
                <Link to="/result" className="app-secondary mt-5">
                  Voir mon programme
                </Link>
              </>
            )}
          </section>
        ) : (
          <section className="mt-8" aria-labelledby="free-history">
            <h2 id="free-history" className="mb-4 text-base font-black">
              Historique
            </h2>
            <div className="space-y-6">
              {Object.keys(grouped).map((date) => (
                <div key={date}>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-ink-soft">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {capitalize(date)}
                  </h3>
                  <ul className="space-y-2">
                    {grouped[date].map((s) => {
                      const fb = s.feedback ? FEEDBACK_META[s.feedback] : null;
                      const isConfirming = pendingDelete === s.uid;
                      const title = workoutTitle(s);
                      return (
                        <li
                          key={s.uid}
                          className="flex items-stretch rounded-2xl border border-line bg-card transition-colors hover:bg-card-muted"
                        >
                          <button
                            type="button"
                            onClick={() => void navigate(`/session?uid=${s.uid}`)}
                            className="min-w-0 flex-1 p-4 text-left"
                          >
                            <p className="break-words text-sm font-bold">{title}</p>
                            {s.goal !== title && (
                              <p className="mt-1 break-words text-sm text-ink-soft">{s.goal}</p>
                            )}
                            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {s.duration_min} min
                              </span>
                              <span>{s.intensity}</span>
                              <span className="font-semibold">
                                {fb ? fb.label : "Sans ressenti"}
                              </span>
                            </p>
                          </button>
                          <div className="flex shrink-0 items-center pr-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(s.uid)}
                              aria-label={
                                isConfirming
                                  ? `Confirmer la suppression de la séance ${title}`
                                  : `Supprimer la séance ${title}`
                              }
                              className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold ${
                                isConfirming
                                  ? "bg-danger text-paper"
                                  : "text-ink-soft hover:bg-danger-soft hover:text-danger"
                              }`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              {isConfirming && "Confirmer ?"}
                            </button>
                            <ChevronRight className="h-5 w-5 text-ink-soft" aria-hidden="true" />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Session Detail ────────────────────────────────────────────────────────────

function SessionDetail({
  session,
  profile,
}: Readonly<{ session: DailySession; profile: UserProfile | null }>) {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  /** key: "blockName::exerciseName" */
  const [replacing, setReplacing] = useState<Record<string, boolean>>({});
  const [replaced, setReplaced] = useState<Record<string, boolean>>({});
  const [infoModal, setInfoModal] = useState<null | {
    name: string;
    notes?: string;
    alternative?: string;
    load_kg?: string;
  }>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  function giveFeedback(feedback: "good" | "normal" | "hard") {
    dispatch({ type: "UPDATE_SESSION_FEEDBACK", uid: session.uid, feedback });
  }

  async function handleReplace(blockName: string, exerciseName: string) {
    if (!profile) return;
    setActionError("");
    const key = `${blockName}::${exerciseName}`;
    setReplacing((prev) => ({ ...prev, [key]: true }));
    try {
      const block = session.blocks.find((b) => b.block_name === blockName);
      const exercise = block?.exercises.find((e) => e.name === exerciseName);
      if (!exercise) return;
      const newEx = await replaceExercise(exercise, {
        blockName,
        sessionGoal: session.goal,
        profile,
      });
      dispatch({
        type: "REPLACE_EXERCISE",
        sessionUid: session.uid,
        blockName,
        exerciseName,
        newExercise: newEx,
      });
      setReplaced((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setReplaced((prev) => ({ ...prev, [key]: false })), 2500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Le remplacement n'a pas abouti.");
    } finally {
      setReplacing((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleShare() {
    setActionError("");
    try {
      const encoded = encodeSharedSession(session);
      const url = `${getAppBaseUrl()}/s#d=${encodeURIComponent(encoded)}`;
      const result = await shareLink(url, "Ma séance Vincere");
      if (result === "copied") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        setActionError("Le partage n'a pas abouti.");
    }
  }

  const holds = usesHolds(profile?.objective, session.goal);

  return (
    <div className="theme-app-page min-h-screen bg-white">
      <Navbar />
      <div className="session-page-content mx-auto max-w-4xl px-4 pb-24 pt-20 sm:px-6 md:pb-16">
        <div className="mt-6 mb-6 flex items-center justify-between gap-3">
          <button type="button" className="app-secondary" onClick={() => void navigate("/session")}>
            Retour aux séances
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                dispatch({ type: "DELETE_SESSION", uid: session.uid });
                void navigate("/session");
              }}
              title="Supprimer cette séance"
              aria-label="Supprimer cette séance"
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleShare}
              className={`flex min-h-11 items-center gap-1.5 text-xs font-bold px-3 rounded-xl transition-all ${
                copied
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Lien copié !
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" /> Partager
                </>
              )}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Séance libre</p>
          <h1 className="text-2xl sm:text-3xl font-black">{workoutTitle(session)}</h1>
          <p className="mt-2 text-sm text-gray-500">{session.date}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="rounded-full bg-card-soft px-3 py-1 text-xs font-semibold">
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

        {actionError && (
          <p role="alert" className="mb-5 text-sm text-red-600">
            {actionError}
          </p>
        )}
        <RestTimer />
        {/* Warmup */}
        {session.warmup?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
              Échauffement
            </h2>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="space-y-2">
                {session.warmup.map((w) => {
                  let display = "";
                  if (w.duration_sec) display = formatSeconds(w.duration_sec);
                  else if (w.reps) display = `${w.reps} reps`;
                  return (
                    <div key={w.name} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{w.name}</span>
                      <span className="text-gray-400">{display}</span>
                    </div>
                  );
                })}
              </div>
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
                {block.exercises?.map((ex) => {
                  const key = `${block.block_name}::${ex.name}`;
                  const isReplacing = replacing[key];
                  const isReplaced = replaced[key];
                  return (
                    <div
                      key={ex.name}
                      className={`border rounded-2xl p-4 transition-all ${
                        isReplaced ? "border-green-300 bg-green-50/50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold">{ex.name}</div>
                          {ex.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-3">{ex.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasMeasure(ex.load_kg) && (
                            <div className="bg-black text-white text-xs font-black px-2.5 py-1 rounded-lg max-w-[80px] truncate">
                              {formatLoadValue(ex.load_kg, "")}
                            </div>
                          )}
                          {(ex.notes ?? ex.alternative) && (
                            <button
                              onClick={() =>
                                setInfoModal({
                                  name: ex.name,
                                  notes: ex.notes,
                                  alternative: ex.alternative,
                                  load_kg: ex.load_kg,
                                })
                              }
                              title="Plus d'infos"
                              aria-label={`Plus d'infos : ${ex.name}`}
                              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-blue-50 hover:text-blue-500 transition-all"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {profile && (
                            <button
                              onClick={() => {
                                void handleReplace(block.block_name, ex.name);
                              }}
                              disabled={isReplacing}
                              title="Remplacer cet exercice"
                              aria-label={`Remplacer l'exercice ${ex.name}`}
                              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-violet-100 hover:text-violet-600 transition-all disabled:opacity-40"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isReplacing ? "animate-spin text-violet-500" : ""}`}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                      <dl className="flex flex-wrap gap-2 text-sm">
                        {exerciseMetrics(ex, { holds }).map((metric) => (
                          <div key={metric.label} className="rounded-lg bg-gray-100 px-2.5 py-1">
                            <dt className="inline text-gray-500">{metric.label} : </dt>
                            <dd className="inline font-semibold">{metric.value}</dd>
                          </div>
                        ))}
                      </dl>
                      <ExerciseGuide name={ex.name} notes={ex.notes} />
                      {isReplaced && (
                        <p className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Exercice remplacé
                        </p>
                      )}
                    </div>
                  );
                })}
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
                {session.cooldown.map((c) => {
                  let display = "";
                  if (c.duration_sec) display = formatSeconds(c.duration_sec);
                  else if (c.reps) display = `${c.reps} reps`;
                  return (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-400">{display}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        <div>
          <h2 className="font-black mb-3">Comment s'est passée la séance ?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ton ressenti aide à ajuster l'intensité des prochaines séances.
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
                aria-pressed={session.feedback === value}
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
              Ressenti enregistré pour adapter ta prochaine séance.
            </p>
          )}
        </div>
      </div>

      {infoModal && (
        <Modal open title={infoModal.name} onClose={() => setInfoModal(null)}>
          <div className="space-y-3 text-sm">
            {hasMeasure(infoModal.load_kg) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Charge
                </p>
                <p className="text-gray-700">{formatLoadValue(infoModal.load_kg, "")}</p>
              </div>
            )}
            {infoModal.notes && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Conseils
                </p>
                <p className="text-gray-700 leading-relaxed">{infoModal.notes}</p>
              </div>
            )}
            {infoModal.alternative && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Alternative
                </p>
                <p className="text-gray-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  {infoModal.alternative}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DailySession() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");

  const profile = state.profile as UserProfile | null;

  // ── Detail view ──
  if (uid) {
    const session = state.sessions.find((s) => s.uid === uid);
    if (!session)
      return (
        <SessionList
          sessions={state.sessions}
          profile={profile}
          onCreate={() => navigate("/builder")}
        />
      );
    return <SessionDetail session={session} profile={profile} />;
  }

  return (
    <SessionList
      sessions={state.sessions}
      profile={profile}
      onCreate={() => (profile?.objective ? navigate("/builder") : navigate("/onboarding"))}
    />
  );
}
