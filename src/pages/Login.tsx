import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { useApp, loginUser } from "../lib/store";

export default function Login() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in
  if (state.currentUser) {
    void navigate("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = loginUser(email.trim(), password);
      if (!user) {
        setError("Email ou mot de passe incorrect.");
        return;
      }
      dispatch({ type: "SET_USER", user });
      void navigate(state.program ? "/result" : "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-black text-xl justify-center mb-10">
          <Dumbbell className="w-6 h-6" />
          SportAI
        </Link>

        <h1 className="text-2xl font-black mb-1">Bon retour 👋</h1>
        <p className="text-gray-500 text-sm mb-8">Connecte-toi pour accéder à tes séances.</p>

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
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-black"
                placeholder="••••••••"
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
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{" "}
          <Link to="/register" className="font-semibold text-black underline underline-offset-2">
            Créer un compte
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          Ou{" "}
          <Link to="/onboarding" className="font-semibold text-black underline underline-offset-2">
            générer un programme sans compte
          </Link>
        </p>
      </div>
    </div>
  );
}
