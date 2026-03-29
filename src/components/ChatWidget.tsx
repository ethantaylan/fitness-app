import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import SupportChat from "./SupportChat";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const { pathname } = useLocation();

  useEffect(() => {
    function handleOpen() {
      setPulse(false);
      setOpen(true);
    }
    globalThis.addEventListener("open-Vincere-chat", handleOpen);
    return () => globalThis.removeEventListener("open-Vincere-chat", handleOpen);
  }, []);

  function toggle() {
    if (!open) setPulse(false);
    setOpen((v) => !v);
  }

  if (pathname === "/onboarding") return null;

  return (
    <>
      {/* ── Floating button — masqué sur mobile (dans BottomNav) ── */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        {/* Main FAB */}
        <button
          onClick={() => toggle()}
          aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant IA"}
          className="relative w-14 h-14 bg-black text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          {/* Pulse ring (shown until first open) */}
          {pulse && (
            <>
              <span className="absolute inset-0 rounded-2xl bg-black opacity-30 animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
            </>
          )}

          {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Chat panel ── */}
      <div
        className={`fixed md:bottom-24 bottom-22 right-6 z-50 w-[min(420px,calc(100vw-3rem))] bg-[#0e0e0e] rounded-3xl shadow-2xl border border-white/8 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ height: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="theme-keep-light w-8 h-8 bg-white rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0e0e0e]" />
            </div>
            <div>
              <p className="text-white text-sm font-black leading-none">Vincere Assistant</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Toujours disponible</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat body */}
        <div className="flex-1 min-h-0">{open && <SupportChat />}</div>
      </div>
    </>
  );
}
