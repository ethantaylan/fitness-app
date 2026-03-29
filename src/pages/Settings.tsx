import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save,
  ChevronLeft,
  User,
  Dumbbell,
  Check,
  Target,
  Clock,
  Calendar,
  Heart,
  Flame,
  Activity,
  Zap,
  AlertTriangle,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Plus,
} from "lucide-react";
import { CheckCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeMode } from "../lib/theme";
import { getAppRedirectUrl } from "../lib/appUrl";
import type { ObjectiveType, LevelType, GenderType, AvailabilityType } from "../lib/types";
import { OBJECTIVE_LABELS } from "../lib/agents";
import { OBJECTIVE_META, EQUIPMENT_OPTIONS } from "../lib/constants";
import {
  addEquipmentLabel,
  getCustomEquipment,
  hasEquipmentLabel,
  normalizeEquipmentLabel,
  removeEquipmentLabel,
} from "../lib/equipment";
import Navbar from "../components/Navbar";

export default function Settings() {
  const { state, dispatch } = useApp();
  const { userEmail, userFirstName } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const profile = state.profile;
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showCustomEquipmentInput, setShowCustomEquipmentInput] = useState(false);
  const [customEquipmentDraft, setCustomEquipmentDraft] = useState("");
  const [tab, setTab] = useState<"entrainement" | "compte">("entrainement");

  useEffect(() => {
    if (!resetSent) return;
    const t = setTimeout(() => setResetSent(false), 5000);
    return () => clearTimeout(t);
  }, [resetSent]);

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  function handleResetProfile() {
    dispatch({ type: "RESET" });
    void navigate("/onboarding");
  }

  const [form, setForm] = useState({
    objective: profile?.objective ?? "",
    gender: profile?.gender ?? "",
    age: profile?.age?.toString() ?? "",
    height: profile?.height?.toString() ?? "",
    weight: profile?.weight?.toString() ?? "",
    level: profile?.level ?? "",
    weeklyFrequency: profile?.weeklyFrequency?.toString() ?? "3",
    sessionDuration: (profile?.sessionDuration?.[0] ?? 45).toString(),
    equipment: profile?.equipment ?? [],
    injuries: profile?.injuries ?? "",
    nutritionRestrictions: profile?.nutritionRestrictions ?? "",
    availability: profile?.availability ?? [],
  });

  function update(data: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...data }));
  }

  function toggleEquipment(label: string) {
    setForm((f) => ({
      ...f,
      equipment: hasEquipmentLabel(f.equipment, label)
        ? removeEquipmentLabel(f.equipment, label)
        : addEquipmentLabel(f.equipment, label),
    }));
  }

  function addCustomEquipment() {
    const normalized = normalizeEquipmentLabel(customEquipmentDraft);
    if (!normalized || hasEquipmentLabel(form.equipment, normalized)) return;

    setForm((f) => ({
      ...f,
      equipment: addEquipmentLabel(f.equipment, normalized),
    }));
    setCustomEquipmentDraft("");
    setShowCustomEquipmentInput(false);
  }

  function toggleAvailability(val: AvailabilityType) {
    setForm((f) => ({
      ...f,
      availability: f.availability.includes(val)
        ? f.availability.filter((x) => x !== val)
        : [...f.availability, val],
    }));
  }

  function handleSave() {
    dispatch({
      type: "SET_PROFILE_PARTIAL",
      data: {
        objective: form.objective as ObjectiveType,
        gender: form.gender as GenderType,
        age: form.age ? Number.parseInt(form.age) : undefined,
        height: form.height ? Number.parseInt(form.height) : undefined,
        weight: form.weight ? Number.parseFloat(form.weight) : undefined,
        level: form.level as LevelType,
        weeklyFrequency: Number.parseInt(form.weeklyFrequency),
        sessionDuration: [Number.parseInt(form.sessionDuration)],
        equipment: form.equipment,
        injuries: form.injuries,
        nutritionRestrictions: form.nutritionRestrictions,
        availability: form.availability,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const objMeta = form.objective ? OBJECTIVE_META[form.objective as ObjectiveType] : null;
  const heroBg = objMeta ? `${objMeta.bg} border-2 ${objMeta.border}` : "bg-black";
  const customEquipment = getCustomEquipment(form.equipment);
  const canAddCustomEquipment =
    normalizeEquipmentLabel(customEquipmentDraft) !== "" &&
    !hasEquipmentLabel(form.equipment, customEquipmentDraft);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-28 md:pb-24 sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-black mt-6 mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        {/* ── Hero profile card ── */}
        <div className={`relative overflow-hidden rounded-3xl p-6 mb-6 ${heroBg}`}>
          <div className="relative flex items-start justify-between">
            <div>
              <div
                className={`text-xs font-bold uppercase tracking-widest mb-1 ${objMeta ? objMeta.color : "text-white/50"}`}
              >
                Mon profil
              </div>
              <h1
                className={`text-2xl font-black leading-tight ${objMeta ? "text-gray-900" : "text-white"}`}
              >
                {userFirstName ?? userEmail ?? "Athlète"}
              </h1>
              {userEmail && (
                <div className={`text-xs mt-0.5 ${objMeta ? "text-gray-500" : "text-white/50"}`}>
                  {userEmail}
                </div>
              )}
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${objMeta ? "bg-white/60" : "bg-white/10"}`}
            >
              {objMeta ? objMeta.emoji : "👤"}
            </div>
          </div>

          {/* Stats strip */}
          {form.objective && (
            <div className="relative mt-5 flex flex-wrap gap-2">
              {(
                [
                  {
                    Icon: Target,
                    label: OBJECTIVE_LABELS[form.objective as ObjectiveType],
                  },
                  form.level && { Icon: Zap, label: form.level },
                  form.weeklyFrequency && {
                    Icon: Calendar,
                    label: `${form.weeklyFrequency}× / sem`,
                  },
                  form.sessionDuration && { Icon: Clock, label: `${form.sessionDuration} min` },
                ] as { Icon: React.ElementType; label: string }[]
              )
                .filter(Boolean)
                .map(({ Icon, label }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${objMeta ? "bg-white/70 text-gray-700" : "bg-white/10 text-white"}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="capitalize">{label}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 mb-6 shadow-sm">
          <button
            onClick={() => setTab("entrainement")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === "entrainement"
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Entraînement
          </button>
          <button
            onClick={() => setTab("compte")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === "compte" ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-black"
            }`}
          >
            <User className="w-4 h-4" />
            Compte
          </button>
        </div>

        {/* ── Tab Entraînement ── */}
        {tab === "entrainement" && (
          <div className="space-y-4">
            {/* Objectif */}
            <Section
              icon={<Target className="w-4 h-4" />}
              title="Objectif principal"
              color="text-violet-600"
              bg="bg-violet-50"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(OBJECTIVE_LABELS) as ObjectiveType[]).map((id) => {
                  const meta = OBJECTIVE_META[id];
                  const active = form.objective === id;
                  return (
                    <button
                      key={id}
                      onClick={() => update({ objective: id })}
                      className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${
                        active
                          ? `${meta.border} ${meta.bg}`
                          : "border-gray-100 hover:border-gray-300 bg-gray-50"
                      }`}
                    >
                      <span className="text-xl">{meta.emoji}</span>
                      <span
                        className={`text-xs font-bold leading-tight ${active ? meta.color : "text-gray-700"}`}
                      >
                        {OBJECTIVE_LABELS[id]}
                      </span>
                      {active && (
                        <span
                          className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center ${meta.bg} ${meta.border} border`}
                        >
                          <Check className={`w-2.5 h-2.5 ${meta.color}`} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Infos physiques */}
            <Section
              icon={<User className="w-4 h-4" />}
              title="Infos corporelles"
              color="text-blue-600"
              bg="bg-blue-50"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="s-gender" className="block text-xs font-bold text-gray-500 mb-2">
                    Genre
                  </label>
                  <select
                    id="s-gender"
                    value={form.gender}
                    onChange={(e) => update({ gender: e.target.value as GenderType })}
                    className="w-full border-2 border-gray-100 rounded-xl px-3 py-3 text-sm font-semibold bg-gray-50 focus:outline-none focus:border-black focus:bg-white transition-all"
                  >
                    <option value="">—</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                {(
                  [
                    { id: "s-age", label: "Âge", key: "age", unit: "ans", min: 12, max: 99 },
                    {
                      id: "s-height",
                      label: "Taille",
                      key: "height",
                      unit: "cm",
                      min: 130,
                      max: 220,
                    },
                    {
                      id: "s-weight",
                      label: "Poids",
                      key: "weight",
                      unit: "kg",
                      min: 30,
                      max: 200,
                    },
                  ] as const
                ).map(({ id, label, key, unit, min, max }) => (
                  <div key={key}>
                    <label htmlFor={id} className="block text-xs font-bold text-gray-500 mb-2">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        id={id}
                        type="number"
                        inputMode="numeric"
                        min={min}
                        max={max}
                        value={form[key]}
                        onChange={(e) => update({ [key]: e.target.value })}
                        className="w-full border-2 border-gray-100 rounded-xl px-3 py-3 pr-10 text-sm font-semibold bg-gray-50 focus:outline-none focus:border-black focus:bg-white transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                        {unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Niveau */}
            <Section
              icon={<Flame className="w-4 h-4" />}
              title="Niveau sportif"
              color="text-orange-600"
              bg="bg-orange-50"
            >
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    {
                      value: "débutant",
                      label: "Débutant",
                      emoji: "🌱",
                      desc: "Moins d'1 an, j'apprends les bases",
                      color: "text-green-600",
                      activeBg: "bg-green-50",
                      activeBorder: "border-green-400",
                    },
                    {
                      value: "intermédiaire",
                      label: "Intermédiaire",
                      emoji: "⚡",
                      desc: "1–3 ans, j'ai mes habitudes d'entraînement",
                      color: "text-orange-600",
                      activeBg: "bg-orange-50",
                      activeBorder: "border-orange-400",
                    },
                    {
                      value: "avancé",
                      label: "Avancé",
                      emoji: "🔥",
                      desc: "3+ ans, entraînement structuré et périodisé",
                      color: "text-red-600",
                      activeBg: "bg-red-50",
                      activeBorder: "border-red-400",
                    },
                  ] as const
                ).map(({ value, label, emoji, desc, color, activeBg, activeBorder }) => {
                  const active = form.level === value;
                  return (
                    <button
                      key={value}
                      onClick={() => update({ level: value as LevelType })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all active:scale-[0.97] ${
                        active
                          ? `${activeBorder} ${activeBg}`
                          : "border-gray-100 hover:border-gray-300 bg-gray-50"
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span
                        className={`text-xs font-black leading-tight ${active ? color : "text-gray-700"}`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-[10px] leading-tight ${active ? "text-gray-500" : "text-gray-400"}`}
                      >
                        {desc}
                      </span>
                      {active && <Check className={`w-3.5 h-3.5 ${color}`} />}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Fréquence */}
            <Section
              icon={<Calendar className="w-4 h-4" />}
              title="Fréquence d'entraînement"
              color="text-indigo-600"
              bg="bg-indigo-50"
            >
              <div className="flex gap-2">
                {[
                  { n: "2", label: "2×", sub: "Léger" },
                  { n: "3", label: "3×", sub: "Standard" },
                  { n: "4", label: "4×", sub: "Régulier" },
                  { n: "5", label: "5×", sub: "Intensif" },
                  { n: "6", label: "6×", sub: "Expert" },
                ].map(({ n, label, sub }) => {
                  const active = form.weeklyFrequency === n;
                  return (
                    <button
                      key={n}
                      onClick={() => update({ weeklyFrequency: n })}
                      className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 transition-all active:scale-[0.96] ${
                        active
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span
                        className={`text-[10px] mt-0.5 ${active ? "text-indigo-200" : "text-gray-400"}`}
                      >
                        {sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Durée séance */}
            <Section
              icon={<Clock className="w-4 h-4" />}
              title="Durée par séance"
              color="text-teal-600"
              bg="bg-teal-50"
            >
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { val: "30", label: "30 min", sub: "Express" },
                  { val: "45", label: "45 min", sub: "Recommandé" },
                  { val: "60", label: "1h00", sub: "Standard" },
                  { val: "75", label: "1h15", sub: "Confortable" },
                  { val: "90", label: "1h30", sub: "Complet" },
                  { val: "120", label: "2h00+", sub: "Intensif" },
                ].map(({ val, label, sub }) => {
                  const active = form.sessionDuration === val;
                  return (
                    <button
                      key={val}
                      onClick={() => update({ sessionDuration: val })}
                      className={`flex flex-col items-center py-3.5 rounded-xl border-2 transition-all active:scale-[0.96] ${
                        active
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span
                        className={`text-[10px] mt-0.5 ${active ? "text-teal-200" : "text-gray-400"}`}
                      >
                        {sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Disponibilité */}
            <Section
              icon={<Activity className="w-4 h-4" />}
              title="Créneau préféré"
              color="text-amber-600"
              bg="bg-amber-50"
            >
              <p className="text-xs text-gray-400 mb-3">Sélection multiple possible</p>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      value: "matin",
                      label: "Le matin",
                      sub: "Avant 13h",
                      emoji: "🌅",
                      color: "text-yellow-600",
                      activeBg: "bg-yellow-50",
                      activeBorder: "border-yellow-400",
                    },
                    {
                      value: "midi",
                      label: "Le midi",
                      sub: "12h–14h",
                      emoji: "☀️",
                      color: "text-orange-600",
                      activeBg: "bg-orange-50",
                      activeBorder: "border-orange-400",
                    },
                    {
                      value: "soir",
                      label: "Le soir",
                      sub: "Après 17h",
                      emoji: "🌙",
                      color: "text-indigo-600",
                      activeBg: "bg-indigo-50",
                      activeBorder: "border-indigo-400",
                    },
                    {
                      value: "indifférent",
                      label: "Indifférent",
                      sub: "Pas de préférence",
                      emoji: "🔄",
                      color: "text-gray-700",
                      activeBg: "bg-gray-100",
                      activeBorder: "border-gray-400",
                    },
                  ] as const
                ).map(({ value, label, sub, emoji, color, activeBg, activeBorder }) => {
                  const active = form.availability.includes(value as AvailabilityType);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleAvailability(value as AvailabilityType)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${
                        active
                          ? `${activeBorder} ${activeBg}`
                          : "border-gray-100 bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-black ${active ? color : "text-gray-700"}`}>
                          {label}
                        </div>
                        <div className="text-[10px] text-gray-400">{sub}</div>
                      </div>
                      {active && <Check className={`w-3.5 h-3.5 shrink-0 ${color}`} />}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Matériel */}
            <Section
              icon={<Dumbbell className="w-4 h-4" />}
              title="Matériel disponible"
              color="text-gray-700"
              bg="bg-gray-100"
            >
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(({ label, emoji }) => {
                  const active = hasEquipmentLabel(form.equipment, label);
                  return (
                    <button
                      key={label}
                      onClick={() => toggleEquipment(label)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-all active:scale-[0.96] ${
                        active
                          ? "bg-black text-white border-black"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <span>{emoji}</span>
                      {label}
                      {active && <Check className="w-3 h-3 ml-0.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Ajouter du matériel perso</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Pratique si tu as du matériel spécifique qu'on n'a pas listé.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomEquipmentInput((open) => !open)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${
                      showCustomEquipmentInput
                        ? "bg-black text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {!showCustomEquipmentInput && <Plus className="w-3.5 h-3.5" />}
                    {showCustomEquipmentInput ? "Fermer" : "J'aimerais ajouter"}
                  </button>
                </div>

                {showCustomEquipmentInput && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={customEquipmentDraft}
                        onChange={(e) => setCustomEquipmentDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomEquipment();
                          }
                        }}
                        placeholder="Ex : traîneau, slam ball, bandes élastiques..."
                        className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addCustomEquipment}
                        disabled={!canAddCustomEquipment}
                        className="rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-gray-900"
                      >
                        Ajouter
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {normalizeEquipmentLabel(customEquipmentDraft) &&
                      hasEquipmentLabel(form.equipment, customEquipmentDraft)
                        ? "Ce matériel est déjà présent."
                        : "On en tiendra compte pour les prochaines séances et programmes."}
                    </p>
                  </div>
                )}

                {customEquipment.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Ajouts perso
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {customEquipment.map((label) => (
                        <button
                          key={label}
                          onClick={() => toggleEquipment(label)}
                          className="flex items-center gap-1.5 rounded-full border-2 border-black bg-black px-3.5 py-2 text-xs font-semibold text-white transition-all active:scale-[0.96]"
                        >
                          {label}
                          <Check className="w-3 h-3 ml-0.5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Santé & Nutrition */}
            <Section
              icon={<Heart className="w-4 h-4" />}
              title="Santé & Nutrition"
              color="text-rose-600"
              bg="bg-rose-50"
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="s-injuries"
                    className="block text-xs font-bold text-gray-500 mb-2"
                  >
                    🩹 Blessures / limitations physiques
                  </label>
                  <textarea
                    id="s-injuries"
                    value={form.injuries}
                    onChange={(e) => update({ injuries: e.target.value })}
                    placeholder="Ex : douleur genou gauche, épaule fragile, hernie discale..."
                    rows={2}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-black focus:bg-white transition-all resize-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="s-nutrition"
                    className="block text-xs font-bold text-gray-500 mb-2"
                  >
                    🥗 Restrictions alimentaires
                  </label>
                  <textarea
                    id="s-nutrition"
                    value={form.nutritionRestrictions}
                    onChange={(e) => update({ nutritionRestrictions: e.target.value })}
                    placeholder="Ex : végétarien, sans lactose, sans gluten..."
                    rows={2}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-black focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>
            </Section>

            {/* Save */}
            <button
              onClick={handleSave}
              className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-base transition-all active:scale-[0.99] ${
                saved ? "bg-green-500 text-white" : "bg-black text-white hover:bg-gray-900"
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" /> Profil enregistré !
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Enregistrer les modifications
                </>
              )}
            </button>

            {/* Reset profile */}
            <div className="border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                  Tout remettre à zéro
                </p>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Recommence l'onboarding depuis le début — utile si tu changes d'objectif (prise de
                masse → perte de poids, etc.).
              </p>
              {confirmReset ? (
                <button
                  onClick={handleResetProfile}
                  className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Confirmer la réinitialisation
                </button>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-2 border border-red-300 text-red-600 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Réinitialiser mon profil
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Tab Compte ── */}
        {tab === "compte" && (
          <div className="space-y-4">
            <div className="border border-gray-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Apparence
                  </p>
                  <p className="font-semibold text-sm text-gray-900">Thème de l'application</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Choisis un mode fixe ou laisse Vincere suivre le thème de ton appareil.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                    Dark mode en cours d'optimisation
                  </span>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                  {resolvedTheme === "dark" ? (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      Sombre actif
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5" />
                      Clair actif
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "light",
                      label: "Clair",
                      sub: "Toujours lumineux",
                      Icon: Sun,
                    },
                    {
                      value: "dark",
                      label: "Sombre",
                      sub: "Repos des yeux",
                      Icon: Moon,
                    },
                    {
                      value: "system",
                      label: "Système",
                      sub: "Suit l'appareil",
                      Icon: Monitor,
                    },
                  ] as {
                    value: ThemeMode;
                    label: string;
                    sub: string;
                    Icon: React.ElementType;
                  }[]
                ).map(({ value, label, sub, Icon }) => {
                  const active = themeMode === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setThemeMode(value)}
                      className={`rounded-2xl border-2 px-3 py-3 text-left transition-all active:scale-[0.98] ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-2" />
                      <div className="text-xs font-black uppercase tracking-wider">{label}</div>
                      <div
                        className={`text-[11px] mt-1 leading-tight ${active ? "text-gray-300" : "text-gray-400"}`}
                      >
                        {sub}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Le mode sombre est encore en work in progress. Certaines pages ou certains
                composants peuvent rester imparfaits pendant cette phase.
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Adresse e-mail
              </p>
              <p className="font-semibold text-sm text-gray-900">{userEmail ?? "—"}</p>
            </div>
            <div className="border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Mot de passe
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Reçois un e-mail pour réinitialiser ton mot de passe.
              </p>
              {resetSent && (
                <div
                  role="alert"
                  className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium px-4 py-3 rounded-xl mb-4"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  E-mail de réinitialisation envoyé !
                </div>
              )}
              <button
                onClick={() => {
                  if (userEmail) {
                    void supabase.auth.resetPasswordForEmail(userEmail, {
                      redirectTo: getAppRedirectUrl("/reset-password"),
                    });
                    setResetSent(true);
                  }
                }}
                disabled={resetSent}
                className="inline-flex items-center gap-2 bg-black text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Envoyer le lien de réinitialisation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Section wrapper component ── */
function Section({
  icon,
  title,
  color,
  bg,
  children,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2.5 px-5 py-4 border-b border-gray-50 ${bg}`}>
        <div className={`${color}`}>{icon}</div>
        <h2 className={`text-xs font-black uppercase tracking-wider ${color}`}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
