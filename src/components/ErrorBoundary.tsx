import { Component, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { supportEmail } from "../lib/legal";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-5">
          <h1 className="text-2xl font-bold">Vincere n'a pas pu ouvrir cette page</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Relance l'application. Si le problème persiste, contacte le support.
          </p>
          <button className="app-primary" onClick={() => window.location.assign("/")}>
            <RotateCcw size={18} /> Revenir à l'accueil
          </button>
          <p>
            <a className="text-sm underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </p>
        </div>
      </main>
    );
  }
}
