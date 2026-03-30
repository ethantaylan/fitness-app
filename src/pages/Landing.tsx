import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logoUrl from "../assets/logo.png";
import {
  Target,
  TrendingUp,
  Users,
  Zap,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  Timer,
  Calendar,
  Download,
  Heart,
  Flame,
  Activity,
  Wind,
  Footprints,
  Sparkles,
} from "lucide-react";
import { buildAuthPath } from "../lib/authRedirect";
import Navbar from "../components/Navbar";
import BetaBadge from "../components/BetaBadge";

const TICKER_SPORTS = [
  { label: "Musculation", Icon: Dumbbell, bg: "bg-violet-50", color: "text-violet-500" },
  { label: "Running", Icon: Footprints, bg: "bg-blue-50", color: "text-blue-500" },
  { label: "CrossFit", Icon: Activity, bg: "bg-green-50", color: "text-green-500" },
  { label: "Hyrox", Icon: Timer, bg: "bg-orange-50", color: "text-orange-500" },
  { label: "Yoga", Icon: Wind, bg: "bg-teal-50", color: "text-teal-500" },
  { label: "Perte de poids", Icon: Flame, bg: "bg-red-50", color: "text-red-500" },
  { label: "Compétition", Icon: Zap, bg: "bg-yellow-50", color: "text-yellow-500" },
  { label: "Remise en forme", Icon: Heart, bg: "bg-pink-50", color: "text-pink-500" },
];

/* duplicate for seamless loop */
const TICKER_ITEMS = [...TICKER_SPORTS, ...TICKER_SPORTS];

export default function Landing() {
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const onboardingSignUpPath = buildAuthPath("/sign-up", "/onboarding");
  const signInPath = buildAuthPath("/sign-in", "/dashboard");

  const FAQ = [
    {
      q: "Comment est généré mon programme ?",
      a: "Tu décris tes objectifs, ton niveau et tes contraintes. Notre moteur génère un programme structuré avec séances, charges, tempo et périodes de récupération — prêt en moins de 2 minutes.",
    },
    {
      q: "Est-ce que le programme s'adapte à mon matériel ?",
      a: "Oui. Tu précises si tu t'entraînes en salle, à domicile ou en extérieur. Le programme est adapté en conséquence : barres, haltères, poids du corps, kettlebell…",
    },
    {
      q: "Puis-je télécharger mon programme en PDF ?",
      a: "Oui, chaque programme généré peut être exporté en PDF en un clic. Tu peux l'emmener en salle, l'imprimer ou le partager.",
    },
    {
      q: "Quels sports sont supportés ?",
      a: "Vincere couvre 9 disciplines : musculation, running, CrossFit, Hyrox, yoga, perte de poids, remise en forme, compétition et entretien physique général.",
    },
    {
      q: "Le plan gratuit est-il vraiment illimité ?",
      a: "Oui. La génération de programmes et l’export PDF sont gratuits pour toujours. Le plan Premium ajoute le suivi de progression, les ajustements adaptatifs et les recommandations nutrition.",
    },
    {
      q: "Mes données sont-elles protégées ?",
      a: "Tes données ne sont jamais revendues ni partagées. Elles servent uniquement à personnaliser ton programme et améliorer nos modèles.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-16 px-4 sm:px-6 overflow-hidden">
        {/* Dot pattern background */}
        <div className="hero-dots absolute inset-0 opacity-40 pointer-events-none" />
        {/* Fade bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-white to-transparent pointer-events-none" />

        {/* Centre content */}
        <div className="relative w-full max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img src={logoUrl} alt="Vincere" className="theme-logo-adaptive w-16 h-16 mb-2" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-[0.3em] uppercase text-gray-400">
                Vincere
              </span>
              <BetaBadge compact />
            </div>
          </div>
          {/* H1 */}
          <h1
            className="font-black tracking-tight mb-8 wrap-break-word"
            style={{ fontSize: "clamp(2rem, 8vw, 5rem)", lineHeight: 1.05 }}
          >
            Ta meilleure version
            <br />
            commence ici.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-gray-500 max-w-xl w-full mx-auto mb-8 px-1 sm:px-0">
            Cree ton compte gratuit, decris tes objectifs et recupere un programme structure avec
            PDF, suivi et seances dans un seul espace.
          </p>
          <div className="mb-8">
            <p className="inline-flex max-w-2xl items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
              <BetaBadge compact />
              Un compte gratuit est maintenant requis pour generer, exporter ton PDF et suivre tes
              seances.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <button
              onClick={() => navigate(onboardingSignUpPath)}
              className="hero-cta-btn w-full sm:w-auto flex items-center justify-center gap-2 bg-black text-white font-bold px-7 py-3.5 rounded-full text-base hover:bg-gray-900 transition-colors"
            >
              Creer mon compte
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(signInPath)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-gray-200 font-semibold px-7 py-3.5 rounded-full text-base hover:bg-gray-50 transition-colors text-gray-700"
            >
              J'ai deja un compte
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center flex-wrap gap-2 mb-14">
            {[
              { icon: "⚡", label: "Prêt en 60 secondes" },
              { icon: "🎯", label: "100% personnalisé" },
              { icon: "🔓", label: "Gratuit" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full px-3 py-1.5"
              >
                <span>{icon}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Sport tags ticker */}
          <div className="overflow-hidden mb-14">
            <div className="hero-ticker-track">
              {TICKER_ITEMS.map(({ label, Icon, bg, color }, i) => (
                <div
                  key={`${label}-${i}`}
                  className="inline-flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-3 py-2 mx-2 whitespace-nowrap select-none"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${bg}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="min-h-screen flex items-center justify-center py-20 px-4 sm:px-6 bg-black text-white">
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-3 gap-16 items-center">
          {/* Gauche */}
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-4">En chiffres</p>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-6">
              Une plateforme taillée pour la performance.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Vincere réunit des spécialistes de chaque discipline pour t'offrir un programme de
              niveau coach, généré en quelques secondes.
            </p>
          </div>

          {/* Centre — grille stats */}
          <div className="grid grid-cols-2 gap-px bg-gray-800 border border-gray-800 rounded-2xl overflow-hidden">
            {[
              { value: "9", label: "Disciplines sportives", sub: "Du yoga au Hyrox" },
              { value: "8", label: "Coachs spécialisés", sub: "Un expert par sport" },
              { value: "∞", label: "Programmes possibles", sub: "Jamais le même deux fois" },
              { value: "~2min", label: "Pour ton programme", sub: "Prêt à l'emploi" },
            ].map(({ value, label, sub }) => (
              <div key={label} className="bg-black px-6 py-8">
                <div className="text-4xl font-black mb-1">{value}</div>
                <div className="text-sm font-semibold text-white mb-1">{label}</div>
                <div className="text-xs text-gray-500">{sub}</div>
              </div>
            ))}
          </div>

          {/* Droite */}
          <div className="space-y-6">
            {[
              {
                emoji: "🏋️",
                title: "Musculation & force",
                desc: "Charges progressives, périodisation et récupération optimisée.",
              },
              {
                emoji: "🏃",
                title: "Cardio & endurance",
                desc: "Plans structurés pour le running, le vélo et le triathlon.",
              },
              {
                emoji: "⚡",
                title: "Compétition Hyrox",
                desc: "Protocoles spécifiques pour performer le jour J.",
              },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{emoji}</span>
                <div>
                  <p className="font-bold text-sm mb-0.5">{title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="min-h-screen flex items-center justify-center py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="mb-16">
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">Ce que tu reçois</p>
            <h2 className="text-3xl sm:text-4xl font-black max-w-lg leading-tight">
              Concrètement, voici ce que Vincere génère pour toi.
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card large — Programme PDF */}
            <div className="lg:col-span-2 bg-black text-white rounded-3xl p-8 flex flex-col justify-between min-h-56">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                  Inclus gratuitement
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-black mb-2">Programme complet en PDF</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Ton plan structuré semaine par semaine, avec chaque exercice détaillé — charges,
                  séries, reps, tempo et récupération. Prêt à imprimer ou à consulter sur ton
                  téléphone.
                </p>
              </div>
            </div>

            {/* Card — 9 disciplines */}
            <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col justify-between min-h-56">
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-violet-500" />
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-black mb-2">9 disciplines sportives</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Musculation, Hyrox, running, CrossFit, yoga… chaque sport a son programme dédié.
                </p>
              </div>
            </div>

            {/* Card — Progression */}
            <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col justify-between min-h-56">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-black mb-2">Progression séance après séance</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Charges, volume et récupération calibrés pour progresser sans plateau ni blessure.
                </p>
              </div>
            </div>

            {/* Card — Expert */}
            <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col justify-between min-h-56">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-black mb-2">Expert de ta discipline</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Chaque sport a son coach dédié, conçu avec les meilleures pratiques du domaine.
                </p>
              </div>
            </div>

            {/* Card — 30s */}
            <div className="bg-black text-white rounded-3xl p-8 flex flex-col justify-between min-h-56">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div className="mt-8">
                <p className="text-5xl font-black mb-2">~2 min</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Temps moyen pour recevoir un programme complet, personnalisé.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="min-h-screen flex items-center justify-center py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">Fonctionnement</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-16 max-w-lg leading-tight">
            De zéro à ton programme en moins de deux minutes.
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-16 gap-y-14">
            {[
              {
                n: 1,
                Icon: Users,
                title: "Décris ton profil",
                desc: "Objectif, niveau, matériel disponible, fréquence d'entraînement. Un formulaire guidé de deux minutes pour que le programme te corresponde vraiment.",
              },
              {
                n: 2,
                Icon: Zap,
                title: "Génération instantanée",
                desc: "Notre moteur analyse ton profil et génère un programme structuré avec séances, exercices, charges et périodes de récupération — en moins de 2 minutes.",
              },
              {
                n: 3,
                Icon: TrendingUp,
                title: "Consultation et ajustements",
                desc: "Tu visualises ton programme complet : semaines, séances, progressions. Tu peux ajuster certains paramètres avant de finaliser.",
              },
              {
                n: 4,
                Icon: Download,
                title: "Export PDF prêt à l'emploi",
                desc: "Télécharge ton programme en PDF structuré et lisible. Emmène-le en salle, imprime-le ou garde-le sur ton téléphone.",
              },
              {
                n: 5,
                Icon: Dumbbell,
                title: "Entraîne-toi",
                desc: "Suis tes séances séquentiellement. Chaque exercice est détaillé : sets, reps, charge, tempo et temps de repos.",
              },
              {
                n: 6,
                Icon: Target,
                title: "Progresse et itère",
                desc: "Tu évolues, ton programme aussi. Regénère un programme mis à jour dès que tu changes d'objectif ou de niveau.",
              },
            ].map(({ n, Icon, title, desc }) => (
              <div key={n}>
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-sm text-gray-400 font-semibold">{n}</span>
                  <h3 className="text-xl font-black">{title}</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports grid */}
      <section className="min-h-screen flex items-center justify-center py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto w-full">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-4">
            Tous les sports. Un seul endroit.
          </h2>
          <p className="text-gray-500 text-center mb-12">
            Du débutant au compétiteur — chaque discipline a son programme dédié.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {[
              { emoji: "🏋️", label: "Muscu" },
              { emoji: "🔥", label: "Perte poids" },
              { emoji: "⚡", label: "HYROX" },
              { emoji: "🏃", label: "Running" },
              { emoji: "🤸", label: "CrossFit" },
              { emoji: "🧘", label: "Yoga" },
              { emoji: "🏆", label: "Compétition" },
              { emoji: "💪", label: "Entretien" },
              { emoji: "🌱", label: "Remise en forme" },
            ].map(({ emoji, label }) => (
              <div
                key={label}
                className="border border-gray-200 rounded-xl p-3 text-center hover:border-black hover:bg-black hover:text-white transition-all cursor-pointer group"
                onClick={() => navigate(onboardingSignUpPath)}
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-xs font-semibold leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="min-h-screen flex items-center justify-center py-20 px-4 sm:px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Commence aujourd'hui.
            <br />
            <span className="text-gray-400">Pas demain.</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Le meilleur programme, c'est celui que tu suis. On s'assure qu'il soit taillé pour tes
            objectifs, ton niveau, et ton quotidien.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="border border-gray-700 rounded-2xl p-6 min-w-64">
              <div className="text-2xl font-black">Gratuit</div>
              <div className="text-sm text-gray-400 mb-4">Pour toujours</div>
              <ul className="text-sm space-y-2 text-left mb-6">
                {[
                  "Génération programme PDF",
                  "Tous types de programmes",
                  "Export téléchargeable",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(onboardingSignUpPath)}
                className="w-full border border-white text-white font-bold py-2 rounded-xl hover:bg-white hover:text-black transition-colors"
              >
                Commencer
              </button>
            </div>
            <div className="border-2 border-white rounded-2xl p-6 min-w-64 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-black px-3 py-1 rounded-full">
                RECOMMANDÉ
              </div>
              <div className="text-2xl font-black">
                9,99€ <span className="text-base font-normal text-gray-400">/mois</span>
              </div>
              <div className="text-sm text-gray-400 mb-4">Abonnement Premium</div>
              <ul className="text-sm space-y-2 text-left mb-6">
                {[
                  "Tout le plan Gratuit",
                  "Séances quotidiennes adaptatives",
                  "Suivi de progression",
                  "Ajustement selon feedback",
                  "Recommandations nutrition",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(onboardingSignUpPath)}
                className="w-full bg-white text-black font-bold py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Créer un compte
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="min-h-screen flex items-center justify-center py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-sm text-gray-400 mb-8 tracking-wide uppercase">FAQ</p>
          <div>
            {FAQ.map(({ q, a }, i) => (
              <div key={q} className="border-t border-gray-200 last:border-b">
                <button
                  className="w-full flex items-center justify-between py-6 text-left group"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  <span className="text-2xl sm:text-3xl font-bold text-black pr-8 leading-tight">
                    {q}
                  </span>
                  <ChevronDown
                    className={`shrink-0 w-5 h-5 transition-transform duration-300 ${
                      faqOpen === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    faqOpen === i ? "max-h-40 pb-6" : "max-h-0"
                  }`}
                >
                  <p className="text-gray-500 text-base leading-relaxed">{a}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Assistant CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-5 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-black rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base leading-tight">
                  Tu ne trouves pas ta réponse&nbsp;?
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Notre assistant IA répond à toutes tes questions en temps réel.
                </p>
              </div>
            </div>
            <button
              onClick={() => globalThis.dispatchEvent(new Event("open-Vincere-chat"))}
              className="shrink-0 flex items-center gap-2 bg-black text-white text-sm font-bold px-5 py-3 rounded-full hover:bg-gray-800 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Demander à l'assistant
            </button>
          </div>{" "}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white px-4 sm:px-6 pt-16 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Top row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-gray-800">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img
                  src={logoUrl}
                  alt="Vincere"
                  className="w-8 h-8 rounded-lg"
                  style={{ filter: "invert(1)" }}
                />
                <span className="font-black text-lg">Vincere</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Génère ton programme d'entraînement sur mesure en moins de 2 minutes. Structuré,
                progressif, prêt à l'emploi.
              </p>
              <button
                onClick={() => navigate(onboardingSignUpPath)}
                className="text-sm font-bold bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                Créer mon programme →
              </button>
            </div>

            {/* Disciplines */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
                Disciplines
              </p>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {[
                  "Musculation",
                  "Running",
                  "CrossFit",
                  "Hyrox",
                  "Perte de poids",
                  "Yoga",
                  "Remise en forme",
                ].map((d) => (
                  <li key={d}>
                    <button
                      onClick={() => navigate(onboardingSignUpPath)}
                      className="hover:text-white transition-colors"
                    >
                      {d}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Produit */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
                Produit
              </p>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {[
                  { label: "Générer un programme", path: onboardingSignUpPath },
                  { label: "Connexion", path: "/sign-in" },
                  { label: "Créer un compte", path: "/sign-up" },
                  { label: "Mon dashboard", path: "/dashboard" },
                ].map(({ label, path }) => (
                  <li key={label}>
                    <button
                      onClick={() => navigate(path)}
                      className="hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Infos */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
                Informations
              </p>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <button
                    onClick={() => globalThis.dispatchEvent(new Event("open-contact"))}
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </button>
                </li>
              </ul>
              <div className="mt-8 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Timer className="w-3.5 h-3.5 shrink-0" />
                  Programme généré en ~2 minutes
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  Séances structurées semaine par semaine
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  Export PDF inclus
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-gray-600">
            <p>© 2026 Vincere. Les recommandations sont fournies à titre informatif uniquement.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
