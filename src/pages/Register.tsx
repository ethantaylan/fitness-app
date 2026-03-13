import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { useApp, registerUser } from "../lib/store";

export default function Register() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (state.currentUser) {
    void navigate("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const user = registerUser(email.trim(), password);
      if (!user) {
        setError("Cet email est déjà utilisé. Connecte-toi à la place.");
        return;
      }
      dispatch({ type: "SET_USER", user });
      // If a program was already generated anonymously, redirect to result
      if (state.program) {
        void navigate("/result");
      } else if (state.profile?.objective) {
        void navigate("/generating");
      } else {
        void navigate("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 font-black text-xl justify-center mb-10">
          <Dumbbell className="w-6 h-6" />
          SportAI
        </Link>

        <h1 className="text-2xl font-black mb-1">Crée ton compte 🚀</h1>
        <p className="text-gray-500 text-sm mb-8">
          Débloque les séances quotidiennes et le suivi de progression.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black"
              placeholder="toi@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-black"
                placeholder="6 caractères minimum"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Confirmer le mot de passe</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {loading ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-5 p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
          <strong className="text-black">Inclus dans le compte :</strong>
          <ul className="mt-2 space-y-1">
            {[
              "Séances quotidiennes adaptatives",
              "Suivi de progression",
              "Feedback → ajustement IA",
              "Historique des séances",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-green-500">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{" "}
          <Link to="/login" className="font-semibold text-black underline underline-offset-2">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
