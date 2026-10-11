import { Link } from "react-router-dom";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import logoUrl from "../assets/logo.png";

export default function Explore() {
  const { resolvedTheme, setThemeMode } = useTheme();
  return (
    <main className="guest-workout mx-auto flex min-h-screen max-w-2xl flex-col px-5 pb-12">
      <header className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-2">
          <img className="theme-logo-adaptive h-9 w-9" src={logoUrl} alt="" />
          <h1 className="text-2xl font-bold">Vincere</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="app-icon-button"
            aria-label={
              resolvedTheme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"
            }
            onClick={() => setThemeMode(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <Link to="/sign-in" className="text-sm font-semibold py-3">
            Connexion
          </Link>
        </div>
      </header>
      <section className="flex flex-1 flex-col justify-center border-t border-gray-200 py-12">
        <p className="text-sm font-bold uppercase text-emerald-600">Ton entraînement, structuré</p>
        <h2 className="mt-3 text-4xl font-black leading-tight">
          Construis un programme qui suit ton objectif.
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-gray-500">
          Crée ton profil sportif, génère un programme cohérent et retrouve chaque séance au même
          endroit.
        </p>
        <div className="mt-8 grid gap-3">
          <Link to="/sign-up?next=%2Fonboarding" className="app-primary w-full">
            Créer mon programme <ArrowRight size={18} />
          </Link>
          <Link to="/sign-in" className="app-secondary w-full">
            J'ai déjà un compte
          </Link>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-gray-500">
          Adapte l'effort à tes capacités. Arrête en cas de douleur et consulte un professionnel en
          cas de doute.
        </p>
      </section>
      <nav className="mt-6 flex flex-wrap gap-5 text-xs underline" aria-label="Informations">
        <Link to="/privacy">Confidentialité</Link>
        <Link to="/terms">Conditions</Link>
        <Link to="/support">Assistance</Link>
      </nav>
    </main>
  );
}
