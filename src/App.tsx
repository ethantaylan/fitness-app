import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/generating" element={<Generating />} />
          <Route path="/result" element={<ProgramResult />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/session" element={<DailySession />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
