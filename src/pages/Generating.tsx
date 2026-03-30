import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useApp } from "../lib/store";
import { generateProgram } from "../lib/openai";
import { normalizeProgramWeeks } from "../lib/program";
import type { UserProfile } from "../lib/types";

const MESSAGES = [
  "Analyse de ton profil en cours…",
  "Sélection de l'agent IA spécialisé…",
  "Calcul des charges optimales…",
  "Construction de la progression semaine par semaine…",
  "Ajout des alternatives et conseils techniques…",
  "Rédaction des recommandations nutritionnelles…",
  "Finalisation de ton programme…",
];

export default function Generating() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [messageIdx, setMessageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);
  const [logoVisible, setLogoVisible] = useState(true);

  useEffect(() => {
    const logoInterval = setInterval(() => {
      setLogoVisible((v) => !v);
    }, 1400);
    return () => clearInterval(logoInterval);
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Cycle through loading messages
    const interval = setInterval(() => {
      setMessageIdx((i) => (i + 1) % MESSAGES.length);
    }, 1800);

    // Launch generation
    void (async () => {
      try {
        if (!state.profile?.objective) {
          void navigate("/onboarding");
          return;
        }
        const program = await generateProgram(state.profile as UserProfile);
        dispatch({ type: "SET_PROGRAM", program: normalizeProgramWeeks(program) });
        clearInterval(interval);
        void navigate("/result");
      } catch (err) {
        clearInterval(interval);
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
      }
    })();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      {error ? (
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black mb-4">Oups, une erreur s'est produite</h1>
          <p className="text-gray-400 text-sm mb-2">{error}</p>
          {error.includes("VITE_OPENAI_API_KEY") && (
            <p className="text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 mt-4 text-left">
              💡 <strong>Pour développeurs :</strong> Crée un fichier{" "}
              <code className="font-mono">.env</code> à la racine du projet avec :
              <br />
              <code className="font-mono mt-2 block">VITE_OPENAI_API_KEY=sk-...</code>
            </p>
          )}
          <button
            onClick={() => navigate("/onboarding")}
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

          <h1 className="text-2xl font-black mb-4">Ton coach travaille pour toi</h1>
          <p className="text-gray-400 text-sm mb-8 min-h-6 transition-all duration-300">
            {MESSAGES[messageIdx]}
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
