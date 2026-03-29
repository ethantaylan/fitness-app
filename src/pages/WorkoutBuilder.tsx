import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Minus, Plus, Trash2, Bot } from "lucide-react";
import { useApp } from "../lib/store";
import { generateCustomSession } from "../lib/openai";
import type { UserProfile } from "../lib/types";

// ── Card definitions ──────────────────────────────────────────────────────────

interface CardColors {
  text: string;
  activeBg: string;
  activeBorder: string;
  dot: string;
}

interface CardDef {
  id: string;
  label: string;
  emoji: string;
  section: "muscles" | "types";
  minutesPerItem: number;
  colors: CardColors;
}

interface CartEntry extends CardDef {
  count: number;
}

const CARDS: CardDef[] = [
  // Zones musculaires
  {
    id: "abdos",
    label: "Abdos",
    emoji: "💪",
    section: "muscles",
    minutesPerItem: 7,
    colors: {
      text: "text-violet-700",
      activeBg: "bg-violet-50",
      activeBorder: "border-violet-300",
      dot: "bg-violet-400",
    },
  },
  {
    id: "pectoraux",
    label: "Pecs",
    emoji: "🏋️",
    section: "muscles",
    minutesPerItem: 9,
    colors: {
      text: "text-blue-700",
      activeBg: "bg-blue-50",
      activeBorder: "border-blue-300",
      dot: "bg-blue-400",
    },
  },
  {
    id: "dos",
    label: "Dos",
    emoji: "🦾",
    section: "muscles",
    minutesPerItem: 9,
    colors: {
      text: "text-indigo-700",
      activeBg: "bg-indigo-50",
      activeBorder: "border-indigo-300",
      dot: "bg-indigo-400",
    },
  },
  {
    id: "epaules",
    label: "Épaules",
    emoji: "⭐",
    section: "muscles",
    minutesPerItem: 8,
    colors: {
      text: "text-sky-700",
      activeBg: "bg-sky-50",
      activeBorder: "border-sky-300",
      dot: "bg-sky-400",
    },
  },
  {
    id: "biceps",
    label: "Biceps",
    emoji: "🦾",
    section: "muscles",
    minutesPerItem: 7,
    colors: {
      text: "text-purple-700",
      activeBg: "bg-purple-50",
      activeBorder: "border-purple-300",
      dot: "bg-purple-400",
    },
  },
  {
    id: "triceps",
    label: "Triceps",
    emoji: "💥",
    section: "muscles",
    minutesPerItem: 7,
    colors: {
      text: "text-fuchsia-700",
      activeBg: "bg-fuchsia-50",
      activeBorder: "border-fuchsia-300",
      dot: "bg-fuchsia-400",
    },
  },
  {
    id: "jambes",
    label: "Jambes",
    emoji: "🦵",
    section: "muscles",
    minutesPerItem: 10,
    colors: {
      text: "text-rose-700",
      activeBg: "bg-rose-50",
      activeBorder: "border-rose-300",
      dot: "bg-rose-400",
    },
  },
  {
    id: "fessiers",
    label: "Fessiers",
    emoji: "🍑",
    section: "muscles",
    minutesPerItem: 8,
    colors: {
      text: "text-pink-700",
      activeBg: "bg-pink-50",
      activeBorder: "border-pink-300",
      dot: "bg-pink-400",
    },
  },
  {
    id: "mollets",
    label: "Mollets",
    emoji: "🦶",
    section: "muscles",
    minutesPerItem: 5,
    colors: {
      text: "text-orange-700",
      activeBg: "bg-orange-50",
      activeBorder: "border-orange-300",
      dot: "bg-orange-400",
    },
  },
  {
    id: "lombaires",
    label: "Lombaires",
    emoji: "🔴",
    section: "muscles",
    minutesPerItem: 6,
    colors: {
      text: "text-amber-700",
      activeBg: "bg-amber-50",
      activeBorder: "border-amber-300",
      dot: "bg-amber-400",
    },
  },
  // Types d'effort
  {
    id: "cardio",
    label: "Cardio",
    emoji: "❤️",
    section: "types",
    minutesPerItem: 10,
    colors: {
      text: "text-red-700",
      activeBg: "bg-red-50",
      activeBorder: "border-red-300",
      dot: "bg-red-400",
    },
  },
  {
    id: "hiit",
    label: "HIIT",
    emoji: "⚡",
    section: "types",
    minutesPerItem: 10,
    colors: {
      text: "text-yellow-700",
      activeBg: "bg-yellow-50",
      activeBorder: "border-yellow-300",
      dot: "bg-yellow-400",
    },
  },
  {
    id: "gainage",
    label: "Gainage",
    emoji: "🧱",
    section: "types",
    minutesPerItem: 8,
    colors: {
      text: "text-stone-700",
      activeBg: "bg-stone-50",
      activeBorder: "border-stone-300",
      dot: "bg-stone-400",
    },
  },
  {
    id: "plyo",
    label: "Plyométrie",
    emoji: "🦘",
    section: "types",
    minutesPerItem: 8,
    colors: {
      text: "text-lime-700",
      activeBg: "bg-lime-50",
      activeBorder: "border-lime-300",
      dot: "bg-lime-400",
    },
  },
  {
    id: "etirements",
    label: "Étirements",
    emoji: "🧘",
    section: "types",
    minutesPerItem: 6,
    colors: {
      text: "text-emerald-700",
      activeBg: "bg-emerald-50",
      activeBorder: "border-emerald-300",
      dot: "bg-emerald-400",
    },
  },
  {
    id: "mobilite",
    label: "Mobilité",
    emoji: "🔄",
    section: "types",
    minutesPerItem: 6,
    colors: {
      text: "text-teal-700",
      activeBg: "bg-teal-50",
      activeBorder: "border-teal-300",
      dot: "bg-teal-400",
    },
  },
];

const CARD_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const WARMUP_COOLDOWN_MIN = 10;

// ── Advisory rules ───────────────────────────────────────────────────────────

interface Advisory {
  level: "warning" | "tip" | "good";
  icon: string;
  message: string;
}

function computeAdvisories(cart: Record<string, number>): Advisory[] {
  const get = (id: string) => cart[id] ?? 0;
  const advisories: Advisory[] = [];

  // Trop de triceps isolés
  if (get("triceps") > 2)
    advisories.push({
      level: "warning",
      icon: "⚠️",
      message: `${get("triceps")} exercices de triceps — 2 en isolation max, les pecs et épaules les sollicitent déjà.`,
    });

  // Trop de biceps isolés
  if (get("biceps") > 2)
    advisories.push({
      level: "warning",
      icon: "⚠️",
      message: `${get("biceps")} exercices de biceps — le dos les sollicite déjà, 1-2 en addition suffisent.`,
    });

  // Dos + jambes dans la même séance
  if (get("dos") > 0 && get("jambes") > 0)
    advisories.push({
      level: "warning",
      icon: "⚠️",
      message:
        "Dos + jambes = deux gros groupes polyarticulaires. Mieux vaut les séparer en deux séances distinctes.",
    });

  // Trop de groupes musculaires
  const muscleIds = [
    "abdos",
    "pectoraux",
    "dos",
    "epaules",
    "biceps",
    "triceps",
    "jambes",
    "fessiers",
    "mollets",
    "lombaires",
  ];
  const muscleCount = muscleIds.filter((m) => get(m) > 0).length;
  if (muscleCount >= 5)
    advisories.push({
      level: "warning",
      icon: "⚠️",
      message: `${muscleCount} groupes en une séance → intensité diluée. Concentre-toi sur 3-4 max pour vraiment progresser.`,
    });

  // Pecs sans dos
  if (get("pectoraux") >= 2 && get("dos") === 0)
    advisories.push({
      level: "tip",
      icon: "💡",
      message:
        "Pecs sans dos → déséquilibre postural sur le long terme. Quelques exercices de dos équilibrent les épaules.",
    });

  // Cardio avant musculation
  if (get("cardio") > 0 && (get("jambes") > 0 || get("pectoraux") > 0 || get("dos") > 0))
    advisories.push({
      level: "tip",
      icon: "💡",
      message:
        "Force + cardio dans la même séance : fais toujours le cardio EN DERNIER pour ne pas impacter tes perfs.",
    });

  // HIIT + jambes lourdes
  if (get("hiit") > 0 && get("jambes") >= 2)
    advisories.push({
      level: "tip",
      icon: "💡",
      message:
        "HIIT + jambes lourdes : tes quadriceps vont souffrir. Réduis le volume jambes ou place le HIIT en finisher.",
    });

  // Bon combo Push Day
  if (get("pectoraux") > 0 && get("epaules") > 0 && get("triceps") > 0)
    advisories.push({
      level: "good",
      icon: "✅",
      message: "Push Day parfait — Pecs + Épaules + Triceps partagent les synergies, combo idéal.",
    });

  // Bon combo Pull Day
  if (get("dos") > 0 && get("biceps") > 0 && get("pectoraux") === 0 && get("jambes") === 0)
    advisories.push({
      level: "good",
      icon: "✅",
      message: "Pull Day classique — Dos + Biceps, les tirages recrutent naturellement les biceps.",
    });

  // Bon combo Lower Body
  if (get("jambes") > 0 && get("fessiers") > 0 && get("dos") === 0 && get("pectoraux") === 0)
    advisories.push({
      level: "good",
      icon: "✅",
      message:
        "Lower Body complet — Jambes + Fessiers, la plupart des exercices composés couvrent les deux.",
    });

  // Priorité warnings > tips > good, max 3 affichés
  return [
    ...advisories.filter((a) => a.level === "warning"),
    ...advisories.filter((a) => a.level === "tip"),
    ...advisories.filter((a) => a.level === "good"),
  ].slice(0, 3);
}

// ── Preset suggestions ────────────────────────────────────────────────────────

const PRESETS: { label: string; emoji: string; cart: Record<string, number> }[] = [
  { label: "Full Body", emoji: "💥", cart: { pectoraux: 1, dos: 1, jambes: 1, abdos: 1 } },
  { label: "Push Day", emoji: "🏋️", cart: { pectoraux: 2, epaules: 1, triceps: 1 } },
  { label: "Pull Day", emoji: "🦾", cart: { dos: 2, biceps: 1, epaules: 1 } },
  { label: "Jambes", emoji: "🦵", cart: { jambes: 2, fessiers: 1, mollets: 1 } },
  { label: "Cardio + Abs", emoji: "❤️", cart: { cardio: 1, hiit: 1, abdos: 2 } },
  { label: "Récupération", emoji: "🧘", cart: { etirements: 2, mobilite: 1 } },
];

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
      onClick={onAdd}
      style={{ touchAction: "manipulation" }}
      className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-150 min-h-22 select-none
        ${
          isActive
            ? `${card.colors.activeBg} ${card.colors.activeBorder} shadow-sm`
            : "bg-white border-gray-100 shadow-sm hover:border-gray-200"
        }
        ${isJustAdded ? "scale-90" : "scale-100 active:scale-90"}`}
    >
      {isActive && (
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white bg-black shadow-md z-10">
          {count}
        </span>
      )}
      <span className="text-2xl leading-none">{card.emoji}</span>
      <span
        className={`text-[11px] font-bold text-center leading-tight ${
          isActive ? card.colors.text : "text-gray-700"
        }`}
      >
        {card.label}
      </span>
      <span
        className={`text-[9px] font-semibold ${
          isActive ? card.colors.text : "text-gray-400"
        } opacity-80`}
      >
        +{card.minutesPerItem} min
      </span>
    </button>
  );
}

// ── CartPanel ─────────────────────────────────────────────────────────────────

function AdvisoryPanel({
  advisories,
  visible,
}: Readonly<{ advisories: Advisory[]; visible: boolean }>) {
  if (!visible || advisories.length === 0) return null;
  return (
    <div className="mt-5 mb-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5 flex items-center gap-1.5">
        <Bot className="w-3.5 h-3.5" />
        Coach IA
      </p>
      <div className="space-y-2">
        {advisories.map((a, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
              a.level === "warning"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : a.level === "good"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            <span className="text-sm leading-none mt-0.5 shrink-0">{a.icon}</span>
            <span>{a.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartPanel({
  entries,
  totalItems,
  estimatedDuration,
  generating,
  error,
  onAdjust,
  onGenerate,
  onClear,
}: Readonly<{
  entries: CartEntry[];
  totalItems: number;
  estimatedDuration: number;
  generating: boolean;
  error: string;
  onAdjust: (id: string, delta: number) => void;
  onGenerate: () => void;
  onClear: () => void;
}>) {
  const barColors = ["bg-emerald-400", "bg-yellow-400", "bg-orange-400", "bg-red-400"];
  let barColorIndex = 3;
  if (estimatedDuration < 35) barColorIndex = 0;
  else if (estimatedDuration < 55) barColorIndex = 1;
  else if (estimatedDuration < 70) barColorIndex = 2;
  const barColor = barColors[barColorIndex];
  const MAX_DISPLAY = 90;
  const pct = Math.min((estimatedDuration / MAX_DISPLAY) * 100, 100);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-55 transition-transform duration-300 ease-out ${
        totalItems > 0 ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-2xl mx-auto">
        <div
          className="bg-white rounded-t-3xl border-t border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.14), 0 -1px 0 rgba(0,0,0,0.05)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-0">
            <div className="w-9 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Duration bar */}
          <div className="px-5 pt-3 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-gray-900">
                {totalItems} zone{totalItems > 1 ? "s" : ""} sélectionnée{totalItems > 1 ? "s" : ""}
              </span>
              <span className="text-sm font-black tabular-nums">~{estimatedDuration} min</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-400 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-300 font-semibold mt-1 px-0.5">
              <span>0</span>
              <span>30</span>
              <span>45</span>
              <span>60</span>
              <span>90 min</span>
            </div>
          </div>

          {/* Cart chips */}
          <div className="px-4 pb-3 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-1.5 ${entry.colors.activeBg} border ${entry.colors.activeBorder} px-3 py-1.5 rounded-full`}
              >
                <span className="text-sm leading-none">{entry.emoji}</span>
                <span className={`text-xs font-bold ${entry.colors.text}`}>{entry.label}</span>
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => onAdjust(entry.id, -1)}
                    className={`w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 ${entry.colors.text}`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span
                    className={`text-xs font-black ${entry.colors.text} w-4 text-center tabular-nums`}
                  >
                    {entry.count}
                  </span>
                  <button
                    onClick={() => onAdjust(entry.id, 1)}
                    className={`w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 ${entry.colors.text}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 pb-2">
              <p className="text-xs text-red-500 font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 pb-6 md:pb-4 pt-1 flex gap-2">
            <button
              onClick={onClear}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
              aria-label="Vider le panier"
            >
              <Trash2 className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={onGenerate}
              disabled={generating}
              className="flex-1 bg-black text-white font-black py-3.5 rounded-2xl hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Génération en cours…</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Générer ma séance
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WorkoutBuilder() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const profile = state.profile as UserProfile | null;

  const [cart, setCart] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const totalItems = useMemo(() => Object.values(cart).reduce((sum, n) => sum + n, 0), [cart]);

  const estimatedDuration = useMemo(() => {
    const body = Object.entries(cart).reduce(
      (sum, [id, count]) => sum + count * (CARD_MAP[id]?.minutesPerItem ?? 8),
      0,
    );
    return WARMUP_COOLDOWN_MIN + body;
  }, [cart]);

  const cartEntries = useMemo<CartEntry[]>(
    () =>
      Object.entries(cart)
        .filter(([, count]) => count > 0)
        .map(([id, count]) => ({ ...CARD_MAP[id], count })),
    [cart],
  );

  const advisories = useMemo(() => computeAdvisories(cart), [cart]);

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Complète ton profil pour construire une séance.</p>
          <button
            onClick={() => navigate("/onboarding")}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold"
          >
            Compléter le profil
          </button>
        </div>
      </div>
    );
  }

  const muscleCards = CARDS.filter((c) => c.section === "muscles");
  const typeCards = CARDS.filter((c) => c.section === "types");

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Hero header */}
      <div
        className="relative overflow-hidden bg-black text-white px-5 pb-8"
        style={{ paddingTop: "max(56px, env(safe-area-inset-top, 56px))" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 90% 40%, rgba(99,102,241,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 10% 80%, rgba(236,72,153,0.15) 0%, transparent 55%)",
          }}
        />

        <button
          onClick={() => navigate(-1)}
          className="relative flex items-center gap-1.5 text-white/50 hover:text-white mb-7 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Retour</span>
        </button>

        <div className="relative">
          <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-black mb-2">
            Workout Builder
          </p>
          <h1 className="text-3xl font-black leading-tight mb-2 tracking-tight">
            Construis ta
            <br />
            séance sur mesure
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Sélectionne tes zones et l'IA génère les exercices parfaits pour ton niveau.
          </p>
        </div>
      </div>

      <div
        className="max-w-2xl mx-auto px-4 sm:px-6"
        style={{ paddingBottom: totalItems > 0 ? "22rem" : "7rem" }}
      >
        {/* Quick presets */}
        <div className="pt-5 pb-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
            Suggestions rapides
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setCart(preset.cart)}
                className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-2.5 text-xs font-bold whitespace-nowrap hover:border-gray-300 hover:shadow-sm active:scale-95 transition-all shrink-0 shadow-sm"
              >
                <span className="text-base leading-none">{preset.emoji}</span>
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Coach IA advisory */}
        <AdvisoryPanel advisories={advisories} visible={totalItems > 0} />

        {/* Hint */}
        <div className="flex items-center gap-2 mt-5 mb-1">
          <span className="inline-flex items-center gap-1.5 bg-black text-white text-[11px] font-bold rounded-full px-3 py-1.5">
            <span className="text-sm leading-none">👆</span>1 clic = 1 exercice
          </span>
          <span className="text-[11px] text-gray-500 font-medium">
            Ajoute autant d'exercices que tu veux
          </span>
        </div>

        {/* Zones musculaires */}
        <section className="mt-4 mb-7">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Zones musculaires
            </p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
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

        {/* Types d'effort */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Types d'effort
            </p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
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
      </div>

      <CartPanel
        entries={cartEntries}
        totalItems={totalItems}
        estimatedDuration={estimatedDuration}
        generating={generating}
        error={error}
        onAdjust={adjust}
        onGenerate={() => {
          void handleGenerate();
        }}
        onClear={() => setCart({})}
      />
    </div>
  );
}
