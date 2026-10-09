import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, LogOut, ShieldCheck, Trash2 } from "lucide-react";
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
    <section
      className="space-y-5 border-t border-gray-200 pt-6"
      aria-labelledby="account-privacy-title"
    >
      <h2 id="account-privacy-title" className="font-bold text-lg">
        Données et confidentialité
      </h2>
      <div className="flex flex-col gap-3">
        <button
          className="app-secondary justify-start"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const { _hydrated: _ignored, ...saved } = state;
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
          <Download size={18} /> Exporter mes données disponibles
        </button>
        <button
          className="app-secondary justify-start"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await revokeAIConsent();
              setMessage("Accord retiré. Aucun nouvel envoi au coach IA sans ton autorisation.");
            })
          }
        >
          <ShieldCheck size={18} /> Retirer mon accord pour l'IA
        </button>
        <button
          className="app-secondary justify-start"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await signOut();
              void navigate("/", { replace: true });
            })
          }
        >
          <LogOut size={18} /> Me déconnecter
        </button>
      </div>
      <nav className="flex flex-wrap gap-4 text-sm underline" aria-label="Données et assistance">
        <Link to="/privacy">Confidentialité</Link>
        <Link to="/terms">Conditions</Link>
        <Link to="/support">Assistance</Link>
      </nav>
      {message && (
        <p className="text-sm text-emerald-600" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="border-t border-gray-200 pt-5">
        {!deleting ? (
          <button
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-red-600"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={18} /> Supprimer mon compte
          </button>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(deleteAccount);
            }}
          >
            <h3 className="font-bold">Supprimer définitivement mon compte</h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Ton compte, ton profil, tes programmes, tes séances et tes records seront effacés.
              Cette action est irréversible. Les fichiers déjà exportés ne sont pas supprimés.
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
            <p className="text-xs text-gray-500">
              Compte créé avec Google ? Définis un mot de passe avec le lien de réinitialisation
              ci-dessus.
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
