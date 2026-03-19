import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserPlus,
  Dumbbell,
  Clock,
  Flame,
  Apple,
  Droplets,
  Trash2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { exportProgramToPDF } from "../lib/pdf";
import { OBJECTIVE_LABELS } from "../lib/agents";
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
  let loadDisplay: string;
  if (!ex.load_kg) {
    loadDisplay = "—";
  } else if (/^\d/.test(ex.load_kg)) {
    loadDisplay = `${ex.load_kg} kg`;
  } else {
    loadDisplay = ex.load_kg;
  }
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4">
        <div className="font-medium text-sm">{ex.name}</div>
        {ex.notes && <div className="text-xs text-gray-400 mt-0.5">{ex.notes}</div>}
        {ex.alternative && (
          <div className="text-xs text-gray-400 mt-0.5">↳ Alternative : {ex.alternative}</div>
        )}
      </td>
      <td className="py-3 text-sm text-center font-mono">{ex.sets}</td>
      <td className="py-3 text-sm text-center font-mono">{ex.reps}</td>
      <td className="py-3 text-sm text-center font-semibold">{loadDisplay}</td>
      <td className="py-3 text-sm text-center text-gray-500">
        {ex.rest_sec ? `${ex.rest_sec}s` : "—"}
      </td>
    </tr>
  );
}

function SessionCard({ session }: Readonly<{ session: Session; weekNum: number }>) {
  const [expanded, setExpanded] = useState(false);

  let intensityColor = "text-green-600 bg-green-50";
  if (session.intensity?.toLowerCase().includes("intense")) {
    intensityColor = "text-red-500 bg-red-50";
  } else if (session.intensity?.toLowerCase().includes("modér")) {
    intensityColor = "text-yellow-600 bg-yellow-50";
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center text-sm font-black">
            {session.day?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sm">
              {session.day} · {session.type}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {session.duration_min} min
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${intensityColor}`}>
                {session.intensity}
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Warmup */}
          {session.warmup?.length > 0 && (
            <div className="mt-3 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Échauffement
              </div>
              <div className="flex flex-wrap gap-2">
                {session.warmup.map((w) => (
                  <span key={w.name} className="text-xs bg-gray-100 rounded-full px-2.5 py-1">
                    {w.name} {w.duration_sec ? `· ${w.duration_sec}s` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Blocks */}
          {session.blocks?.map((block) => (
            <div key={block.block_name} className="mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                {block.block_name}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-105">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2 pr-4 font-semibold">Exercice</th>
                      <th className="text-center py-2 font-semibold">Séries</th>
                      <th className="text-center py-2 font-semibold">Reps</th>
                      <th className="text-center py-2 font-semibold">Charge</th>
                      {/* kg est affiché inline sur la valeur, ce header reste court */}
                      <th className="text-center py-2 font-semibold">Repos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.exercises?.map((ex) => (
                      <ExerciseRow key={ex.name} ex={ex} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Cooldown */}
          {session.cooldown?.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Récupération
              </div>
              <div className="flex flex-wrap gap-2">
                {session.cooldown.map((c) => (
                  <span key={c.name} className="text-xs bg-gray-100 rounded-full px-2.5 py-1">
                    {c.name} {c.duration_sec ? `· ${c.duration_sec}s` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {session.notes && (
            <p className="mt-3 text-xs text-gray-500 italic bg-gray-50 rounded-xl p-3">
              💬 {session.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function WeekSection({ week }: Readonly<{ week: Week }>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        className="w-full flex items-center justify-between py-3 border-b-2 border-gray-200 hover:border-black transition-colors text-left mb-4"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <span className="font-black text-lg">Semaine {week.week_number}</span>
          <span className="ml-3 text-sm text-gray-500 font-medium">{week.focus}</span>
        </div>
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {open && (
        <div className="space-y-3">
          {week.sessions?.map((session) => (
            <SessionCard key={session.day} session={session} weekNum={week.week_number} />
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
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const program = state.program;

  if (!program) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-20 pb-28 sm:px-6">
          <div className="mt-6 mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Entraînement</p>
            <h1 className="text-2xl font-black">📋 Mon Programme</h1>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-sm">
              📋
            </div>
            <h2 className="text-lg font-black mb-2">Aucun programme actif</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Réponds à quelques questions — ton plan sur mesure est prêt en 2 minutes.
            </p>
            <button
              onClick={() => navigate("/onboarding")}
              className="mt-6 bg-black text-white font-bold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-transform"
            >
              Créer mon programme
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleDownload() {
    if (!program) return;
    setDownloading(true);
    try {
      await exportProgramToPDF(program);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  const { program_overview, weeks, nutrition_recommendations, general_advice, user_profile } =
    program;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-24 md:pb-16 sm:px-6">
        {/* Header */}
        <div className="mt-8 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-600 font-semibold">
              Programme généré avec succès
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Ton programme Vincere</h1>
          <p className="text-gray-500">{program_overview.summary}</p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              icon: Dumbbell,
              label: "Discipline",
              value: user_profile?.objective ? OBJECTIVE_LABELS[user_profile.objective] : "—",
            },
            { icon: Clock, label: "Durée", value: `${program_overview.duration_weeks} semaines` },
            {
              icon: Flame,
              label: "Fréquence",
              value: `${program_overview.training_days_per_week} × / semaine`,
            },
            { icon: Clock, label: "Niveau", value: user_profile?.level ?? "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="border border-gray-200 rounded-2xl p-4">
              <Icon className="w-4 h-4 text-gray-400 mb-2" />
              <div className="text-xs text-gray-400">{label}</div>
              <div className="font-bold text-sm capitalize">{value}</div>
            </div>
          ))}
        </div>

        {/* Download + CTA */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 bg-black text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? "Génération PDF…" : "Télécharger PDF"}
          </button>
          {!isSignedIn && (
            <button
              onClick={() => navigate("/sign-up")}
              className="flex items-center justify-center gap-2 border border-gray-300 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Créer un compte pour le suivi
            </button>
          )}
          {isSignedIn && (
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center justify-center gap-2 border border-gray-300 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Voir mon dashboard
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-2 border border-red-200 rounded-xl px-4 py-2 bg-red-50">
              <span className="text-sm text-red-700 font-medium">Supprimer ce programme ?</span>
              <button
                onClick={() => {
                  dispatch({ type: "CLEAR_PROGRAM" });
                  navigate("/dashboard");
                }}
                className="text-sm font-bold text-red-600 hover:text-red-800 transition-colors"
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 border border-gray-200 text-gray-400 font-medium px-4 py-3 rounded-xl hover:border-red-200 hover:text-red-500 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer le programme
            </button>
          )}
        </div>

        {/* Profile recap */}
        {user_profile && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <h2 className="font-black mb-3 text-sm uppercase tracking-widest text-gray-400">
              Profil analysé
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                user_profile.gender && { k: "Genre", v: user_profile.gender },
                user_profile.age && { k: "Âge", v: `${user_profile.age} ans` },
                user_profile.height && { k: "Taille", v: `${user_profile.height} cm` },
                user_profile.weight && { k: "Poids", v: `${user_profile.weight} kg` },
                user_profile.level && { k: "Niveau", v: user_profile.level },
                user_profile.weeklyFrequency && {
                  k: "Fréquence",
                  v: `${user_profile.weeklyFrequency} séances/sem`,
                },
              ]
                .filter(Boolean)
                .map(
                  (item) =>
                    item && (
                      <div key={item.k} className="flex justify-between sm:flex-col gap-1">
                        <span className="text-gray-400">{item.k}</span>
                        <span className="font-semibold capitalize">{item.v}</span>
                      </div>
                    ),
                )}
            </div>
          </div>
        )}

        {/* Program weeks */}
        <div className="mb-10">
          <h2 className="text-2xl font-black mb-6">Programme semaine par semaine</h2>
          {weeks?.map((week) => (
            <WeekSection key={week.week_number} week={week} />
          ))}
        </div>

        {/* Nutrition */}
        {nutrition_recommendations && (
          <div className="border border-gray-200 rounded-2xl p-6 mb-8">
            <h2 className="font-black mb-4">Recommandations nutritionnelles</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                <div className="text-xl font-black">
                  {nutrition_recommendations.daily_calories_estimate}
                </div>
                <div className="text-xs text-gray-400">kcal/jour</div>
              </div>
              <div className="text-center">
                <Apple className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <div className="text-xl font-black">
                  {nutrition_recommendations.protein_target_g}g
                </div>
                <div className="text-xs text-gray-400">protéines/jour</div>
              </div>
              <div className="text-center">
                <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <div className="text-xl font-black">
                  {nutrition_recommendations.water_intake_l}L
                </div>
                <div className="text-xs text-gray-400">eau/jour</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              {nutrition_recommendations.notes}
            </p>
          </div>
        )}

        {/* General advice */}
        {general_advice && (
          <div className="border-l-4 border-black pl-5 mb-8">
            <h2 className="font-black mb-2">Conseils du coach</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{general_advice}</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400">
          ⚠️{" "}
          {program.legal_disclaimer ??
            "Ces recommandations sont à titre informatif uniquement et ne remplacent pas l'avis d'un professionnel de santé ou d'un coach certifié."}
        </div>

        {/* Regenerate */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/onboarding")}
            className="text-sm text-gray-400 hover:text-black flex items-center gap-1.5 mx-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Générer un nouveau programme
          </button>
        </div>
      </div>
    </div>
  );
}
