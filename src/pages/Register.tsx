import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getAppRedirectUrl } from "../lib/appUrl";
import { useAuth } from "../lib/auth";
import { buildAuthPath, sanitizeNextPath } from "../lib/authRedirect";
import logoUrl from "../assets/logo.png";
import BetaBadge from "../components/BetaBadge";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import SocialAuthButtons from "../components/SocialAuthButtons";
import { LEGAL_VERSION } from "../lib/legal";

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
        data: { terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() },
      },
    });
    if (err) {
      setError(err.message);
    } else if (data.session) {
      void navigate(nextPath, { replace: true });
    } else {
      setSent(true);
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
          <p className="mt-3 text-sm text-gray-500">
            Ouvre le lien sur l'appareil utilisé pour ton inscription.
          </p>
          <Link to={signInPath} className="app-secondary mt-6">
            Revenir à la connexion
          </Link>
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

        <SocialAuthButtons
          nextPath={nextPath}
          disabled={loading}
          onBusyChange={setLoading}
          onError={setError}
        />
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
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" required className="mt-1 h-5 w-5 shrink-0 accent-black" />
            <span>
              J'accepte les{" "}
              <Link className="underline" to="/terms" target="_blank">
                conditions d'utilisation
              </Link>{" "}
              et j'ai lu la{" "}
              <Link className="underline" to="/privacy" target="_blank">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
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
