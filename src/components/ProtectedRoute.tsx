import { useAuth } from "../lib/auth";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { buildAuthPath } from "../lib/authRedirect";

export default function ProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();

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

  return <>{children}</>;
}
