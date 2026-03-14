import { type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AppProvider } from "./lib/store";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Generating from "./pages/Generating";
import ProgramResult from "./pages/ProgramResult";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DailySession from "./pages/DailySession";
import Settings from "./pages/Settings";

import ChatWidget from "./components/ChatWidget";

function AppWithProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { userId, isLoaded } = useAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  // key forces remount (and fresh localStorage read) when the user changes
  return (
    <AppProvider key={userId ?? "anon"} userId={userId}>
      {children}
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/generating" element={<Generating />} />
          <Route path="/result" element={<ProgramResult />} />
          <Route path="/sign-in/*" element={<Login />} />
          <Route path="/sign-up/*" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/session" element={<DailySession />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatWidget />
      </AppWithProvider>
    </BrowserRouter>
  );
}
