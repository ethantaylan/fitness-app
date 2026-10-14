import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import SupportChat from "./SupportChat";
import Modal from "./ui/Modal";
import { useAuth } from "../lib/auth";

const GUEST_HIDDEN_PATHS = [
  "/explore",
  "/privacy",
  "/terms",
  "/support",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/onboarding",
  "/generating",
];

/**
 * Aligne le panneau sur le viewport visuel : avec le clavier mobile ouvert, l'en-tête reste
 * visible et la zone de saisie reste au-dessus du clavier.
 */
function useVisualViewport(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    let lastHeight = -1;
    let lastTop = -1;
    // Un seul calcul par image : le clavier iOS émet des dizaines d'événements pendant son animation.
    const write = () => {
      frame = 0;
      const height = Math.round(viewport?.height ?? window.innerHeight);
      const top = Math.round(viewport?.offsetTop ?? 0);
      if (height !== lastHeight) root.style.setProperty("--app-vh", `${height}px`);
      if (top !== lastTop) root.style.setProperty("--app-vv-top", `${top}px`);
      lastHeight = height;
      lastTop = top;
    };
    const apply = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    write();
    viewport?.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
      root.style.removeProperty("--app-vh");
      root.style.removeProperty("--app-vv-top");
    };
  }, [active]);
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { isSignedIn } = useAuth();
  useVisualViewport(open);
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    globalThis.addEventListener("open-Vincere-chat", handleOpen);
    return () => globalThis.removeEventListener("open-Vincere-chat", handleOpen);
  }, []);
  // Connecté : l'assistant s'ouvre depuis l'en-tête, jamais depuis un bouton flottant qui
  // recouvrirait le contenu. Le raccourci flottant ne reste que sur les pages publiques larges.
  const showGuestShortcut = !isSignedIn && !GUEST_HIDDEN_PATHS.includes(pathname);
  return (
    <>
      {showGuestShortcut && (
        <div className="app-ai-trigger fixed bottom-6 right-6 z-50 hidden md:block">
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.focus();
              setOpen(true);
            }}
            aria-label="Ouvrir l'assistant"
            aria-haspopup="dialog"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-line-strong bg-card text-ink shadow-lg"
          >
            <Sparkles size={20} aria-hidden="true" />
          </button>
        </div>
      )}
      <Modal
        open={open}
        title="Assistant Vincere"
        className="app-chat-modal"
        onClose={() => setOpen(false)}
      >
        {open && (
          <SupportChat
            onContact={() => {
              setOpen(false);
              globalThis.dispatchEvent(new Event("open-contact"));
            }}
          />
        )}
      </Modal>
    </>
  );
}
