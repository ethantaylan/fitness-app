import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Dumbbell, LayoutDashboard, Trophy, UserCircle } from "lucide-react";
import { useAuth } from "../lib/auth";

const HIDE_ROUTES = ["/", "/sign-in", "/sign-up", "/onboarding", "/generating"];

const TABS = [
  { key: "dashboard", label: "Accueil", icon: LayoutDashboard, path: "/dashboard" },
  { key: "programme", label: "Programme", icon: BookOpen, path: "/result" },
  { key: "sessions", label: "Entraînements", icon: Dumbbell, path: "/session" },
  { key: "records", label: "Suivi", icon: Trophy, path: "/records" },
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
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden" aria-label="Navigation principale">
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 h-10"
        style={{
          background: "linear-gradient(to top, var(--theme-nav-fade) 0%, transparent 100%)",
        }}
      />

      <div
        className="relative border-t border-gray-100 bg-white/95 backdrop-blur-2xl"
        style={{ boxShadow: "var(--theme-nav-shadow)" }}
      >
        <div
          className="grid grid-cols-5 gap-1 px-2 pt-1.5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 9px)" }}
        >
          {TABS.map(({ key, label, icon: Icon, path }) => {
            const active = location.pathname === path;

            return (
              <button
                key={key}
                type="button"
                onClick={() => void navigate(path)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 transition-transform active:scale-[0.96]"
                style={{ background: active ? "var(--theme-surface-soft)" : "transparent" }}
              >
                <Icon
                  className="h-[18px] w-[18px] transition-colors"
                  style={{
                    color: active ? "var(--theme-text)" : "var(--theme-text-soft)",
                    strokeWidth: active ? 2.3 : 1.8,
                  }}
                />
                <span
                  className="block w-full truncate text-[9px] font-semibold leading-none"
                  style={{ color: active ? "var(--theme-text)" : "var(--theme-text-soft)" }}
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
