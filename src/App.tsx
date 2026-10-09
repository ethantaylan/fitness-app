import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppProvider } from "./lib/store";
import { sanitizeNextPath } from "./lib/authRedirect";
const Landing = lazy(() => import("./pages/Landing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Generating = lazy(() => import("./pages/Generating"));
const ProgramResult = lazy(() => import("./pages/ProgramResult"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DailySession = lazy(() => import("./pages/DailySession"));
const Settings = lazy(() => import("./pages/Settings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const WorkoutBuilder = lazy(() => import("./pages/WorkoutBuilder"));
const SharedSession = lazy(() => import("./pages/SharedSession"));
const Records = lazy(() => import("./pages/Records"));

import ChatWidget from "./components/ChatWidget";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import NativeLifecycle from "./components/NativeLifecycle";
import AIConsentDialog from "./components/AIConsentDialog";
const Legal = lazy(() => import("./pages/Legal"));
const Explore = lazy(() => import("./pages/Explore"));
import { isNativeApp } from "./lib/native";

function HomeRoute() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return isNativeApp ? <Navigate to="/explore" replace /> : <Landing />;
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
      <NativeLifecycle />
      <AIConsentDialog />
      <AppWithProvider>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center text-sm" role="status">
              Chargement...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/privacy" element={<Legal />} />
            <Route path="/terms" element={<Legal />} />
            <Route path="/support" element={<Legal />} />
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
        </Suspense>
        <ChatWidget />
        <BottomNav />
      </AppWithProvider>
    </BrowserRouter>
  );
}
