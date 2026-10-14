import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Save,
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
  ChevronDown,
} from "lucide-react";
import { CheckCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { useTheme, type ThemeMode } from "../lib/theme";
import { getAppRedirectUrl } from "../lib/appUrl";
import { showToast } from "../lib/toast";
import type { ObjectiveType, LevelType, GenderType, AvailabilityType } from "../lib/types";
import { OBJECTIVE_LABELS } from "../lib/agents";
import { GOAL_DETAIL_PRESETS, OBJECTIVE_META, EQUIPMENT_OPTIONS } from "../lib/constants";
import {
  addEquipmentLabel,
  getCustomEquipment,
  hasEquipmentLabel,
  normalizeEquipmentLabel,
  removeEquipmentLabel,
} from "../lib/equipment";
import Navbar from "../components/Navbar";
import AccountPrivacy from "../components/AccountPrivacy";
import AppVersion from "../components/AppVersion";

export default function Settings() {
  const { state, dispatch, persistProfile } = useApp();
  const { userEmail, userFirstName, updateUserDisplayName } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = state.profile;
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showCustomEquipmentInput, setShowCustomEquipmentInput] = useState(false);
  const [customEquipmentDraft, setCustomEquipmentDraft] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState(userFirstName ?? "");
  const [savingNickname, setSavingNickname] = useState(false);
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [nicknameError, setNicknameError] = useState("");
  const [tab, setTab] = useState<"entrainement" | "apparence" | "compte">(() => {
    const requested = new URLSearchParams(location.search).get("tab");
    return requested === "apparence" || requested === "compte" ? requested : "entrainement";
  });

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get("tab");
    if (
      requestedTab === "entrainement" ||
      requestedTab === "apparence" ||
      requestedTab === "compte"
    ) {
      setTab(requestedTab);
    }
  }, [location.search]);

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

  useEffect(() => {
    setNicknameDraft(userFirstName ?? "");
  }, [userFirstName]);

  useEffect(() => {
    if (!nicknameSaved) return;
    const t = setTimeout(() => setNicknameSaved(false), 2500);
    return () => clearTimeout(t);
  }, [nicknameSaved]);

  function handleResetProfile() {
    dispatch({ type: "RESET" });
    void navigate("/onboarding");
  }

  async function handleSaveNickname() {
    const normalized = nicknameDraft.trim();

    if (normalized.length < 2) {
      setNicknameError("Ajoute au moins 2 caractères pour ton pseudo.");
      return;
    }

    setSavingNickname(true);
    setNicknameError("");

    try {
      await updateUserDisplayName(normalized);
      setNicknameSaved(true);
    } catch (error) {
      setNicknameError(
        error instanceof Error ? error.message : "Impossible d'enregistrer le pseudo.",
      );
    } finally {
      setSavingNickname(false);
    }
  }

  const [form, setForm] = useState({
    objective: profile?.objective ?? "",
    goalDetail: profile?.goalDetail ?? "",
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

  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(form));
  const hasChanges = JSON.stringify(form) !== savedSnapshot;

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
      availability:
        val === "indifférent"
          ? f.availability.includes(val)
            ? []
            : [val]
          : f.availability.includes(val)
            ? f.availability.filter((x) => x !== val)
            : [...f.availability.filter((x) => x !== "indifférent"), val],
    }));
  }

  async function handleSave() {
    if (savingProfile) return;
    if (
      !form.objective ||
      !form.gender ||
      !form.level ||
      Number(form.age) < 13 ||
      Number(form.age) > 100 ||
      Number(form.height) < 100 ||
      Number(form.height) > 250 ||
      Number(form.weight) < 30 ||
      Number(form.weight) > 300
    ) {
      setProfileError(
        "Vérifie tes informations : âge 13–100 ans, taille 100–250 cm, poids 30–300 kg.",
      );
      return;
    }
    setSavingProfile(true);
    setProfileError("");
    try {
      await persistProfile({
        objective: form.objective as ObjectiveType,
        goalDetail: form.goalDetail.trim() || undefined,
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
      });
      setSavedSnapshot(JSON.stringify(form));
      showToast({ message: "Profil enregistré." });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setProfileError("Le profil n'a pas pu être enregistré. Tes modifications sont conservées.");
    } finally {
      setSavingProfile(false);
    }
  }

  const goalDetailPresets = form.objective
    ? GOAL_DETAIL_PRESETS[form.objective as ObjectiveType]
    : [];
  const customEquipment = getCustomEquipment(form.equipment);
  const canAddCustomEquipment =
    normalizeEquipmentLabel(customEquipmentDraft) !== "" &&
    !hasEquipmentLabel(form.equipment, customEquipmentDraft);

  return (
    <div className="theme-app-page min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 pb-28 pt-20 sm:px-6 md:pb-24">
        {/* ── Profil : carte neutre, la couleur reste réservée à la marque et aux états ── */}
        <div className="mb-6 mt-6 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold text-ink-soft">Mon profil</p>
          <h1 className="mt-1 text-2xl font-black leading-tight">{userFirstName ?? "Athlète"}</h1>
          {userEmail && <p className="mt-0.5 break-all text-sm text-ink-soft">{userEmail}</p>}

          {form.objective && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  {
                    Icon: Target,
                    label: form.goalDetail || OBJECTIVE_LABELS[form.objective as ObjectiveType],
                  },
                  form.level && { Icon: Zap, label: form.level },
                  form.weeklyFrequency && {
                    Icon: Calendar,
                    label: `${form.weeklyFrequency} séances / semaine`,
                  },
                  form.sessionDuration && { Icon: Clock, label: `${form.sessionDuration} min` },
                ] as { Icon: React.ElementType; label: string }[]
              )
                .filter(Boolean)
                .map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-card-soft px-3 py-1.5 text-xs font-semibold"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
                    <span className="min-w-0 break-words">{label}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="grid grid-cols-3 gap-1 bg-card border border-line rounded-2xl p-1.5 mb-6 shadow-sm">
          <button
            onClick={() => setTab("entrainement")}
            data-active={tab === "entrainement"}
            className={`theme-segment-tab flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 text-xs font-semibold transition-colors sm:gap-2 sm:text-sm ${
              tab === "entrainement"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Entraînement
          </button>
          <button
            onClick={() => setTab("apparence")}
            data-active={tab === "apparence"}
            className={`theme-segment-tab flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 text-xs font-semibold transition-colors sm:gap-2 sm:text-sm ${
              tab === "apparence" ? "bg-ink text-paper shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Sun className="w-4 h-4" />
            Apparence
          </button>
          <button
            onClick={() => setTab("compte")}
            data-active={tab === "compte"}
            className={`theme-segment-tab flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 text-xs font-semibold transition-colors sm:gap-2 sm:text-sm ${
              tab === "compte" ? "bg-ink text-paper shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            <User className="w-4 h-4" />
            Compte
          </button>
        </div>

        {tab === "apparence" && (
          <div className="border border-line rounded-2xl p-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                Thème de l'application
              </p>
              <p className="text-sm text-ink-soft">
                Choisis un mode fixe ou suis automatiquement le réglage de ton appareil.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "light", label: "Clair", Icon: Sun },
                  { value: "dark", label: "Sombre", Icon: Moon },
                  { value: "system", label: "Système", Icon: Monitor },
                ] as { value: ThemeMode; label: string; Icon: React.ElementType }[]
              ).map(({ value, label, Icon }) => {
                const active = themeMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setThemeMode(value)}
                    className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border-2 px-2 py-4 text-center transition-all ${
                      active ? "border-ink bg-ink text-paper" : "border-line bg-card-muted text-ink"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs font-semibold text-ink-soft" role="status">
              Mode actif : {resolvedTheme === "dark" ? "sombre" : "clair"}
            </p>
          </div>
        )}

        {/* ── Tab Entraînement ── */}
        {tab === "entrainement" && (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p role="status" className="text-sm font-semibold">
                {hasChanges
                  ? "Modifications non enregistrées"
                  : saved
                    ? "Profil enregistré"
                    : "Profil à jour"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Les changements s'appliquent à tes prochains programmes. Ton programme actuel
                conserve son profil de création ; tu peux le régénérer depuis Programme.
              </p>
            </div>
            {/* Objectif */}
            <Section
              icon={<Target className="w-4 h-4" />}
              title="Discipline et objectif"
              summary={
                form.goalDetail ||
                (form.objective ? OBJECTIVE_LABELS[form.objective as ObjectiveType] : "À compléter")
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(OBJECTIVE_LABELS) as ObjectiveType[]).map((id) => {
                  const meta = OBJECTIVE_META[id];
                  const active = form.objective === id;
                  return (
                    <button
                      key={id}
                      aria-pressed={active}
                      onClick={() => update({ objective: id, goalDetail: "" })}
                      className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${
                        active
                          ? "border-brand bg-brand-soft"
                          : "border-line bg-card-muted hover:border-line-strong"
                      }`}
                    >
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="text-xs font-bold leading-tight">
                        {OBJECTIVE_LABELS[id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {form.objective && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Objectif précis
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {goalDetailPresets.map(({ label, sub }) => {
                      const active = form.goalDetail === label;
                      return (
                        <button
                          key={label}
                          aria-pressed={active}
                          onClick={() => update({ goalDetail: label })}
                          className={`rounded-xl border-2 p-3 text-left transition-all active:scale-[0.97] ${
                            active
                              ? "border-brand bg-brand-soft"
                              : "border-line bg-card-muted hover:border-line-strong"
                          }`}
                        >
                          <span className="block text-xs font-black leading-tight">{label}</span>
                          <span className="mt-1 block text-[11px] leading-tight text-ink-soft">
                            {sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <label htmlFor="s-goal-detail" className="mt-3 block text-sm font-semibold">
                    Objectif personnalisé
                  </label>
                  <textarea
                    id="s-goal-detail"
                    value={form.goalDetail}
                    onChange={(e) => update({ goalDetail: e.target.value.slice(0, 300) })}
                    placeholder="Ou formule ta cible exacte : 5 km en 25 min, grand écart, HYROX duo..."
                    rows={2}
                    className="mt-3 w-full resize-none rounded-xl border-2 border-line bg-card-muted px-4 py-3 text-sm focus:outline-none focus:border-ink focus:bg-card transition-all"
                  />
                </div>
              )}
            </Section>

            {/* Infos physiques */}
            <Section
              icon={<User className="w-4 h-4" />}
              title="Infos corporelles"
              summary={`${form.age || "—"} ans · ${form.height || "—"} cm · ${form.weight || "—"} kg`}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="s-gender" className="block text-xs font-bold text-ink-soft mb-2">
                    Genre
                  </label>
                  <select
                    id="s-gender"
                    value={form.gender}
                    onChange={(e) => update({ gender: e.target.value as GenderType })}
                    className="app-input font-semibold"
                  >
                    <option value="">—</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                {(
                  [
                    { id: "s-age", label: "Âge", key: "age", unit: "ans", min: 13, max: 100 },
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
                    <label htmlFor={id} className="block text-xs font-bold text-ink-soft mb-2">
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
                        className="w-full border-2 border-line rounded-xl px-3 py-3 pr-10 text-sm font-semibold bg-card-muted focus:outline-none focus:border-ink focus:bg-card transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft font-medium">
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
              summary={form.level || "À compléter"}
            >
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    {
                      value: "débutant",
                      label: "Débutant",
                      emoji: "🌱",
                      desc: "Moins d'1 an, j'apprends les bases",
                      color: "text-ink",
                      activeBg: "bg-brand-soft",
                      activeBorder: "border-brand",
                    },
                    {
                      value: "intermédiaire",
                      label: "Intermédiaire",
                      emoji: "⚡",
                      desc: "1–3 ans, j'ai mes habitudes d'entraînement",
                      color: "text-ink",
                      activeBg: "bg-brand-soft",
                      activeBorder: "border-brand",
                    },
                    {
                      value: "avancé",
                      label: "Avancé",
                      emoji: "🔥",
                      desc: "3+ ans, entraînement structuré et périodisé",
                      color: "text-ink",
                      activeBg: "bg-brand-soft",
                      activeBorder: "border-brand",
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
                          : "border-line hover:border-line-strong bg-card-muted"
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span
                        className={`text-xs font-black leading-tight ${active ? color : "text-ink"}`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-[11px] leading-tight ${active ? "text-ink-soft" : "text-ink-soft"}`}
                      >
                        {desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Fréquence */}
            <Section
              icon={<Calendar className="w-4 h-4" />}
              title="Fréquence des séances"
              summary={`${form.weeklyFrequency} séances / semaine`}
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
                      aria-pressed={active}
                      onClick={() => update({ weeklyFrequency: n })}
                      className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 transition-all active:scale-[0.96] ${
                        active
                          ? "bg-brand border-brand text-brand-fg"
                          : "border-line bg-card-muted text-ink-soft hover:border-line-strong"
                      }`}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span
                        className={`text-[11px] mt-0.5 ${active ? "text-brand-fg" : "text-ink-soft"}`}
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
              summary={`${form.sessionDuration} min`}
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
                      aria-pressed={active}
                      onClick={() => update({ sessionDuration: val })}
                      className={`flex flex-col items-center py-3.5 rounded-xl border-2 transition-all active:scale-[0.96] ${
                        active
                          ? "bg-brand border-brand text-brand-fg"
                          : "border-line bg-card-muted text-ink-soft hover:border-line-strong"
                      }`}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span
                        className={`text-xs mt-0.5 ${active ? "text-brand-fg" : "text-ink-soft"}`}
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
              summary={form.availability.join(", ") || "À choisir"}
            >
              <p className="text-xs text-ink-soft mb-3">Sélection multiple possible</p>
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
                      color: "text-ink",
                      activeBg: "bg-brand-soft",
                      activeBorder: "border-brand",
                    },
                    {
                      value: "soir",
                      label: "Le soir",
                      sub: "Après 17h",
                      emoji: "🌙",
                      color: "text-ink",
                      activeBg: "bg-brand-soft",
                      activeBorder: "border-brand",
                    },
                    {
                      value: "indifférent",
                      label: "Indifférent",
                      sub: "Pas de préférence",
                      emoji: "🔄",
                      color: "text-ink",
                      activeBg: "bg-brand-soft",
                      activeBorder: "border-brand",
                    },
                  ] as const
                ).map(({ value, label, sub, emoji, color, activeBg, activeBorder }) => {
                  const active = form.availability.includes(value as AvailabilityType);
                  return (
                    <button
                      key={value}
                      aria-pressed={active}
                      onClick={() => toggleAvailability(value as AvailabilityType)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${
                        active
                          ? `${activeBorder} ${activeBg}`
                          : "border-line bg-card-muted hover:border-line-strong"
                      }`}
                    >
                      <span className="text-2xl shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-black ${active ? color : "text-ink"}`}>
                          {label}
                        </div>
                        <div className="text-[11px] text-ink-soft">{sub}</div>
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
              summary={
                form.equipment.length
                  ? `${form.equipment.length} équipements sélectionnés`
                  : "Sans matériel"
              }
            >
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(({ label, emoji }) => {
                  const active = hasEquipmentLabel(form.equipment, label);
                  return (
                    <button
                      key={label}
                      aria-pressed={active}
                      onClick={() => toggleEquipment(label)}
                      className={`flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-all active:scale-[0.96] ${
                        active
                          ? "border-brand bg-brand-soft text-ink"
                          : "bg-card border-line-strong text-ink hover:border-ink-soft"
                      }`}
                    >
                      <span>{emoji}</span>
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-line-strong bg-card-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Ajouter du matériel perso</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Pratique si tu as du matériel spécifique qu'on n'a pas listé.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomEquipmentInput((open) => !open)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] ${
                      showCustomEquipmentInput
                        ? "bg-ink text-paper"
                        : "border border-line-strong bg-card text-ink hover:border-line-strong"
                    }`}
                  >
                    {!showCustomEquipmentInput && <Plus className="w-3.5 h-3.5" />}
                    {showCustomEquipmentInput ? "Fermer" : "Ajouter"}
                  </button>
                </div>

                {showCustomEquipmentInput && (
                  <div className="mt-4 rounded-2xl border border-line-strong bg-card p-3">
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
                        className="flex-1 rounded-2xl border-2 border-line-strong px-4 py-3 text-sm focus:outline-none focus:border-ink transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addCustomEquipment}
                        disabled={!canAddCustomEquipment}
                        className="min-h-11 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-paper transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:opacity-90"
                      >
                        Ajouter
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-ink-soft">
                      {normalizeEquipmentLabel(customEquipmentDraft) &&
                      hasEquipmentLabel(form.equipment, customEquipmentDraft)
                        ? "Ce matériel est déjà présent."
                        : "On en tiendra compte pour les prochaines séances et programmes."}
                    </p>
                  </div>
                )}

                {customEquipment.length > 0 && (
                  <div className="mt-4 border-t border-line-strong pt-4">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      Ajouts perso
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {customEquipment.map((label) => (
                        <button
                          key={label}
                          aria-pressed={hasEquipmentLabel(form.equipment, label)}
                          onClick={() => toggleEquipment(label)}
                          className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-3.5 min-h-11 text-xs font-semibold text-paper transition-all active:scale-[0.96]"
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
              summary={
                form.injuries || form.nutritionRestrictions
                  ? "Contraintes renseignées"
                  : "Aucune contrainte renseignée"
              }
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="s-injuries"
                    className="block text-xs font-bold text-ink-soft mb-2"
                  >
                    🩹 Blessures / limitations physiques
                  </label>
                  <textarea
                    id="s-injuries"
                    value={form.injuries}
                    onChange={(e) => update({ injuries: e.target.value })}
                    placeholder="Ex : douleur genou gauche, épaule fragile, hernie discale..."
                    rows={2}
                    className="w-full border-2 border-line rounded-xl px-4 py-3 text-sm bg-card-muted focus:outline-none focus:border-ink focus:bg-card transition-all resize-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="s-nutrition"
                    className="block text-xs font-bold text-ink-soft mb-2"
                  >
                    🥗 Restrictions alimentaires
                  </label>
                  <textarea
                    id="s-nutrition"
                    value={form.nutritionRestrictions}
                    onChange={(e) => update({ nutritionRestrictions: e.target.value })}
                    placeholder="Ex : végétarien, sans lactose, sans gluten..."
                    rows={2}
                    className="w-full border-2 border-line rounded-xl px-4 py-3 text-sm bg-card-muted focus:outline-none focus:border-ink focus:bg-card transition-all resize-none"
                  />
                </div>
              </div>
            </Section>

            {/* Reset profile */}
            <div className="rounded-2xl border border-danger-line p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                <p className="text-sm font-bold text-danger">Tout remettre à zéro</p>
              </div>
              <p className="mb-4 text-sm text-ink-soft">
                Recommence l'onboarding depuis le début — utile si tu changes d'objectif (prise de
                masse → perte de poids, etc.).
              </p>
              {confirmReset ? (
                <button type="button" onClick={handleResetProfile} className="app-danger">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Confirmer la réinitialisation
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="app-secondary text-danger"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Réinitialiser mon profil
                </button>
              )}
            </div>

            {/* Enregistrer : visible uniquement quand le formulaire a changé */}
            {(hasChanges || savingProfile) && (
              <>
                <div className="h-24" aria-hidden="true" />
                <div className="app-dock fixed inset-x-0 z-55">
                  <div className="mx-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-2xl border border-line bg-card p-2 shadow-[0_8px_30px_rgba(2,6,23,0.18)]">
                    {profileError && (
                      <p role="alert" className="px-2 pb-2 pt-1 text-sm font-medium text-danger">
                        {profileError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={savingProfile}
                      className="theme-profile-save app-primary w-full"
                    >
                      {savingProfile ? (
                        "Enregistrement…"
                      ) : (
                        <>
                          <Save className="h-5 w-5" aria-hidden="true" /> Enregistrer les
                          modifications
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab Compte ── */}
        {tab === "compte" && (
          <div className="space-y-4">
            <div className="border border-line rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                Pseudo
              </p>
              <p className="text-xs text-ink-soft mb-4">
                Ce nom sera utilisé dans le message d'accueil et sur ton profil.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={nicknameDraft}
                  onChange={(e) => {
                    setNicknameDraft(e.target.value);
                    setNicknameError("");
                  }}
                  placeholder="Ex : John, Jdoe, Coach Max"
                  maxLength={32}
                  className="app-input flex-1 font-semibold"
                />
                {/* Visible seulement si le pseudo a changé (ou vient d'être enregistré). */}
                {(nicknameDraft.trim() !== (userFirstName ?? "") ||
                  nicknameSaved ||
                  savingNickname) && (
                  <button
                    type="button"
                    onClick={() => void handleSaveNickname()}
                    disabled={savingNickname || nicknameDraft.trim().length < 2}
                    className="app-primary"
                  >
                    {savingNickname ? (
                      "Enregistrement…"
                    ) : nicknameSaved ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Pseudo enregistré
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Enregistrer
                      </>
                    )}
                  </button>
                )}
              </div>

              {nicknameError && (
                <div className="mt-3 rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger">
                  {nicknameError}
                </div>
              )}
            </div>

            <div className="border border-line rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">
                Adresse e-mail
              </p>
              <p className="font-semibold text-sm text-ink">{userEmail ?? "—"}</p>
            </div>
            <div className="border border-line rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                Mot de passe
              </p>
              <p className="text-xs text-ink-soft mb-4">
                Reçois un e-mail pour réinitialiser ton mot de passe.
              </p>
              {resetSent && (
                <div
                  role="alert"
                  className="flex items-center gap-3 bg-brand-soft border border-brand-line text-ink text-sm font-medium px-4 py-3 rounded-xl mb-4"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  E-mail de réinitialisation envoyé !
                </div>
              )}
              <button
                onClick={() => {
                  if (!userEmail) return;
                  setResetPending(true);
                  setResetError("");
                  void supabase.auth
                    .resetPasswordForEmail(userEmail, {
                      redirectTo: getAppRedirectUrl("/reset-password"),
                    })
                    .then(({ error }) => {
                      if (error) throw error;
                      setResetSent(true);
                    })
                    .catch(() =>
                      setResetError("Le lien n'a pas pu être envoyé. Réessaie dans un instant."),
                    )
                    .finally(() => setResetPending(false));
                }}
                disabled={resetSent || resetPending}
                className="inline-flex items-center gap-2 bg-ink text-paper text-sm font-bold px-5 min-h-11 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Envoyer le lien de réinitialisation
              </button>
              {resetError && (
                <p className="mt-3 text-sm text-danger" role="alert">
                  {resetError}
                </p>
              )}
            </div>
            <AccountPrivacy />
            <AppVersion />
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
  summary,
  children,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  summary?: string;
  children: React.ReactNode;
}>) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-line bg-card shadow-sm"
      open={title === "Discipline et objectif"}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-5 py-3">
        <div className="text-brand" aria-hidden="true">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">{title}</h2>
          {summary && <p className="mt-0.5 break-words text-sm text-ink-soft">{summary}</p>}
        </div>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-line p-5">{children}</div>
    </details>
  );
}
