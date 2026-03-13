import { useNavigate } from "react-router-dom";
import {
  Target,
  TrendingUp,
  Users,
  Zap,
  ChevronRight,
  Dumbbell,
  Timer,
  Calendar,
  Download,
} from "lucide-react";
import Navbar from "../components/Navbar";

const FEATURES = [
  {
    icon: Target,
    title: "9 types de programmes",
    desc: "Musculation, running, Hyrox, CrossFit, yoga, perte de poids… tout y est.",
  },
  {
    icon: Zap,
    title: "Agents IA spécialisés",
    desc: "Chaque discipline a son agent dédié, entraîné avec les meilleures pratiques.",
  },
  {
    icon: TrendingUp,
    title: "Suivi adaptatif",
    desc: "Séances quotidiennes qui s'ajustent selon ton feedback et ta progression.",
  },
  {
    icon: Download,
    title: "Export PDF",
    desc: "Ton programme complet en PDF, propre et téléchargeable, prêt pour la salle.",
  },
];

const STEPS = [
  {
    number: "01",
    icon: Users,
    title: "Dis-nous qui tu es",
    desc: "Remplis un formulaire rapide : objectif, niveau, matériel, préférences.",
  },
  {
    number: "02",
    icon: Zap,
    title: "L'IA génère ton programme",
    desc: "Ton coach IA spécialisé analyse ton profil et construit un programme sur mesure.",
  },
  {
    number: "03",
    icon: Dumbbell,
    title: "Entraîne-toi & progresse",
    desc: "Télécharge ton PDF ou suis tes séances directement dans l'app.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full mb-8">
            <Zap className="w-3 h-3" />
            Propulsé par GPT-4o
          </span>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6">
            Ton coach IA.
            <br />
            <span className="text-gray-400">Ton programme.</span>
            <br />
            Zéro bullshit.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Réponds à quelques questions, notre IA génère un programme sportif 100% personnalisé
            avec charges, progressions et conseils nutritionnels. En 30 secondes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/onboarding")}
              className="flex items-center gap-2 bg-black text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-900 transition-colors"
            >
              Générer mon programme
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 border border-gray-300 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-gray-50 transition-colors"
            >
              J'ai déjà un compte
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Aucun compte requis pour générer un programme PDF
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "9", label: "Types de sports" },
            { value: "8", label: "Agents IA spécialisés" },
            { value: "∞", label: "Programmes possibles" },
            { value: "30s", label: "Génération moyenne" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-black">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-4">
            Tout ce dont tu as besoin
          </h2>
          <p className="text-gray-500 text-center mb-12">
            Plus besoin de passer des heures à chercher comment structurer ta semaine.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="border border-gray-200 rounded-2xl p-6 hover:border-black transition-colors"
              >
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-12">Comment ça marche</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map(({ number, icon: Icon, title, desc }) => (
              <div key={number} className="text-center">
                <div className="relative inline-flex mb-6">
                  <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-white border border-gray-200 text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
                    {number}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports grid */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-4">
            Tous les sports, un seul coach
          </h2>
          <p className="text-gray-500 text-center mb-12">
            Chaque discipline a son agent IA entraîné spécifiquement.
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
                onClick={() => navigate("/onboarding")}
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-xs font-semibold leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="py-20 px-4 sm:px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Prêt à passer au niveau supérieur ?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Crée un compte gratuit pour débloquer les séances quotidiennes adaptatives, le suivi de
            progression et les recommandations personnalisées.
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
                onClick={() => navigate("/onboarding")}
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
                10€ <span className="text-base font-normal text-gray-400">/mois</span>
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
                onClick={() => navigate("/register")}
                className="w-full bg-white text-black font-bold py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Créer un compte
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4" />
          <span className="font-bold text-black">SportAI</span>
        </div>
        <p>
          © {new Date().getFullYear()} SportAI · Les recommandations sont à titre informatif
          uniquement.
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" /> Généré en 30 secondes
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Séances quotidiennes
          </span>
        </div>
      </footer>
    </div>
  );
}
