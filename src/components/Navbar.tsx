import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { Dumbbell, LayoutDashboard, Settings, LogOut, LogIn } from "lucide-react";

export default function Navbar() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch({ type: "LOGOUT" });
    void navigate("/");
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-black text-lg tracking-tight">
          <Dumbbell className="w-5 h-5" />
          SportAI
        </Link>

        <div className="flex items-center gap-1">
          {state.currentUser ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Paramètres</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
