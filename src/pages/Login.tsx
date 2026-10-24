import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { buildAuthPath, sanitizeNextPath } from "../lib/authRedirect";
import logoUrl from "../assets/logo.png";
import BetaBadge from "../components/BetaBadge";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import SocialAuthButtons from "../components/SocialAuthButtons";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const signUpPath = buildAuthPath("/sign-up", nextPath);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void navigate(nextPath, { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate, nextPath]);

  async function handleEmail(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError("Email ou mot de passe incorrect.");
    } else {
      void navigate(nextPath, { replace: true });
    }
    setLoading(false);
  }

  return (
    <div className="theme-auth-page relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 py-10">
      <div className="hero-dots absolute inset-0 opacity-25" aria-hidden="true" />
      <Link
        to="/"
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:text-black sm:left-6 sm:top-6"
        aria-label="Retour à l'accueil"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="theme-auth-card relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-200/50 sm:p-8">
        <Link to="/" className="mb-7 flex items-center justify-center gap-2">
          <img src={logoUrl} alt="" className="theme-logo-adaptive h-9 w-9" />
          <span className="font-black text-xl">Vincere</span>
          <BetaBadge compact />
        </Link>

        <h1 className="text-center text-2xl font-black">Content de te revoir</h1>
        <p className="mb-7 mt-2 text-center text-sm leading-relaxed text-gray-500">
          Connecte-toi pour retrouver ton programme et suivre ta progression.
        </p>

        <SocialAuthButtons
          nextPath={nextPath}
          disabled={loading}
          onBusyChange={setLoading}
          onError={setError}
        />
        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-gray-700">
              Adresse email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="toi@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-12 w-full rounded-xl border border-gray-200 px-4 text-sm transition-colors focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="text-xs font-bold text-gray-700">
                Mot de passe
              </label>
              <Link
                to="/reset-password"
                className="text-xs font-semibold text-gray-500 hover:text-black"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Ton mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="min-h-12 w-full rounded-xl border border-gray-200 px-4 pr-12 text-sm transition-colors focus:border-black focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-black"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-black text-sm font-bold text-white transition-all hover:bg-gray-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Pas de compte ?{" "}
          <Link to={signUpPath} className="text-black font-semibold hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
