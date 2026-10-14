import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, LogOut, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { revokeAIConsent } from "../lib/aiConsent";
import { shareFile } from "../lib/native";

export default function AccountPrivacy() {
  const { userId, userEmail, signOut } = useAuth();
  const { state } = useApp();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'action n'a pas pu aboutir.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (confirmation !== "SUPPRIMER" || !password || !userId) return;
    const {
      data,
      error: deletionError,
      response,
    } = await supabase.functions.invoke("delete-account", {
      body: { confirmation, password },
    });
    if (deletionError || !data?.deleted) {
      const failure = (await response?.json().catch(() => null)) as { error?: string } | null;
      throw new Error(failure?.error || "La suppression n'a pas abouti. Réessaie dans un instant.");
    }
    await signOut();
    void navigate("/", { replace: true });
  }

  return (
    <section className="space-y-4" aria-labelledby="account-privacy-title">
      <h2 id="account-privacy-title" className="text-lg font-bold">
        Données et confidentialité
      </h2>

      {/* Niveau 1 : actions sans risque */}
      <div className="space-y-3 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-sm font-bold">Mes données et mon compte</h3>
        <button
          type="button"
          className="app-secondary w-full justify-start"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const { _hydrated, ...saved } = state;
              void _hydrated;
              await shareFile(
                new Blob(
                  [
                    JSON.stringify(
                      { exportedAt: new Date().toISOString(), email: userEmail, ...saved },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                ),
                "vincere-mes-donnees.json",
                "Mes données Vincere",
              );
            })
          }
        >
          <Download size={18} aria-hidden="true" /> Exporter mes données
        </button>
        <p className="text-sm text-ink-soft">
          Un fichier avec ton profil, tes programmes, tes séances et tes performances.
        </p>
        <button
          type="button"
          className="app-secondary w-full justify-start"
          disabled={busy}
          onClick={(event) => {
            // Safari ne donne pas le focus au clic : on le fixe pour que la fenêtre le restitue.
            event.currentTarget.focus();
            globalThis.dispatchEvent(new Event("open-contact"));
          }}
        >
          <Mail size={18} aria-hidden="true" /> Contacter l'assistance
        </button>
        <button
          type="button"
          className="app-secondary w-full justify-start"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await signOut();
              void navigate("/", { replace: true });
            })
          }
        >
          <LogOut size={18} aria-hidden="true" /> Me déconnecter
        </button>
      </div>

      {/* Niveau 2 : retirer l'accord IA, réversible mais bloquant pour la génération */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-sm font-bold">Intelligence artificielle</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Avec ton accord, tes informations sportives sont envoyées à OpenAI pour générer tes
          programmes et tes séances.
        </p>
        {revoking ? (
          <div className="mt-3 rounded-xl border border-warn-line bg-warn-soft p-4">
            <p className="text-sm">
              Sans cet accord, tu ne pourras plus générer de programme ni de séance, ni utiliser
              l'assistant. Tu pourras le redonner à tout moment.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="app-secondary" onClick={() => setRevoking(false)}>
                Garder mon accord
              </button>
              <button
                type="button"
                className="app-primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await revokeAIConsent();
                    setRevoking(false);
                    setMessage("Accord retiré. Aucun nouvel envoi à OpenAI sans ton autorisation.");
                  })
                }
              >
                Retirer mon accord
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="app-secondary mt-3 w-full justify-start"
            disabled={busy}
            onClick={() => setRevoking(true)}
          >
            <ShieldCheck size={18} aria-hidden="true" /> Retirer mon accord pour l'IA
          </button>
        )}
      </div>

      <nav className="flex flex-wrap gap-x-5 text-sm underline" aria-label="Informations légales">
        <Link
          className="inline-flex min-h-11 min-w-11 items-center justify-center"
          to="/privacy?from=account"
        >
          Confidentialité
        </Link>
        <Link
          className="inline-flex min-h-11 min-w-11 items-center justify-center"
          to="/terms?from=account"
        >
          Conditions
        </Link>
        <Link
          className="inline-flex min-h-11 min-w-11 items-center justify-center"
          to="/support?from=account"
        >
          Aide
        </Link>
      </nav>

      {message && (
        <p className="text-sm font-semibold text-brand" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      {/* Niveau 3 : zone de danger, séparée, avec confirmation forte */}
      <div className="rounded-2xl border-2 border-danger-line bg-danger-soft p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-danger">
          <Trash2 size={16} aria-hidden="true" /> Zone de danger
        </h3>
        {!deleting ? (
          <>
            <p className="mt-1 text-sm">
              Supprimer ton compte efface définitivement ton profil, tes programmes, tes séances et
              tes performances.
            </p>
            <button type="button" className="app-danger mt-3" onClick={() => setDeleting(true)}>
              <Trash2 size={18} aria-hidden="true" /> Supprimer mon compte
            </button>
          </>
        ) : (
          <form
            className="mt-3 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(deleteAccount);
            }}
          >
            <p className="text-sm leading-relaxed">
              Ton compte, ton profil, tes programmes, tes séances et tes performances seront
              effacés. Cette action est irréversible. Les fichiers déjà exportés ne sont pas
              supprimés.
            </p>
            <label className="block text-sm font-semibold" htmlFor="delete-password">
              Ton mot de passe
            </label>
            <input
              id="delete-password"
              className="app-input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs text-ink-soft">
              Compte créé avec Google ? Définis d'abord un mot de passe avec le lien de
              réinitialisation de l'onglet Compte.
            </p>
            <label className="block text-sm font-semibold" htmlFor="delete-confirmation">
              Écris SUPPRIMER pour confirmer
            </label>
            <input
              id="delete-confirmation"
              className="app-input"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
            <div className="flex flex-wrap gap-3">
              <button
                className="app-secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setDeleting(false);
                  setPassword("");
                  setConfirmation("");
                }}
              >
                Annuler
              </button>
              <button
                className="app-danger"
                type="submit"
                disabled={busy || confirmation !== "SUPPRIMER" || !password}
              >
                {busy ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
