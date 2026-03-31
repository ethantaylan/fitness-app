import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Hammer,
  RefreshCw,
  Share2,
  Check,
  Info,
  X,
  Trash2,
} from "lucide-react";
import { useApp } from "../lib/store";
import Navbar from "../components/Navbar";
import { generateDailySession, replaceExercise } from "../lib/openai";
import { FEEDBACK_META } from "../lib/constants";
import { formatLoadValue } from "../lib/formatLoad";
import type { DailySession, UserProfile, ObjectiveType } from "../lib/types";
import SessionPickerSheet from "../components/SessionPickerSheet";

// ── Helpers ───────────────────────────────────────────────────────────────────

function intensityClasses(intensity: string) {
  const i = intensity?.toLowerCase() ?? "";
  if (i.includes("intense")) return { badge: "bg-red-100 text-red-700" };
  if (i.includes("modér")) return { badge: "bg-yellow-100 text-yellow-700" };
  return { badge: "bg-green-100 text-green-700" };
}

// ── Session List ──────────────────────────────────────────────────────────────

function SessionList({
  sessions,
  profile,
  generating,
  generateError,
  onGenerate,
  onBuildOwn,
}: Readonly<{
  sessions: DailySession[];
  profile: UserProfile | null;
  generating: boolean;
  generateError: string;
  onGenerate: () => void;
  onBuildOwn: () => void;
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
      setTimeout(() => setPendingDelete((p) => (p === uid ? null : p)), 3000);
    }
  }

  const grouped = sessions.reduce<Record<string, DailySession[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-28 sm:px-6">
        {/* Header */}
        <div className="mt-6 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mes séances</p>
          <h1 className="text-2xl font-black">Séances</h1>
          {sessions.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {sessions.length} séance{sessions.length > 1 ? "s" : ""} générée
              {sessions.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* ── Action cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-7">
          {/* Générer IA */}
          <button
            onClick={onGenerate}
            disabled={generating || !profile}
            className="theme-session-generate-card relative flex flex-col items-start gap-3 bg-black text-white rounded-2xl p-4 hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 120% 120% at 100% 0%, rgba(99,102,241,0.35) 0%, transparent 60%)",
              }}
            />
            <div className="theme-session-generate-icon relative w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              {generating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="relative">
              <p className="font-black text-sm leading-tight">
                {generating ? "Génération…" : "Générer une séance"}
              </p>
              <p className="theme-session-generate-subtitle text-[11px] text-white/50 mt-0.5">
                L'IA adapte à ton profil
              </p>
            </div>
          </button>

          {/* Builder */}
          <button
            onClick={onBuildOwn}
            className="theme-session-builder-card flex flex-col items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="theme-session-builder-icon w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <Hammer className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <p className="font-black text-sm text-gray-900 leading-tight">Construire ma séance</p>
              <p className="theme-session-builder-subtitle text-[11px] text-gray-400 mt-0.5">
                Choisis tes zones
              </p>
            </div>
          </button>
        </div>

        {/* Error */}
        {generateError && (
          <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs text-red-600 font-medium">{generateError}</p>
          </div>
        )}

        {/* ── Session list ── */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Dumbbell className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-bold text-gray-700 mb-1">Aucune séance générée</p>
            <p className="text-sm text-gray-400">Lance ta première séance ci-dessus.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Historique
              </p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-6">
              {Object.keys(grouped).map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {grouped[date].map((s) => {
                      const ic = intensityClasses(s.intensity);
                      const fb = s.feedback ? FEEDBACK_META[s.feedback] : null;
                      const isConfirming = pendingDelete === s.uid;
                      return (
                        <div
                          key={s.uid}
                          className="w-full bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => void navigate(`/session?uid=${s.uid}`)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span
                                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ic.badge}`}
                                >
                                  {s.intensity}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {s.duration_min} min
                                </span>
                              </div>
                              <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {s.goal}
                              </p>
                              {s.blocks?.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1 truncate">
                                  {s.blocks.map((b) => b.block_name).join(" · ")}
                                </p>
                              )}
                            </button>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <button
                                onClick={() => handleDeleteClick(s.uid)}
                                title={isConfirming ? "Confirmer la suppression" : "Supprimer"}
                                className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-all ${
                                  isConfirming
                                    ? "bg-red-500 text-white"
                                    : "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400"
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                                {isConfirming && "Confirmer ?"}
                              </button>
                              {fb ? (
                                <span
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${fb.bg} ${fb.color}`}
                                >
                                  {fb.emoji} {fb.label}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 font-medium">
                                  Sans feedback
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
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

  function giveFeedback(feedback: "good" | "normal" | "hard") {
    dispatch({ type: "UPDATE_SESSION_FEEDBACK", uid: session.uid, feedback });
  }

  async function handleReplace(blockName: string, exerciseName: string) {
    if (!profile) return;
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
    } finally {
      setReplacing((prev) => ({ ...prev, [key]: false }));
    }
  }

  function handleShare() {
    const encoded = btoa(encodeURIComponent(JSON.stringify(session)));
    const url = `${window.location.origin}/s?d=${encoded}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const ic = intensityClasses(session.intensity);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-24 md:pb-16 sm:px-6">
        <div className="mt-6 mb-6 flex justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                dispatch({ type: "DELETE_SESSION", uid: session.uid });
                void navigate("/session");
              }}
              title="Supprimer cette séance"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
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
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Séance du jour</p>
          <h1 className="text-2xl sm:text-3xl font-black capitalize">{session.date}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ic.badge}`}>
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
                {session.warmup.map((w) => {
                  let display = "";
                  if (w.duration_sec) display = `${w.duration_sec}s`;
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
                          {ex.load_kg && (
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
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-blue-50 hover:text-blue-500 transition-all"
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
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-violet-100 hover:text-violet-600 transition-all disabled:opacity-40"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isReplacing ? "animate-spin text-violet-500" : ""}`}
                              />
                            </button>
                          )}
                        </div>
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
                      {isReplaced && (
                        <p className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Exercice remplacé par l'IA
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
                  if (c.duration_sec) display = `${c.duration_sec}s`;
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

        {/* Motivation */}
        {session.motivation_message && (
          <div className="bg-black text-white rounded-2xl p-5 mb-6">
            <div className="text-lg mb-2">💬</div>
            <p className="font-semibold text-sm leading-relaxed">{session.motivation_message}</p>
            <p className="text-xs text-white/40 mt-2">- Ton coach IA</p>
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

      {/* Modal infos exercice */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="font-black text-lg leading-tight">{infoModal.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Détails de l'exercice</p>
              </div>
              <button
                onClick={() => setInfoModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {infoModal.load_kg && (
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
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DailySession() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");

  const [showPicker, setShowPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const profile = state.profile as UserProfile | null;
  const lastFeedback = state.sessions.find((s) => s.feedback)?.feedback;

  // ── Detail view ──
  if (uid) {
    const session = state.sessions.find((s) => s.uid === uid);
    if (!session)
      return (
        <SessionList
          sessions={state.sessions}
          profile={profile}
          generating={generating}
          generateError={generateError}
          onGenerate={() => setShowPicker(true)}
          onBuildOwn={() => navigate("/builder")}
        />
      );
    return <SessionDetail session={session} profile={profile} />;
  }

  // ── Generation handler ──
  async function handleConfirm(objective: ObjectiveType, duration: number) {
    setShowPicker(false);
    setGenerating(true);
    setGenerateError("");
    try {
      const profileForSession: UserProfile = {
        ...(profile as UserProfile),
        objective,
        sessionDuration: [duration],
      };
      const session = await generateDailySession(profileForSession, lastFeedback);
      const newUid = crypto.randomUUID();
      dispatch({ type: "ADD_SESSION", session: { ...session, uid: newUid, date: todayDate } });
      void navigate(`/session?uid=${newUid}`);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {showPicker && profile && (
        <SessionPickerSheet
          profile={profile}
          onConfirm={(obj, dur) => {
            void handleConfirm(obj, dur);
          }}
          onClose={() => setShowPicker(false)}
          onBuildOwn={() => {
            setShowPicker(false);
            void navigate("/builder");
          }}
        />
      )}
      <SessionList
        sessions={state.sessions}
        profile={profile}
        generating={generating}
        generateError={generateError}
        onGenerate={() => {
          if (!profile?.objective) {
            void navigate("/onboarding");
            return;
          }
          setShowPicker(true);
        }}
        onBuildOwn={() => navigate("/builder")}
      />
    </>
  );
}
