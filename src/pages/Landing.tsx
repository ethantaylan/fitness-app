import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Dumbbell,
  Footprints,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";
import logoUrl from "../assets/logo.png";
import Navbar from "../components/Navbar";
import { buildAuthPath } from "../lib/authRedirect";

const SPORTS = [
  { label: "Musculation", Icon: Dumbbell, tone: "bg-violet-50 text-violet-600" },
  { label: "Running", Icon: Footprints, tone: "bg-sky-50 text-sky-600" },
  { label: "CrossFit", Icon: Activity, tone: "bg-emerald-50 text-emerald-600" },
  { label: "Hyrox", Icon: Zap, tone: "bg-orange-50 text-orange-600" },
  { label: "Yoga", Icon: Wind, tone: "bg-teal-50 text-teal-600" },
  { label: "Remise en forme", Icon: HeartPulse, tone: "bg-rose-50 text-rose-600" },
];

const FAQ = [
  {
    question: "Comment mon programme est-il créé ?",
    answer:
      "Tu renseignes ton objectif, ton niveau, ton rythme et ton matériel. Vincere transforme ces informations en un plan progressif avec des séances directement utilisables.",
  },
  {
    question: "Est-ce adapté à mon matériel ?",
    answer:
      "Oui. Salle complète, quelques haltères ou poids du corps : les exercices sont sélectionnés selon ce que tu as réellement à disposition.",
  },
  {
    question: "Puis-je récupérer mon programme en PDF ?",
    answer:
      "Oui. Le programme complet peut être exporté pour être consulté sur ton téléphone, imprimé ou partagé.",
  },
  {
    question: "Est-ce vraiment gratuit ?",
    answer:
      "La création du compte et la génération du premier programme ne demandent aucune carte bancaire. Les fonctionnalités Premium restent optionnelles.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const signUpPath = buildAuthPath("/sign-up", "/onboarding");
  const signInPath = buildAuthPath("/sign-in", "/dashboard");

  return (
    <div className="theme-public-page min-h-screen overflow-x-hidden bg-white text-gray-950">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-gray-100 px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36">
          <div className="hero-dots absolute inset-0 opacity-35" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-white to-transparent" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Programme personnalisé en moins de 2 minutes
              </div>

              <h1 className="text-4xl font-black leading-[1.04] sm:text-5xl lg:text-6xl">
                Un programme qui s’adapte à ta vraie vie.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                Ton objectif, ton niveau, ton matériel et ton emploi du temps deviennent un plan
                clair, progressif et prêt à suivre dès aujourd’hui.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate(signUpPath)}
                  className="hero-cta-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
                >
                  Créer mon programme
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#apercu"
                  className="theme-public-secondary inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Voir un exemple
                </a>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-gray-500">
                {["Compte gratuit", "Sans carte bancaire", "Export PDF inclus"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div id="apercu" className="relative scroll-mt-24">
              <div className="theme-public-glow absolute -inset-4 rounded-[28px] bg-emerald-100/50 blur-2xl" />
              <div className="theme-public-preview relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/70">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img src={logoUrl} alt="" className="theme-logo-adaptive h-8 w-8" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Ton programme</p>
                      <p className="text-[11px] text-gray-400">Objectif : forme et endurance</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    Semaine 1
                  </span>
                </div>

                <div className="p-5">
                  <div className="mb-5 grid grid-cols-3 gap-2">
                    {[
                      ["4", "séances"],
                      ["45 min", "par séance"],
                      ["6 sem.", "de programme"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-xl bg-gray-50 p-3">
                        <p className="text-base font-black">{value}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                    Prochaines séances
                  </p>
                  <div className="space-y-2.5">
                    {[
                      ["Lun", "Force bas du corps", "Squat, fentes, gainage"],
                      ["Mer", "Cardio contrôlé", "Zone 2 et intervalles"],
                      ["Sam", "Haut du corps", "Poussée, tirage, épaules"],
                    ].map(([day, title, detail], index) => (
                      <div
                        key={day}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          index === 0 ? "border-gray-900 bg-gray-950 text-white" : "border-gray-100"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                            index === 0
                              ? "theme-keep-light bg-white text-black"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {day}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-gray-400">{detail}</p>
                        </div>
                        {index === 0 && <ArrowRight className="h-4 w-4 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-100 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              Un plan pour ton sport, pas un modèle générique
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {SPORTS.map(({ label, Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-3"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="fonctionnement"
          className="scroll-mt-20 bg-gray-50 px-4 py-20 sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Simple et précis
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                De ton profil à ta première séance, sans friction.
              </h2>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 md:grid-cols-3">
              {[
                {
                  step: "01",
                  Icon: Target,
                  title: "Décris ton objectif",
                  text: "Quelques questions utiles sur ton niveau, tes disponibilités et tes contraintes.",
                },
                {
                  step: "02",
                  Icon: Sparkles,
                  title: "Reçois ton plan",
                  text: "Vincere structure tes semaines, tes séances et ta progression en quelques instants.",
                },
                {
                  step: "03",
                  Icon: TrendingUp,
                  title: "Entraîne-toi clairement",
                  text: "Chaque séance t’indique quoi faire, dans quel ordre et avec quel niveau d’effort.",
                },
              ].map(({ step, Icon, title, text }) => (
                <article key={step} className="bg-white p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-300">{step}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Ce que tu obtiens
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                Plus qu’une liste d’exercices.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500">
                Chaque détail sert une seule chose : rendre la prochaine action évidente, même au
                milieu d’une séance.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  Icon: CalendarDays,
                  title: "Semaines structurées",
                  text: "Une charge d’entraînement répartie de façon cohérente.",
                },
                {
                  Icon: Dumbbell,
                  title: "Séances détaillées",
                  text: "Exercices, séries, répétitions, tempo et récupération.",
                },
                {
                  Icon: Download,
                  title: "Export PDF",
                  text: "Ton programme disponible partout, même hors connexion.",
                },
                {
                  Icon: ShieldCheck,
                  title: "Contraintes respectées",
                  text: "Matériel, blessures et préférences pris en compte.",
                },
              ].map(({ Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-gray-200 p-6">
                  <Icon className="h-5 w-5 text-emerald-600" />
                  <h3 className="mt-6 text-base font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="tarifs"
          className="scroll-mt-20 bg-gray-950 px-4 py-20 text-white sm:px-6 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                Commence gratuitement
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight sm:text-4xl">
                Ton premier programme, sans engagement.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-400">
                Crée ton compte, complète ton profil et découvre le résultat avant de décider si tu
                veux aller plus loin.
              </p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-300">
                {["Génération personnalisée", "Programme multi-semaines", "Export PDF"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-300">Découverte</p>
                  <p className="mt-2 text-4xl font-black">0 €</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  Sans carte
                </span>
              </div>
              <button
                onClick={() => navigate(signUpPath)}
                className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-black transition-colors hover:bg-gray-100"
              >
                Commencer maintenant
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-[11px] text-gray-500">
                Création du compte en moins d’une minute
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.55fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Questions fréquentes
              </p>
              <h2 className="mt-3 text-3xl font-black">Avant de commencer.</h2>
            </div>
            <div>
              {FAQ.map(({ question, answer }, index) => {
                const open = faqOpen === index;
                return (
                  <div key={question} className="border-t border-gray-200 last:border-b">
                    <button
                      type="button"
                      onClick={() => setFaqOpen(open ? null : index)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left"
                    >
                      <span className="text-base font-bold sm:text-lg">{question}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ${
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-2xl pb-5 text-sm leading-relaxed text-gray-500">
                          {answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="theme-public-final-cta mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl bg-emerald-50 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                Prêt en quelques minutes
              </p>
              <h2 className="mt-2 text-2xl font-black text-gray-950">
                Ta prochaine séance peut être la bonne.
              </h2>
            </div>
            <button
              onClick={() => navigate(signUpPath)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-bold text-white sm:w-auto"
            >
              Créer mon programme
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt="Vincere" className="theme-logo-adaptive h-7 w-7" />
            <span className="text-sm font-black">Vincere</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-gray-500">
            <button onClick={() => navigate(signInPath)} className="hover:text-black">
              Connexion
            </button>
            <button
              onClick={() => globalThis.dispatchEvent(new Event("open-contact"))}
              className="hover:text-black"
            >
              Contact
            </button>
            <span>© 2026 Vincere</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
