import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getAppRedirectUrl } from "../lib/appUrl";
import { useAuth } from "../lib/auth";
import { buildAuthPath, sanitizeNextPath } from "../lib/authRedirect";
import logoUrl from "../assets/logo.png";
import BetaBadge from "../components/BetaBadge";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
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
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="font-black text-xl mb-2">Verifie tes emails !</h2>
          <p className="text-gray-400 text-sm">
            Un lien de confirmation a ete envoye a <strong>{email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <img src={logoUrl} alt="Vincere" className="theme-logo-adaptive w-9 h-9 rounded-xl" />
          <span className="font-black text-xl">Vincere</span>
          <BetaBadge compact />
        </Link>

        <h1 className="text-2xl font-black text-center mb-1">Créer un compte</h1>
        <p className="text-gray-400 text-sm text-center mb-8">
          Ton compte gratuit te donne acces au programme, au PDF et au suivi.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3.5 font-semibold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all mb-6"
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

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">ou</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-black transition-colors"
          />
          <input
            type="password"
            placeholder="Mot de passe (min. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-black transition-colors"
          />
          {error && <p className="text-red-500 text-xs px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Deja un compte ?{" "}
          <Link to={signInPath} className="text-black font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
