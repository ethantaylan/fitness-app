import { useState } from "react";
import { signInWithSocial, supportsNativeApple, isSocialAuthCancelled } from "../lib/socialAuth";

export default function SocialAuthButtons({
  nextPath,
  disabled,
  onBusyChange,
  onError,
}: Readonly<{
  nextPath: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onError: (error: string) => void;
}>) {
  const [pending, setPending] = useState<"apple" | "google" | null>(null);
  async function connect(provider: "apple" | "google") {
    if (pending || disabled) return;
    setPending(provider);
    onBusyChange(true);
    onError("");
    try {
      await signInWithSocial(provider, nextPath);
    } catch (error) {
      if (!isSocialAuthCancelled(error))
        onError(
          `La connexion ${provider === "apple" ? "Apple" : "Google"} n’a pas abouti. Réessaie ou utilise ton e-mail.`,
        );
    } finally {
      setPending(null);
      onBusyChange(false);
    }
  }
  return (
    <div className="mb-5 space-y-3">
      {supportsNativeApple && (
        <button
          type="button"
          disabled={disabled || pending !== null}
          onClick={() => void connect("apple")}
          className="app-primary w-full rounded-xl"
        >
          <svg aria-hidden="true" width="20" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 12.54c.03 3.22 2.83 4.29 2.86 4.3-.02.08-.45 1.53-1.48 3.03-.89 1.3-1.81 2.59-3.26 2.62-1.42.03-1.88-.85-3.51-.85-1.63 0-2.14.82-3.49.88-1.4.05-2.46-1.41-3.36-2.7-1.83-2.64-3.23-7.46-1.35-10.72.93-1.62 2.6-2.65 4.4-2.68 1.38-.03 2.69.93 3.54.93.85 0 2.45-1.15 4.13-.98.7.03 2.66.28 3.92 2.12-.1.06-2.34 1.36-2.31 4.05ZM14.37 4.65c.75-.91 1.26-2.17 1.12-3.43-1.08.04-2.38.72-3.15 1.63-.69.8-1.29 2.08-1.13 3.31 1.2.09 2.42-.61 3.16-1.51Z" />
          </svg>
          {pending === "apple" ? "Connexion Apple…" : "Continuer avec Apple"}
        </button>
      )}
      <button
        type="button"
        disabled={disabled || pending !== null}
        onClick={() => void connect("google")}
        className="app-secondary w-full rounded-xl"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {pending === "google" ? "Connexion Google…" : "Continuer avec Google"}
      </button>
      <div className="flex items-center gap-3 pt-2" aria-hidden="true">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-soft">ou avec ton e-mail</span>
        <div className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
