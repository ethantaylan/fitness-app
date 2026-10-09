import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getAppRedirectUrl } from "../lib/appUrl";
import logoUrl from "../assets/logo.png";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active) setReady(!!session);
      })
      .catch(() => {
        if (active) setError("Vérifie ta connexion puis réessaie.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    setError("");
    if (ready && (password.length < 8 || password !== confirm)) {
      setError("Utilise au moins 8 caractères et deux mots de passe identiques.");
      return;
    }
    setLoading(true);
    try {
      const result = ready
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: getAppRedirectUrl("/reset-password"),
          });
      if (result.error) throw result.error;
      if (ready) {
        setDone(true);
        setPassword("");
        setConfirm("");
      } else setSent(true);
    } catch {
      setError("La demande n'a pas abouti. Vérifie ta connexion ou demande un nouveau lien.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="theme-auth-page min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md space-y-6">
        <Link to="/sign-in" className="inline-flex min-h-11 items-center gap-2 text-sm">
          <ArrowLeft size={18} /> Connexion
        </Link>
        <div className="flex items-center gap-3">
          <img src={logoUrl} className="theme-logo-adaptive h-9 w-9" alt="" />
          <span className="text-xl font-bold">Vincere</span>
        </div>
        <h1 className="text-2xl font-bold">
          {ready ? "Nouveau mot de passe" : "Mot de passe oublié"}
        </h1>
        {checking ? (
          <p role="status">Vérification…</p>
        ) : done ? (
          <div className="space-y-4" role="status">
            <CheckCircle className="text-emerald-600" />
            <p>Ton mot de passe a été mis à jour.</p>
            <Link to="/dashboard" className="app-primary">
              Continuer
            </Link>
          </div>
        ) : sent ? (
          <div className="space-y-4" role="status">
            <p>
              Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.
              Ouvre-le sur cet appareil.
            </p>
            <button className="app-secondary" onClick={() => setSent(false)}>
              Utiliser une autre adresse
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            {ready ? (
              <>
                <label className="block text-sm font-semibold" htmlFor="new-password">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    className="app-input pr-14"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center"
                    aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <label className="block text-sm font-semibold" htmlFor="confirm-password">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  className="app-input"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  Reçois un lien pour définir un nouveau mot de passe.
                </p>
                <label className="block text-sm font-semibold" htmlFor="recovery-email">
                  Adresse e-mail
                </label>
                <input
                  id="recovery-email"
                  className="app-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button type="submit" className="app-primary w-full" disabled={loading}>
              {loading ? "En cours…" : ready ? "Mettre à jour" : "Envoyer le lien"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
