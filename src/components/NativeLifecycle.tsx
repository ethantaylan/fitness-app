import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { WifiOff, X } from "lucide-react";
import { isNativeApp } from "../lib/native";
import { parseNativeAuthUrl } from "../lib/nativeAuth";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";

export default function NativeLifecycle() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState("");

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const syncError = () =>
      setError(
        "La sauvegarde en ligne n'a pas abouti. Tes changements restent visibles sur cet appareil.",
      );
    window.addEventListener("app-sync-error", syncError);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("app-sync-error", syncError);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!isNativeApp) return;
    let disposed = false;
    const cleanup: Array<() => void> = [];
    const handledCodes = new Set<string>();
    async function initialize() {
      const [{ App }, { Keyboard }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/keyboard"),
        import("@capacitor/splash-screen"),
      ]);
      const handleUrl = async (url: string) => {
        const callback = parseNativeAuthUrl(url);
        if (!callback || handledCodes.has(callback.code) || disposed) return;
        handledCodes.add(callback.code);
        const { error: authError } = await supabase.auth.exchangeCodeForSession(callback.code);
        if (disposed) return;
        if (authError) {
          setError(
            "Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien depuis cet appareil.",
          );
          return;
        }
        void navigate(callback.next, { replace: true });
      };
      const handles = await Promise.all([
        App.addListener("appUrlOpen", ({ url }) => {
          void handleUrl(url);
        }),
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void supabase.auth.startAutoRefresh();
          else void supabase.auth.stopAutoRefresh();
        }),
        Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => {
          document.documentElement.dataset.keyboard = "open";
          document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
          window.setTimeout(() => {
            const activeElement = document.activeElement;
            // Dans une fenêtre (assistant), le panneau suit déjà le viewport : ne pas faire défiler.
            if (activeElement instanceof HTMLElement && !activeElement.closest("dialog")) {
              activeElement.scrollIntoView({ block: "center", behavior: "smooth" });
            }
          }, 120);
        }),
        Keyboard.addListener("keyboardWillHide", () => {
          delete document.documentElement.dataset.keyboard;
          document.documentElement.style.removeProperty("--keyboard-height");
        }),
      ]);
      handles.forEach((handle) => {
        if (disposed) void handle.remove();
        else
          cleanup.push(() => {
            void handle.remove();
          });
      });
      const launch = await App.getLaunchUrl();
      if (launch) await handleUrl(launch.url);
      await SplashScreen.hide();
    }
    void initialize()
      .catch(() => setError("Une fonction de l'appareil n'a pas pu démarrer. Relance Vincere."))
      .finally(() => {
        void import("@capacitor/splash-screen")
          .then(({ SplashScreen }) => SplashScreen.hide())
          .catch(() => undefined);
      });
    return () => {
      disposed = true;
      cleanup.forEach((dispose) => dispose());
      delete document.documentElement.dataset.keyboard;
      document.documentElement.style.removeProperty("--keyboard-height");
    };
  }, [navigate]);

  useEffect(() => {
    if (!isNativeApp) return;
    void import("@capacitor/status-bar")
      .then(({ StatusBar, Style }) =>
        StatusBar.setStyle({ style: resolvedTheme === "dark" ? Style.Dark : Style.Light }),
      )
      .catch(() => undefined);
  }, [resolvedTheme]);

  if (!offline && !error) return null;
  return (
    <div className="connection-status" role="status">
      <WifiOff size={18} aria-hidden="true" />
      <span>{error || "Hors connexion : tes séances enregistrées restent consultables."}</span>
      {error && (
        <button type="button" aria-label="Fermer le message" onClick={() => setError("")}>
          <X size={18} />
        </button>
      )}
    </div>
  );
}
