import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import SupportChat from "./SupportChat";
import Modal from "./ui/Modal";
import { useAuth } from "../lib/auth";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  const { isSignedIn } = useAuth();
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    globalThis.addEventListener("open-Vincere-chat", handleOpen);
    return () => globalThis.removeEventListener("open-Vincere-chat", handleOpen);
  }, []);
  if (
    [
      "/explore",
      "/privacy",
      "/terms",
      "/support",
      "/sign-in",
      "/sign-up",
      "/reset-password",
      "/onboarding",
      "/builder",
      "/generating",
      "/settings",
    ].includes(pathname) ||
    (pathname === "/session" && new URLSearchParams(search).has("uid"))
  )
    return null;
  return (
    <>
      <div
        className={`app-ai-trigger fixed bottom-24 right-4 z-50 md:bottom-6 md:right-6 ${isSignedIn ? "" : "hidden md:block"}`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.focus();
            setOpen(true);
          }}
          aria-label="Ouvrir l'assistant"
          aria-haspopup="dialog"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-lg"
        >
          <Sparkles size={22} />
        </button>
      </div>
      <Modal
        open={open}
        title="Assistant Vincere"
        className="contact-modal"
        onClose={() => setOpen(false)}
      >
        <div className="h-[min(520px,65dvh)]">{open && <SupportChat />}</div>
      </Modal>
    </>
  );
}
