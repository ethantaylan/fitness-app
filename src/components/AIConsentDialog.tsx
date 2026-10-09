import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ShieldCheck } from "lucide-react";
import { answerAIConsent, isAIConsentPending, subscribeAIConsent } from "../lib/aiConsent";

export default function AIConsentDialog() {
  const pending = useSyncExternalStore(subscribeAIConsent, isAIConsentPending);
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (pending) {
      setError("");
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [pending]);

  async function respond(accepted: boolean) {
    setBusy(true);
    setError("");
    try {
      await answerAIConsent(accepted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer ton choix.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="app-dialog"
      aria-labelledby="ai-consent-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) void respond(false);
      }}
    >
      <ShieldCheck className="mb-4 text-emerald-600" size={28} aria-hidden="true" />
      <h2 id="ai-consent-title" className="text-xl font-bold">
        Autoriser le coach IA
      </h2>
      <p className="mt-3 text-sm leading-relaxed">
        Pour personnaliser tes entraînements, Vincere transmet ton profil sportif à{" "}
        <strong>OpenAI</strong> via son serveur Supabase.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Cela comprend ton objectif, ton niveau, ton âge, ta morphologie, ton matériel et les
        limitations physiques ou alimentaires que tu as renseignées. Pour l'assistant, les messages
        de la conversation sont transmis.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-500">
        Ton nom et ton e-mail de compte ne sont pas ajoutés aux requêtes. Les informations que tu
        écris dans l'assistant sont toutefois transmises. Tu peux refuser ou retirer cet accord dans
        Profil → Compte ou Confidentialité. Une réponse IA peut être inexacte et ne remplace pas un
        professionnel de santé.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          className="app-primary"
          disabled={busy}
          onClick={() => void respond(true)}
        >
          {busy ? "Enregistrement…" : "Autoriser le partage avec OpenAI"}
        </button>
        <button
          type="button"
          className="app-secondary"
          disabled={busy}
          onClick={() => void respond(false)}
        >
          Pas maintenant
        </button>
      </div>
    </dialog>
  );
}
