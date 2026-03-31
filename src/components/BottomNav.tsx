import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  UserCircle,
  Plus,
  Sparkles,
  CalendarDays,
  Dumbbell,
  X,
} from "lucide-react";

const HIDE_ROUTES = ["/", "/sign-in", "/sign-up", "/onboarding", "/generating"];

type Tab = {
  key: string;
  label: string;
  icon: React.ElementType;
  matchPath: string;
};

type QuickAction = {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
};

const TABS: Tab[] = [
  { key: "dashboard", label: "Accueil", icon: LayoutDashboard, matchPath: "/dashboard" },
  { key: "programme", label: "Programme", icon: BookOpen, matchPath: "/result" },
  { key: "records", label: "Suivi", icon: Trophy, matchPath: "/records" },
  { key: "settings", label: "Profil", icon: UserCircle, matchPath: "/settings" },
];

export default function BottomNav() {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    setActionsOpen(false);
  }, [location.pathname, location.search]);

  if (
    !isSignedIn ||
    HIDE_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith(`${r}/`))
  ) {
    return null;
  }

  const quickActions: QuickAction[] = [
    {
      key: "bonus-session",
      label: "Séance bonus",
      description: "Ajoute une séance en plus de ton programme si tu as plus de temps.",
      icon: CalendarDays,
      action: () => {
        void navigate("/dashboard?bonus=1");
      },
    },
    {
      key: "builder",
      label: "Séance sur mesure",
      description: "Construis une séance personnalisée selon tes envies du jour.",
      icon: Dumbbell,
      action: () => {
        void navigate("/builder");
      },
    },
    {
      key: "coach",
      label: "Coach IA",
      description: "Pose une question, demande un conseil ou débloque-toi rapidement.",
      icon: Sparkles,
      action: () => {
        globalThis.dispatchEvent(new Event("open-Vincere-chat"));
      },
    },
  ];

  function isActive(tab: Tab) {
    return location.pathname === tab.matchPath;
  }

  function handleAction(action: QuickAction) {
    setActionsOpen(false);
    action.action();
  }

  return (
    <>
      {actionsOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Fermer les actions rapides"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setActionsOpen(false)}
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-gray-200 bg-[#fcfcfb] px-4 pb-6 pt-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />

            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
                  Actions rapides
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-900">Tu veux faire quoi ?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Tout ce qui n’a pas besoin d’un onglet permanent est centralisé ici.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActionsOpen(false)}
                aria-label="Fermer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => handleAction(action)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900">{action.label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-gray-500">
                        {action.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
        <div
          className="absolute inset-x-0 -top-10 h-10 pointer-events-none"
          style={{
            background: "linear-gradient(to top, var(--theme-nav-fade) 0%, transparent 100%)",
          }}
        />

        <div
          className="relative border-t border-gray-100 bg-white/95 backdrop-blur-2xl"
          style={{ boxShadow: "var(--theme-nav-shadow)" }}
        >
          <div
            className="grid grid-cols-5 items-end gap-1 px-2"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
          >
            {TABS.slice(0, 2).map((tab) => {
              const active = isActive(tab);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  onClick={() => void navigate(tab.matchPath)}
                  className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-transform duration-150 active:scale-[0.96]"
                  aria-label={tab.label}
                  style={{
                    background: active ? "var(--theme-surface-soft)" : "transparent",
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl">
                    <Icon
                      className="transition-all duration-200"
                      style={{
                        width: "17px",
                        height: "17px",
                        color: active ? "var(--theme-text)" : "var(--theme-text-soft)",
                        strokeWidth: active ? 2.2 : 1.8,
                      }}
                    />
                  </div>

                  <span
                    className="text-[10px] leading-none font-semibold tracking-tight transition-colors duration-200"
                    style={{
                      color: active ? "var(--theme-text)" : "var(--theme-text-soft)",
                    }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label="Ouvrir les actions rapides"
              className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 pb-1"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-[20px] text-white transition-transform duration-150 active:scale-[0.96]"
                style={{
                  background: "var(--theme-accent)",
                  boxShadow: "var(--theme-floating-shadow)",
                  transform: actionsOpen ? "translateY(-6px)" : "translateY(-10px)",
                }}
              >
                {actionsOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <span className="text-[10px] font-semibold leading-none text-gray-500">Plus</span>
            </button>

            {TABS.slice(2).map((tab) => {
              const active = isActive(tab);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  onClick={() => void navigate(tab.matchPath)}
                  className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-transform duration-150 active:scale-[0.96]"
                  aria-label={tab.label}
                  style={{
                    background: active ? "var(--theme-surface-soft)" : "transparent",
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl">
                    <Icon
                      className="transition-all duration-200"
                      style={{
                        width: "17px",
                        height: "17px",
                        color: active ? "var(--theme-text)" : "var(--theme-text-soft)",
                        strokeWidth: active ? 2.2 : 1.8,
                      }}
                    />
                  </div>

                  <span
                    className="text-[10px] leading-none font-semibold tracking-tight transition-colors duration-200"
                    style={{
                      color: active ? "var(--theme-text)" : "var(--theme-text-soft)",
                    }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
