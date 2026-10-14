import { useAuth } from "../lib/auth";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { buildAuthPath } from "../lib/authRedirect";
import { useApp } from "../lib/store";

export default function ProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();
  const { state, retryHydration } = useApp();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--theme-text)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!isSignedIn) {
    const nextPath = `${location.pathname}${location.search}`;
    return <Navigate to={buildAuthPath("/sign-in", nextPath)} replace />;
  }

  if (!state._hydrated)
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        Chargement de tes données…
      </div>
    );
  const cachedData = ["/dashboard", "/result"].includes(location.pathname)
    ? Boolean(state.program)
    : location.pathname === "/session"
      ? state.sessions.length > 0
      : location.pathname === "/records"
        ? state.records.length > 0
        : Boolean(state.profile?.objective);
  if (state._loadError && !cachedData)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert">{state._loadError}</p>
        <button className="app-primary" onClick={retryHydration}>
          Réessayer
        </button>
      </div>
    );

  return (
    <>
      {state._loadError && (
        <div className="mx-auto max-w-4xl px-4 pt-20">
          <p role="alert" className="text-sm">
            Affichage des données conservées sur cet appareil. La synchronisation est indisponible.
          </p>
          <button type="button" className="app-secondary mt-2" onClick={retryHydration}>
            Actualiser
          </button>
        </div>
      )}
      {children}
    </>
  );
}
