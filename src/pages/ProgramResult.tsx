import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  RefreshCw,
  UserPlus,
  Flame,
  Apple,
  Droplets,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useGeneration } from "../lib/generationContext";
import { useApp } from "../lib/store";
import { OBJECTIVE_LABELS } from "../lib/agents";
import {
  programSchedule,
  programSessionLink,
  profileDifferences,
  weekSessionStates,
  type SessionStatus,
} from "../lib/program";
import { capitalize, sessionFocus } from "../lib/sessionDisplay";
import type { Week } from "../lib/types";
import Navbar from "../components/Navbar";
import Modal from "../components/ui/Modal";
import SessionCheck from "../components/ui/SessionCheck";
import { sessionIcon } from "../components/ui/sessionIcon";
import ProgramSessionScreen from "../components/session/ProgramSessionScreen";

const STATUS_BADGE: Partial<Record<SessionStatus, { label: string; className: string }>> = {
  done: { label: "Faite", className: "border-brand-line bg-brand-soft text-brand" },
  overdue: { label: "À rattraper", className: "border-warn-line bg-warn-soft text-warn" },
  today: { label: "Aujourd'hui", className: "border-brand-line bg-brand-soft text-brand" },
};

/** Sélecteur horizontal S1…S8 : semaine courante marquée, semaine choisie mise en avant. */
function WeekPicker({
  weeks,
  selected,
  current,
  onSelect,
}: Readonly<{
  weeks: Week[];
  selected: number;
  current: number | null;
  onSelect: (weekNumber: number) => void;
}>) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const container = list.current;
    const button = container?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!container || !button) return;
    container.scrollLeft = button.offsetLeft - (container.clientWidth - button.clientWidth) / 2;
  }, [selected]);
  return (
    <nav aria-label="Semaines du programme">
      <ul ref={list} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {weeks.map((week) => {
          const active = week.week_number === selected;
          const isCurrent = week.week_number === current;
          return (
            <li key={week.week_number} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                aria-label={`Semaine ${week.week_number}${isCurrent ? ", semaine en cours" : ""}`}
                onClick={() => onSelect(week.week_number)}
                className={`relative flex h-11 min-w-14 items-center justify-center rounded-xl border-2 px-3 text-sm font-bold transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-card text-ink hover:bg-card-soft"
                }`}
              >
                S{week.week_number}
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${active ? "bg-paper" : "bg-brand"}`}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function ProgramResult() {
  const { state, dispatch } = useApp();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const generating = ["running", "saving"].includes(useGeneration().state.phase);
  const [introOpen, setIntroOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "regenerate" | "delete">(null);
  const program = state.program;
  const schedule = programSchedule(program, state.programStartDate);
  const currentWeekNumber = schedule.activeWeek?.week_number ?? null;
  const selectedNumber = Number(params.get("week")) || currentWeekNumber || 1;
  const targetSession = params.get("session");

  function setCompletion(weekNumber: number, sessionId: string, completed: boolean) {
    dispatch({ type: "SET_PROGRAM_SESSION_COMPLETION", weekNumber, sessionId, completed });
  }

  if (!program) {
    return (
      <div className="theme-app-page min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 pb-28 pt-20 sm:px-6">
          <h1 className="mb-6 mt-6 text-2xl font-black">Programme</h1>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {generating ? (
              <>
                <h2 className="mb-2 text-lg font-black">Ton programme est en cours de création</h2>
                <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
                  Tu peux continuer à utiliser l'application : on te prévient dès qu'il est prêt.
                </p>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-lg font-black">Aucun programme actif</h2>
                <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
                  Réponds à quelques questions : ton plan sur mesure est prêt en 2 minutes.
                </p>
                <button
                  type="button"
                  onClick={() => void navigate("/onboarding")}
                  className="app-primary mt-6"
                >
                  Créer mon programme
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { program_overview, weeks, nutrition_recommendations, general_advice, user_profile } =
    program;
  const week = weeks.find((w) => w.week_number === selectedNumber) ?? weeks[0];
  const states = weekSessionStates(week, state.programStartDate);

  // Détail d'une séance : écran dédié plutôt qu'un accordéon dans une page interminable.
  const targeted = targetSession
    ? states.find((entry) => entry.session.session_id === targetSession)
    : undefined;
  if (week && targeted)
    return (
      <ProgramSessionScreen
        session={targeted.session}
        weekNumber={week.week_number}
        date={targeted.date}
        status={targeted.status}
        objective={user_profile?.objective}
        onToggleCompletion={(completed) =>
          setCompletion(week.week_number, targeted.session.session_id, completed)
        }
      />
    );

  const differences = profileDifferences(user_profile, state.profile);
  const done = states.filter((entry) => entry.status === "done").length;
  const summary = program_overview.summary ?? "";
  const longSummary = summary.length > 150;
  const profileDetails = [
    user_profile?.objective && {
      k: "Discipline",
      v: OBJECTIVE_LABELS[user_profile.objective],
    },
    {
      k: "Objectif",
      v:
        user_profile?.goalDetail ||
        (user_profile?.objective
          ? OBJECTIVE_LABELS[user_profile.objective]
          : state.profile?.goalDetail || "Non renseigné"),
    },
    { k: "Durée", v: `${program_overview.duration_weeks} semaines` },
    { k: "Fréquence", v: `${program_overview.training_days_per_week} séances / semaine` },
    user_profile?.level && { k: "Niveau", v: user_profile.level },
    user_profile?.gender && { k: "Genre", v: user_profile.gender },
    user_profile?.age && { k: "Âge", v: `${user_profile.age} ans` },
    user_profile?.height && { k: "Taille", v: `${user_profile.height} cm` },
    user_profile?.weight && { k: "Poids", v: `${user_profile.weight} kg` },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div className="theme-app-page min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6 md:pb-16">
        <header className="mb-5 mt-6">
          <p
            role="status"
            className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
            {(location.state as { generated?: boolean } | null)?.generated
              ? "Programme généré avec succès"
              : "Programme actif"}
          </p>
          <h1 className="text-3xl font-black">Programme</h1>
          <p
            className={`mt-2 text-sm leading-relaxed text-ink-soft ${introOpen ? "" : "line-clamp-3"}`}
          >
            {summary}
          </p>
          {longSummary && (
            <button
              type="button"
              aria-expanded={introOpen}
              onClick={() => setIntroOpen((open) => !open)}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-bold underline underline-offset-2"
            >
              {introOpen ? "Voir moins" : "Voir plus"}
            </button>
          )}
          <p className="text-xs text-ink-soft">
            {program.generated_at
              ? `Créé le ${new Date(program.generated_at).toLocaleDateString("fr-FR")}`
              : state.programStartDate
                ? `Démarré le ${new Date(state.programStartDate + "T12:00:00").toLocaleDateString("fr-FR")}`
                : "Date de création non disponible"}
          </p>
        </header>

        {differences.length > 0 && (
          <div className="mb-5 rounded-2xl border border-warn-line bg-warn-soft p-4">
            <h2 className="font-bold">Ton profil a évolué</h2>
            <p className="mt-1 text-sm">
              Différences : {differences.join(", ")}. Ce plan conserve les paramètres utilisés à sa
              création. Modifier ton profil n'y change rien : le programme reste inchangé jusqu'à sa
              régénération.
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

        <section aria-labelledby="program-sessions" className="mb-10">
          <h2 id="program-sessions" className="mb-3 text-xl font-black">
            Tes séances
          </h2>
          <WeekPicker
            weeks={weeks}
            selected={week?.week_number ?? 1}
            current={currentWeekNumber}
            onSelect={(weekNumber) => setParams({ week: String(weekNumber) })}
          />

          {week && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-black">Semaine {week.week_number}</h3>
                <p className="font-display text-sm font-bold tabular-nums">
                  {done}/{states.length}{" "}
                  <span className="font-sans font-semibold text-ink-soft">faites</span>
                </p>
              </div>
              {week.focus && <p className="mt-1 text-sm text-ink-soft">{week.focus}</p>}

              <ul className="mt-4 space-y-3">
                {states.map(({ session, date, status }) => {
                  const Icon = sessionIcon(session.type);
                  const badge = STATUS_BADGE[status];
                  const focus = sessionFocus(session);
                  return (
                    <li
                      key={session.session_id}
                      className={`relative flex items-center gap-1 rounded-2xl border p-2 pr-3 transition-colors ${
                        status === "done"
                          ? "border-brand-line bg-brand-soft"
                          : "border-line bg-card hover:bg-card-muted"
                      }`}
                    >
                      <SessionCheck
                        completed={Boolean(session.completed)}
                        day={session.day}
                        onChange={(completed) =>
                          setCompletion(week.week_number, session.session_id, completed)
                        }
                      />
                      <div className="min-w-0 flex-1 py-1">
                        <p className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {capitalize(session.day)}
                          {date &&
                            ` · ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                        </p>
                        <h4 className="font-display text-base font-black leading-snug">
                          <Link
                            to={programSessionLink(week.week_number, session.session_id)}
                            className="break-words after:absolute after:inset-0 after:rounded-2xl after:content-['']"
                          >
                            {session.type}
                            <span className="sr-only"> du {session.day}, voir le détail</span>
                          </Link>
                        </h4>
                        <p className="text-sm text-ink-soft">
                          {session.duration_min} min · {session.intensity}
                        </p>
                        {focus && <p className="truncate text-xs text-ink-soft">{focus}</p>}
                      </div>
                      {badge && (
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                      <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <details className="mb-6 rounded-2xl border border-line bg-card">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-base font-black">
            Paramètres du programme
            <ChevronDown className="h-4 w-4 text-ink-soft" aria-hidden="true" />
          </summary>
          <dl className="divide-y divide-line border-t border-line px-4">
            {profileDetails.map((item) => (
              <div key={item.k} className="flex items-center justify-between gap-4 py-3 text-sm">
                <dt className="text-ink-soft">{item.k}</dt>
                <dd className="text-right font-semibold">{item.v}</dd>
              </div>
            ))}
          </dl>
        </details>

        {nutrition_recommendations && (
          <section className="mb-6 rounded-2xl border border-line bg-card p-5">
            <h2 className="mb-4 font-black">Recommandations nutritionnelles</h2>
            <dl className="mb-4 grid grid-cols-3 gap-3 text-center">
              {[
                {
                  Icon: Flame,
                  value: String(nutrition_recommendations.daily_calories_estimate),
                  label: "kcal / jour",
                },
                {
                  Icon: Apple,
                  value: `${nutrition_recommendations.protein_target_g} g`,
                  label: "protéines / jour",
                },
                {
                  Icon: Droplets,
                  value: `${nutrition_recommendations.water_intake_l} L`,
                  label: "eau / jour",
                },
              ].map(({ Icon, value, label }) => (
                <div key={label}>
                  <Icon className="mx-auto mb-1 h-5 w-5 text-ink-soft" aria-hidden="true" />
                  <dd className="font-display text-xl font-black">{value}</dd>
                  <dt className="text-xs text-ink-soft">{label}</dt>
                </div>
              ))}
            </dl>
            <p className="rounded-xl bg-card-soft p-3 text-sm">{nutrition_recommendations.notes}</p>
          </section>
        )}

        {general_advice && (
          <section className="mb-6 border-l-4 border-brand pl-5">
            <h2 className="mb-2 font-black">Conseils du coach</h2>
            <p className="text-sm leading-relaxed text-ink-soft">{general_advice}</p>
          </section>
        )}

        <p className="mb-10 rounded-2xl bg-card-soft p-4 text-xs leading-relaxed text-ink-soft">
          Ces recommandations sont données à titre informatif et ne remplacent pas l'avis d'un
          professionnel de santé ou d'un coach certifié. Si tu as un doute ou une douleur, demande
          conseil à un professionnel avant de continuer.
        </p>

        {/* Zone secondaire : actions qui remplacent ou suppriment le programme */}
        <section aria-labelledby="program-manage" className="border-t border-line pt-6">
          <h2 id="program-manage" className="mb-3 text-sm font-bold text-ink-soft">
            Gérer le programme
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isSignedIn && (
              <button
                type="button"
                onClick={() => void navigate("/sign-up")}
                className="app-secondary"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Créer un compte pour le suivi
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirm("regenerate")}
              className="app-secondary"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Générer un nouveau programme
            </button>
            <button
              type="button"
              onClick={() => setConfirm("delete")}
              className="app-secondary text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Supprimer le programme
            </button>
          </div>
        </section>
      </main>

      <Modal
        open={confirm === "regenerate"}
        title="Remplacer ton programme ?"
        onClose={() => setConfirm(null)}
      >
        <p className="text-sm leading-relaxed">
          Un nouveau programme sera généré à partir de ton profil. Il remplacera le programme actuel
          : les séances déjà cochées ne seront plus accessibles.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="app-secondary" onClick={() => setConfirm(null)}>
            Garder mon programme
          </button>
          <button
            type="button"
            className="app-primary"
            onClick={() => void navigate("/onboarding")}
          >
            Générer un nouveau programme
          </button>
        </div>
      </Modal>
      <Modal
        open={confirm === "delete"}
        title="Supprimer ce programme ?"
        onClose={() => setConfirm(null)}
      >
        <p className="text-sm leading-relaxed">
          Ton programme et ta progression seront supprimés. Cette action est irréversible.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="app-secondary" onClick={() => setConfirm(null)}>
            Annuler
          </button>
          <button
            type="button"
            className="app-danger"
            onClick={() => {
              dispatch({ type: "CLEAR_PROGRAM" });
              void navigate("/dashboard");
            }}
          >
            Supprimer le programme
          </button>
        </div>
      </Modal>
    </div>
  );
}
