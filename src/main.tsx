import { createRoot } from "react-dom/client";
import { AuthProvider } from "./lib/auth";
import "./index.css";
import App from "./App.tsx";

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
