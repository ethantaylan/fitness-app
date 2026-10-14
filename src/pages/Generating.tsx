import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useApp } from "../lib/store";
import { generateProgram } from "../lib/openai";
import type { Program, UserProfile } from "../lib/types";

const MESSAGES = [
  "Analyse de ton profil en cours…",
  "Analyse de ton objectif…",
  "Calcul des charges optimales…",
  "Construction de la progression semaine par semaine…",
  "Ajout des alternatives et conseils techniques…",
  "Rédaction des recommandations nutritionnelles…",
  "Finalisation de ton programme…",
];

export default function Generating() {
  const { state, persistProgram } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [messageIdx, setMessageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = useRef<Promise<Program> | null>(null);
  const [savingProgram, setSavingProgram] = useState(false);
  const profile = (location.state as { profile?: UserProfile } | null)?.profile ?? state.profile;
  const [logoVisible, setLogoVisible] = useState(true);

  useEffect(() => {
    const logoInterval = setInterval(() => {
      setLogoVisible((v) => !v);
    }, 1400);
    return () => clearInterval(logoInterval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let generated = false;
    setError(null);
    setMessageIdx(0);
    const interval = setInterval(() => {
      setMessageIdx((i) => (i + 1) % MESSAGES.length);
    }, 1800);

    void (async () => {
      try {
        if (!profile?.objective) {
          void navigate("/onboarding");
          return;
        }
        request.current ??= generateProgram(profile as UserProfile).catch((error) => {
          request.current = null;
          throw error;
        });
        const program = await request.current;
        generated = true;
        if (cancelled) return;
        setSavingProgram(true);
        await persistProgram({
          ...program,
          user_profile: program.user_profile ?? profile,
          generated_at: new Date().toISOString(),
        });
        if (cancelled) return;
        clearInterval(interval);
        void navigate("/result", { state: { generated: true } });
      } catch (err) {
        if (cancelled) return;
        clearInterval(interval);
        const message = generated
          ? "Ton programme a été créé, mais son enregistrement a échoué. Réessaie : la génération est conservée."
          : err instanceof Error
            ? err.message
            : "La génération n'a pas abouti. Réessaie.";
        setSavingProgram(false);
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [attempt, persistProgram, navigate, profile]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      {error ? (
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black mb-4">Oups, une erreur s'est produite</h1>
          <p className="text-gray-400 text-sm mb-2" role="alert">
            {error}
          </p>
          <button
            onClick={() => setAttempt((current) => current + 1)}
            className="mt-6 border border-white text-white font-bold px-6 py-3 rounded-xl hover:bg-white hover:text-black transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="max-w-sm text-center">
          {/* Logo pulse */}
          <div className="flex items-center justify-center mb-12">
            <img
              src={logo}
              alt="Vincere"
              className="w-24 h-24 object-contain transition-all duration-1400 ease-in-out"
              style={{
                filter: "invert(1)",
                opacity: logoVisible ? 1 : 0.15,
                transform: logoVisible ? "scale(1)" : "scale(0.88)",
              }}
            />
          </div>

          <h1 className="text-2xl font-black mb-4">Création de ton programme</h1>
          <p className="text-gray-400 text-sm mb-8 min-h-6 transition-all duration-300">
            {savingProgram ? "Enregistrement de ton programme…" : MESSAGES[messageIdx]}
          </p>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Info tags */}
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {[
              "Charges calibrées",
              "Progression adaptée",
              "Alternatives incluses",
              "Conseils nutrition",
            ].map((tag) => (
              <span
                key={tag}
                className="text-xs border border-white/20 text-white/50 rounded-full px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
