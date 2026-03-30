import { type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppProvider } from "./lib/store";
import { sanitizeNextPath } from "./lib/authRedirect";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Generating from "./pages/Generating";
import ProgramResult from "./pages/ProgramResult";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DailySession from "./pages/DailySession";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import WorkoutBuilder from "./pages/WorkoutBuilder";
import SharedSession from "./pages/SharedSession";
import Records from "./pages/Records";

import ChatWidget from "./components/ChatWidget";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";

function HomeRoute() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function PublicOnlyRoute({ children }: Readonly<{ children: ReactNode }>) {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const nextPath = sanitizeNextPath(new URLSearchParams(location.search).get("next"));

  if (isSignedIn) {
    return <Navigate to={nextPath} replace />;
  }

  return <>{children}</>;
}

function AppWithProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { userId, isLoaded, userEmail, userFirstName } = useAuth();

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

  // key forces remount (and fresh state) when the user changes
  return (
    <AppProvider
      key={userId ?? "anon"}
      userId={userId}
      userEmail={userEmail}
      userFirstName={userFirstName}
    >
      {children}
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/generating"
            element={
              <ProtectedRoute>
                <Generating />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sign-in/*"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/s" element={<SharedSession />} />
          <Route
            path="/builder"
            element={
              <ProtectedRoute>
                <WorkoutBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session"
            element={
              <ProtectedRoute>
                <DailySession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result"
            element={
              <ProtectedRoute>
                <ProgramResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/records"
            element={
              <ProtectedRoute>
                <Records />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatWidget />
        <BottomNav />
      </AppWithProvider>
    </BrowserRouter>
  );
}
