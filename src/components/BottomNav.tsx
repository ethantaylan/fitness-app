import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LayoutDashboard, Zap, Trophy, UserCircle, Sparkles } from "lucide-react";

const HIDE_ROUTES = ["/", "/sign-in", "/sign-up", "/onboarding", "/generating"];

type Tab = {
  key: string;
  label: string;
  icon: React.ElementType;
  matchPath?: string;
  isAI?: boolean;
};

const TABS: Tab[] = [
  { key: "dashboard", label: "Accueil", icon: LayoutDashboard, matchPath: "/dashboard" },
  { key: "session", label: "Séance", icon: Zap, matchPath: "/session" },
  { key: "ai", label: "IA", icon: Sparkles, isAI: true },
  { key: "records", label: "Suivi", icon: Trophy, matchPath: "/records" },
  { key: "settings", label: "Profil", icon: UserCircle, matchPath: "/settings" },
];

export default function BottomNav() {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (
    !isSignedIn ||
    HIDE_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith(`${r}/`))
  ) {
    return null;
  }

  function handleTabClick(tab: Tab) {
    if (tab.isAI) {
      globalThis.dispatchEvent(new Event("open-Vincere-chat"));
      return;
    }
    if (tab.key === "session") {
      navigate("/session");
    } else if (tab.matchPath) {
      navigate(tab.matchPath);
    }
  }

  function isActive(tab: Tab) {
    return !tab.isAI && location.pathname === tab.matchPath;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      {/* Soft fade above bar */}
      <div
        className="absolute inset-x-0 -top-8 h-8 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.9) 0%, transparent 100%)",
        }}
      />

      <div
        className="relative bg-white/95 backdrop-blur-2xl border-t border-gray-100"
        style={{
          boxShadow: "0 -1px 0 0 rgba(0,0,0,0.04), 0 -8px 40px rgba(0,0,0,0.07)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
      >
        <div className="flex items-stretch h-15.5">
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;

            // ── Bouton IA central surelevé ──
            if (tab.isAI) {
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab)}
                  className="flex flex-col items-center justify-center gap-0.75 flex-1 relative"
                  aria-label="Ouvrir l'assistant IA"
                >
                  <div
                    className="absolute -top-5 w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.25)] active:scale-90 transition-transform duration-150"
                    style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.12)" }}
                  >
                    <Sparkles className="w-5 h-5 text-white" style={{ strokeWidth: 2 }} />
                  </div>
                  <span className="mt-9 text-[10px] leading-none font-semibold tracking-tight text-gray-400">
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center justify-center gap-0.75 flex-1 relative transition-transform duration-150 active:scale-90"
              >
                {/* Top active indicator */}
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full bg-black transition-all duration-300"
                  style={{
                    width: active ? "28px" : "0px",
                    opacity: active ? 1 : 0,
                  }}
                />

                {/* Icon container */}
                <div
                  className="rounded-[14px] flex items-center justify-center transition-all duration-200"
                  style={{
                    width: active ? "42px" : "34px",
                    height: active ? "34px" : "28px",
                    background: active ? "#000" : "transparent",
                  }}
                >
                  <Icon
                    className="transition-all duration-200"
                    style={{
                      width: "18px",
                      height: "18px",
                      color: active ? "#fff" : "#9ca3af",
                      strokeWidth: active ? 2.4 : 1.7,
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  className="text-[10px] leading-none font-semibold tracking-tight transition-colors duration-200"
                  style={{ color: active ? "#000" : "#9ca3af" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
