import { createRoot } from "react-dom/client";
import { AuthProvider } from "./lib/auth";
import { applyThemeMode, readStoredThemeMode, ThemeProvider } from "./lib/theme";
import "./index.css";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import { isNativeApp } from "./lib/native";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";

if (isNativeApp) document.documentElement.dataset.platform = "native";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });

  void caches.keys().then((keys) => {
    keys.forEach((key) => {
      void caches.delete(key);
    });
  });
}

if (import.meta.env.PROD && !isNativeApp && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}

applyThemeMode(readStoredThemeMode());

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </ThemeProvider>,
);
