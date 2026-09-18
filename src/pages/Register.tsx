import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getAppRedirectUrl } from "../lib/appUrl";
import { useAuth } from "../lib/auth";
import { buildAuthPath, sanitizeNextPath } from "../lib/authRedirect";
import logoUrl from "../assets/logo.png";
import BetaBadge from "../components/BetaBadge";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const signInPath = buildAuthPath("/sign-in", nextPath);

  function signInWithGoogle() {
    supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAppRedirectUrl(nextPath) },
      })
      .catch(console.warn);
  }

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void navigate(nextPath, { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate, nextPath]);

  async function handleEmail(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAppRedirectUrl(nextPath),
      },
    });
    if (err) {
      setError(err.message);
    } else if (data.session) {
      void navigate(nextPath, { replace: true });
    } else {
      setSent(true);
      setTimeout(() => navigate(signInPath, { replace: true }), 3000);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="theme-auth-page flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="font-black text-xl mb-2">Vérifie tes emails !</h2>
          <p className="text-gray-400 text-sm">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
          </p>
        </div>
      </div>
    );
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

        <h1 className="text-center text-2xl font-black">Crée ton programme</h1>
        <p className="mb-6 mt-2 text-center text-sm leading-relaxed text-gray-500">
          Un compte suffit pour sauvegarder ton profil et retrouver ton plan partout.
        </p>

        <button
          onClick={signInWithGoogle}
          className="mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 font-semibold text-sm transition-all hover:bg-gray-50 active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuer avec Google
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">ou</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label
              htmlFor="register-email"
              className="mb-1.5 block text-xs font-bold text-gray-700"
            >
              Adresse email
            </label>
            <input
              id="register-email"
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
            <label
              htmlFor="register-password"
              className="mb-1.5 block text-xs font-bold text-gray-700"
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="6 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-gray-400">
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-600" /> Gratuit
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-600" /> Sans carte
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-600" /> Données protégées
          </span>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Déjà un compte ?{" "}
          <Link to={signInPath} className="text-black font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
