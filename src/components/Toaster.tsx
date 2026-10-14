import { useEffect, useState } from "react";
import type { ToastDetail } from "../lib/toast";

const DURATION_MS = 6000;

/** Retour visuel bref et annulable, posé au-dessus de la navigation du bas. */
export default function Toaster() {
  const [toast, setToast] = useState<(ToastDetail & { id: number }) | null>(null);

  useEffect(() => {
    let counter = 0;
    const show = (event: Event) => {
      counter += 1;
      setToast({ ...(event as CustomEvent<ToastDetail>).detail, id: counter });
    };
    globalThis.addEventListener("app-toast", show);
    return () => globalThis.removeEventListener("app-toast", show);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="app-toast" role="status">
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          className="app-toast-action"
          onClick={() => {
            toast.onAction?.();
            setToast(null);
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
