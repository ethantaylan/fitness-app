/**
 * FONCTIONNALITÉ MASQUÉE — Builder de séance libre.
 *
 * Cet écran n'est plus accessible pour le moment (la route /builder redirige vers /session, voir
 * `FREE_SESSION_BUILDER_ENABLED` dans src/lib/features.ts). Le code est conservé tel quel car la
 * fonctionnalité sera RÉACTIVÉE PLUS TARD : ne pas le supprimer.
 * Procédure et prompt de réactivation : docs/free-session-builder/README.md
 */
import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpFromLine,
  BookOpen,
  Dumbbell,
  Footprints,
  Gauge,
  HeartPulse,
  Minus,
  PersonStanding,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  UnfoldHorizontal,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "../lib/store";
import { generateCustomSession, generateDailySession } from "../lib/openai";
import { DURATION_OPTIONS } from "../lib/constants";
import { programSchedule } from "../lib/program";
import {
  ITEM_MINUTES,
  WARMUP_COOLDOWN_MIN,
  estimateMinutes,
  quickWorkoutsFor,
} from "../lib/quickWorkouts";
import type { UserProfile } from "../lib/types";
import PageHeader from "../components/ui/PageHeader";

// ── Card definitions ──────────────────────────────────────────────────────────

interface CardDef {
  id: string;
  label: string;
  icon: LucideIcon;
  markers?: { x: number; y: number }[];
  section: "muscles" | "types" | "running";
  minutesPerItem: number;
}

interface CartEntry extends CardDef {
  count: number;
}

const muscle = (id: string, label: string, markers: { x: number; y: number }[]): CardDef => ({
  id,
  label,
  icon: PersonStanding,
  markers,
  section: "muscles",
  minutesPerItem: ITEM_MINUTES[id],
});
const effort = (id: string, label: string, icon: LucideIcon): CardDef => ({
  id,
  label,
  icon,
  section: "types",
  minutesPerItem: ITEM_MINUTES[id],
});

const CARDS: CardDef[] = [
  // Zones musculaires
  muscle("abdos", "Abdos", [{ x: 50, y: 50 }]),
  muscle("pectoraux", "Pecs", [
    { x: 43, y: 38 },
    { x: 57, y: 38 },
  ]),
  muscle("dos", "Dos", [{ x: 50, y: 41 }]),
  muscle("epaules", "Épaules", [
    { x: 32, y: 31 },
    { x: 68, y: 31 },
  ]),
  muscle("biceps", "Biceps", [
    { x: 27, y: 43 },
    { x: 73, y: 43 },
  ]),
  muscle("triceps", "Triceps", [
    { x: 24, y: 50 },
    { x: 76, y: 50 },
  ]),
  muscle("jambes", "Jambes", [
    { x: 43, y: 70 },
    { x: 57, y: 70 },
  ]),
  muscle("fessiers", "Fessiers", [
    { x: 43, y: 58 },
    { x: 57, y: 58 },
  ]),
  muscle("mollets", "Mollets", [
    { x: 43, y: 83 },
    { x: 57, y: 83 },
  ]),
  muscle("lombaires", "Lombaires", [{ x: 50, y: 53 }]),
  // Types d'effort
  effort("cardio", "Cardio", HeartPulse),
  effort("hiit", "HIIT", Gauge),
  effort("gainage", "Gainage", Shield),
  effort("plyo", "Plyométrie", ArrowUpFromLine),
  effort("etirements", "Étirements", UnfoldHorizontal),
  effort("mobilite", "Mobilité", RotateCcw),
];

const RUNNING_CARDS: CardDef[] = (
  [
    effort("endurance", "Endurance", Footprints),
    effort("fractionne", "Fractionné", Footprints),
    effort("cotes", "Côtes", Footprints),
    effort("technique", "Technique de course", Footprints),
    effort("renfo-running", "Renforcement coureur", Footprints),
    effort("recuperation-running", "Course récupération", Footprints),
  ] as CardDef[]
).map((card) => ({ ...card, section: "running" as const }));
const CARD_MAP = Object.fromEntries([...CARDS, ...RUNNING_CARDS].map((c) => [c.id, c]));

const PRESET_ICONS: Record<string, LucideIcon> = {
  "corps-entier": Dumbbell,
  poussee: ArrowUpFromLine,
  tirage: Dumbbell,
  jambes: Footprints,
  "cardio-abdos": HeartPulse,
  recuperation: RefreshCw,
  "etirements-express": UnfoldHorizontal,
  "endurance-technique": Footprints,
  "fractionne-renfo": HeartPulse,
  "recuperation-running": RefreshCw,
};

function CardIcon({ card, compact = false }: Readonly<{ card: CardDef; compact?: boolean }>) {
  const Icon = card.icon;
  const size = compact ? "h-4 w-4" : "h-8 w-8";

  if (!card.markers) return <Icon className={size} strokeWidth={1.8} aria-hidden="true" />;

  return (
    <span className={`relative inline-flex ${compact ? "h-5 w-5" : "h-9 w-9"}`} aria-hidden="true">
      <Icon className="h-full w-full" strokeWidth={1.45} />
      {card.markers.map((marker) => (
        <span
          key={`${marker.x}-${marker.y}`}
          className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-card/80"
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
        />
      ))}
    </span>
  );
}

// ── WorkoutCard ───────────────────────────────────────────────────────────────

function WorkoutCard({
  card,
  count,
  isJustAdded,
  onAdd,
}: Readonly<{ card: CardDef; count: number; isJustAdded: boolean; onAdd: () => void }>) {
  const isActive = count > 0;
  return (
    <button
      type="button"
      onClick={onAdd}
      data-active={isActive}
      aria-label={`Ajouter une activité : ${card.label}, ${card.minutesPerItem} minutes${isActive ? `, ${count} déjà ajoutée${count > 1 ? "s" : ""}` : ""}`}
      style={{ touchAction: "manipulation" }}
      className={`relative flex min-h-24 select-none flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2 transition-all duration-150 ${
        isActive
          ? "border-brand bg-brand-soft text-ink"
          : "border-line bg-card text-ink hover:border-line-strong"
      } ${isJustAdded ? "scale-90" : "scale-100 active:scale-90"}`}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-black text-brand-fg shadow-md"
        >
          {count}
        </span>
      )}
      <span className={isActive ? "text-brand" : "text-ink-soft"} aria-hidden="true">
        <CardIcon card={card} />
      </span>
      <span
        className="text-center text-[11px] font-bold leading-tight break-words"
        aria-hidden="true"
      >
        {card.label}
      </span>
      <span className="text-[11px] font-semibold text-ink-soft" aria-hidden="true">
        +{card.minutesPerItem} min
      </span>
    </button>
  );
}

// ── Dock : toujours au-dessus de la navigation, jamais sous elle ──────────────

function Dock({
  entries,
  totalItems,
  estimatedDuration,
  duration,
  generating,
  error,
  onAdjust,
  onGenerate,
  onCompose,
  onClear,
}: Readonly<{
  entries: CartEntry[];
  totalItems: number;
  estimatedDuration: number;
  duration: number;
  generating: boolean;
  error: string;
  onAdjust: (id: string, delta: number) => void;
  onGenerate: () => void;
  onCompose: () => void;
  onClear: () => void;
}>) {
  const MAX_DISPLAY = 90;
  const pct = Math.min((estimatedDuration / MAX_DISPLAY) * 100, 100);
  const barColor = estimatedDuration >= 70 ? "bg-warn" : "bg-brand";

  return (
    <div className="app-dock fixed inset-x-0 z-55">
      <div className="mx-auto max-w-2xl">
        {totalItems === 0 ? (
          <div className="mx-3 rounded-2xl border border-line bg-card p-3 shadow-[0_8px_30px_rgba(2,6,23,0.18)] md:mx-0">
            {error && (
              <p role="alert" className="mb-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={onCompose}
              disabled={generating}
              className="app-primary w-full"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Vincere compose ta séance…
                </>
              ) : (
                <>
                  <WandSparkles className="h-4 w-4" aria-hidden="true" />
                  Composer avec Vincere · {duration} min
                </>
              )}
            </button>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-t-3xl border border-b-0 border-line bg-card"
            style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.14), 0 -1px 0 rgba(0,0,0,0.05)" }}
          >
            <div className="px-5 pb-2 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black">
                  {totalItems} activité{totalItems > 1 ? "s" : ""} sélectionnée
                  {totalItems > 1 ? "s" : ""}
                </span>
                <span className="font-display text-sm font-black tabular-nums">
                  ~{estimatedDuration} min
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card-soft">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div
                className="mt-1 flex justify-between px-0.5 text-[11px] font-semibold text-ink-soft"
                aria-hidden="true"
              >
                <span>0</span>
                <span>30</span>
                <span>45</span>
                <span>60</span>
                <span>90 min</span>
              </div>
            </div>

            <ul className="flex max-h-28 flex-wrap gap-2 overflow-y-auto px-4 pb-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center rounded-full border border-brand-line bg-brand-soft pl-3"
                >
                  <span className="text-brand" aria-hidden="true">
                    <CardIcon card={entry} compact />
                  </span>
                  <span className="ml-1.5 text-xs font-bold">{entry.label}</span>
                  <button
                    type="button"
                    aria-label={`Retirer une activité : ${entry.label}`}
                    onClick={() => onAdjust(entry.id, -1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/10"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="w-4 text-center text-xs font-black tabular-nums">
                    {entry.count}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ajouter une activité : ${entry.label}`}
                    onClick={() => onAdjust(entry.id, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/10"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            {error && (
              <p role="alert" className="px-5 pb-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-2 px-4 pb-4 pt-1">
              <button
                type="button"
                onClick={onClear}
                className="app-icon-button"
                aria-label="Vider le panier"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="app-primary flex-1"
              >
                {generating ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    />
                    <span>Génération en cours…</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" aria-hidden="true" />
                    Créer ma séance libre
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WorkoutBuilder() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = state.profile as UserProfile | null;

  const [cart, setCart] = useState<Record<string, number>>(() => {
    const preset = (location.state as { cart?: Record<string, number> } | null)?.cart;
    if (!preset) return {};
    return Object.fromEntries(
      Object.entries(preset).filter(([id, count]) => CARD_MAP[id] && count > 0),
    );
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [aiDuration, setAiDuration] = useState(profile?.sessionDuration?.[0] ?? 45);

  const totalItems = useMemo(() => Object.values(cart).reduce((sum, n) => sum + n, 0), [cart]);
  const estimatedDuration = useMemo(() => estimateMinutes(cart), [cart]);

  const cartEntries = useMemo<CartEntry[]>(
    () =>
      Object.entries(cart)
        .filter(([, count]) => count > 0)
        .map(([id, count]) => ({ ...CARD_MAP[id], count })),
    [cart],
  );

  const schedule = programSchedule(state.program, state.programStartDate);
  const activeWeek = schedule.activeWeek;
  const nextProgramSession = schedule.next?.session ?? null;
  const completedProgramSessions =
    activeWeek?.sessions.filter((session) => session.completed) ?? [];

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setLastAdded(id);
    setTimeout(() => setLastAdded(null), 200);
  }

  function adjust(id: string, delta: number) {
    setCart((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      }
      return { ...prev, [id]: next };
    });
  }

  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  async function handleGenerate() {
    if (!profile || totalItems === 0) return;
    setGenerating(true);
    setError("");
    try {
      const selections = cartEntries.map((c) => ({
        id: c.id,
        label: c.label,
        count: c.count,
        minutesPerItem: c.minutesPerItem,
      }));
      const session = await generateCustomSession(profile, selections, estimatedDuration);
      const uid = crypto.randomUUID();
      dispatch({ type: "ADD_SESSION", session: { ...session, uid, date: todayDate } });
      void navigate(`/session?uid=${uid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleVincereGenerate() {
    if (!profile) return;
    setGenerating(true);
    setError("");
    try {
      const programContext = state.program
        ? [
            `Semaine actuelle : ${activeWeek?.week_number ?? "non déterminée"}.`,
            `Séances déjà réalisées cette semaine : ${completedProgramSessions.map((session) => `${session.day} ${session.type}`).join(", ") || "aucune"}.`,
            `Prochaine séance planifiée : ${nextProgramSession ? `${nextProgramSession.day} ${nextProgramSession.type}` : "aucune"}.`,
          ].join("\n")
        : undefined;
      const profileForSession: UserProfile = { ...profile, sessionDuration: [aiDuration] };
      const lastFeedback = state.sessions.find((session) => session.feedback)?.feedback;
      const session = await generateDailySession(profileForSession, lastFeedback, programContext);
      const uid = crypto.randomUUID();
      dispatch({ type: "ADD_SESSION", session: { ...session, uid, date: todayDate } });
      void navigate(`/session?uid=${uid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  }

  if (!profile) {
    return (
      <div className="theme-app-page min-h-screen">
        <PageHeader
          title="Nouvelle séance libre"
          backLabel="Retour aux séances"
          fallbackPath="/session"
        />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="text-center">
            <p className="mb-4 text-ink-soft">Complète ton profil pour construire une séance.</p>
            <button type="button" onClick={() => navigate("/onboarding")} className="app-primary">
              Compléter le profil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Le choix est totalement libre : toutes les activités sont proposées à tout le monde, quelle que
  // soit la discipline du profil (un profil yoga peut travailler les pectoraux, etc.).
  const presets = quickWorkoutsFor();
  const muscleCards = CARDS.filter((c) => c.section === "muscles");
  const typeCards = CARDS.filter((c) => c.section === "types");
  const runningCards = RUNNING_CARDS;

  return (
    <div className="theme-app-page min-h-screen">
      <PageHeader
        title="Nouvelle séance libre"
        backLabel="Retour aux séances"
        fallbackPath="/session"
      />

      <div>
        <main
          className="mx-auto max-w-4xl px-4 pt-5 sm:px-6"
          style={{ paddingBottom: totalItems > 0 ? "26rem" : "14rem" }}
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            Laisse Vincere s’adapter à ton programme ou sélectionne précisément ce que tu veux
            travailler.
          </p>

          <section className="mt-5 rounded-2xl border border-brand-line bg-brand-soft p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg"
                aria-hidden="true"
              >
                <WandSparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black">Laisser Vincere composer</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {state.program
                    ? `Vincere tient compte de ta semaine${nextProgramSession ? ` et évite de répéter ta prochaine séance ${nextProgramSession.type}` : ""}.`
                    : "Vincere utilise ton objectif, ton niveau, ton matériel et tes derniers retours."}
                </p>
                {state.program && activeWeek && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-card/70 px-3 py-2 text-xs font-semibold">
                    <BookOpen className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    Programme actif · semaine {activeWeek.week_number} ·{" "}
                    {completedProgramSessions.length}/{activeWeek.sessions.length} séances réalisées
                  </p>
                )}
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-semibold">Durée souhaitée</legend>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setAiDuration(duration)}
                    aria-pressed={aiDuration === duration}
                    className={`min-h-11 rounded-xl border-2 text-sm font-bold transition-colors ${
                      aiDuration === duration
                        ? "border-brand bg-brand text-brand-fg"
                        : "border-line-strong bg-card text-ink hover:bg-card-soft"
                    }`}
                  >
                    {duration} min
                  </button>
                ))}
              </div>
            </fieldset>

            {totalItems > 0 && (
              <button
                type="button"
                onClick={() => void handleVincereGenerate()}
                disabled={generating}
                className="app-secondary mt-3 w-full"
              >
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
                Composer avec Vincere
              </button>
            )}
          </section>

          <div className="mt-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <h2 className="text-sm font-bold text-ink-soft">Ou compose toi-même</h2>
            <div className="h-px flex-1 bg-line" />
          </div>

          {/* Suggestions rapides */}
          <section className="pb-1 pt-5" aria-labelledby="builder-presets">
            <h3 id="builder-presets" className="mb-3 text-sm font-bold">
              Suggestions rapides
            </h3>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
              {presets.map((preset) => {
                const PresetIcon = PRESET_ICONS[preset.id] ?? Dumbbell;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCart(preset.cart)}
                    className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-card px-4 text-sm font-bold transition-colors hover:bg-card-soft active:scale-95"
                  >
                    <PresetIcon className="h-4 w-4" aria-hidden="true" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </section>

          <p className="mt-5 text-sm text-ink-soft">
            Un appui ajoute une activité. {WARMUP_COOLDOWN_MIN} min d’échauffement et de retour au
            calme sont incluses.
          </p>

          {muscleCards.length > 0 && (
            <section className="mb-8 mt-5" aria-labelledby="builder-muscles">
              <h3 id="builder-muscles" className="mb-3 text-sm font-bold">
                Zones musculaires
              </h3>
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
                {muscleCards.map((card) => (
                  <WorkoutCard
                    key={card.id}
                    card={card}
                    count={cart[card.id] ?? 0}
                    isJustAdded={lastAdded === card.id}
                    onAdd={() => addToCart(card.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mb-8" aria-labelledby="builder-types">
            <h3 id="builder-types" className="mb-3 text-sm font-bold">
              Types d’effort
            </h3>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
              {typeCards.map((card) => (
                <WorkoutCard
                  key={card.id}
                  card={card}
                  count={cart[card.id] ?? 0}
                  isJustAdded={lastAdded === card.id}
                  onAdd={() => addToCart(card.id)}
                />
              ))}
            </div>
          </section>

          <section className="mb-8" aria-labelledby="builder-running">
            <h3 id="builder-running" className="mb-3 text-sm font-bold">
              Course à pied
            </h3>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
              {runningCards.map((card) => (
                <WorkoutCard
                  key={card.id}
                  card={card}
                  count={cart[card.id] ?? 0}
                  isJustAdded={lastAdded === card.id}
                  onAdd={() => addToCart(card.id)}
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      <Dock
        entries={cartEntries}
        totalItems={totalItems}
        estimatedDuration={estimatedDuration}
        duration={aiDuration}
        generating={generating}
        error={error}
        onAdjust={adjust}
        onGenerate={() => {
          void handleGenerate();
        }}
        onCompose={() => {
          void handleVincereGenerate();
        }}
        onClear={() => setCart({})}
      />
    </div>
  );
}
