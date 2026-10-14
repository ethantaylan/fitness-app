import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Dumbbell, LayoutDashboard, TrendingUp, UserCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { selectionFeedback } from "../lib/native";

const HIDE_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/generating",
  "/reset-password",
  "/privacy",
  "/terms",
  "/support",
  "/explore",
  "/s",
];

const TABS = [
  { key: "dashboard", label: "Accueil", icon: LayoutDashboard, path: "/dashboard" },
  { key: "programme", label: "Programme", icon: BookOpen, path: "/result" },
  { key: "sessions", label: "Séances", icon: Dumbbell, path: "/session" },
  { key: "records", label: "Suivi", icon: TrendingUp, path: "/records" },
  { key: "settings", label: "Profil", icon: UserCircle, path: "/settings" },
] as const;

export default function BottomNav() {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (
    !isSignedIn ||
    HIDE_ROUTES.some(
      (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
    )
  ) {
    return null;
  }

  return (
    <nav
      className="app-bottom-nav fixed inset-x-0 bottom-0 z-50 md:hidden"
      aria-label="Navigation principale"
    >
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 h-10"
        style={{
          background: "linear-gradient(to top, var(--theme-nav-fade) 0%, transparent 100%)",
        }}
      />

      <div
        className="relative border-t border-line bg-card/95 backdrop-blur-2xl"
        style={{ boxShadow: "var(--theme-nav-shadow)" }}
      >
        <div
          className="grid grid-cols-5 gap-1 px-2 pt-1.5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}
        >
          {TABS.map(({ key, label, icon: Icon, path }) => {
            const active =
              location.pathname === path ||
              (path === "/session" && location.pathname === "/builder");

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  void selectionFeedback();
                  void navigate(path);
                }}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors active:scale-[0.97] ${
                  active ? "bg-brand-soft text-ink" : "text-ink-soft hover:bg-card-soft"
                }`}
              >
                {/* Indicateur d'état actif : barre de marque, pas seulement la couleur */}
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-full ${
                    active ? "bg-brand" : "bg-transparent"
                  }`}
                />
                <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={active ? 2.4 : 1.9} />
                <span
                  className={`block whitespace-nowrap text-[11px] leading-none ${
                    active ? "font-extrabold" : "font-semibold"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
