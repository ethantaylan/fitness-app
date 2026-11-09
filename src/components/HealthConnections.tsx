import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import {
  healthSessionOptions,
  readHealthActivities,
  supportsAppleHealth,
  type HealthActivity,
} from "../lib/health";
import { openExternalUrl } from "../lib/native";
import Modal from "./ui/Modal";

export default function HealthConnections() {
  const { userId } = useAuth();
  const { state, dispatch } = useApp();
  const [activities, setActivities] = useState<HealthActivity[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chosen, setChosen] = useState<HealthActivity | null>(null);
  const [selection, setSelection] = useState("");
  const [linked, setLinked] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);
  const account = useRef(userId);
  const activeProgram = useRef(state.program?.program_id);
  account.current = userId;
  activeProgram.current = state.program?.program_id;
  useEffect(() => {
    setActivities([]);
    setLinked([]);
    setChosen(null);
    setLoaded(false);
    setError("");
    setSuccess("");
  }, [userId]);
  const options = healthSessionOptions(state.program);
  const native = supportsAppleHealth();
  async function synchronize() {
    const requestUser = userId;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await readHealthActivities();
      const { data, error: readError } = await supabase
        .from("health_activity_links")
        .select("external_id")
        .eq("source", "apple_health")
        .eq("user_id", userId ?? "");
      if (readError)
        throw new Error("Impossible de vérifier les activités déjà associées. Réessaie.");
      if (account.current !== requestUser) return;
      setActivities(result);
      setLinked((data ?? []).map((row: { external_id: string }) => row.external_id));
      setLoaded(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Synchronisation impossible.");
    } finally {
      setBusy(false);
    }
  }
  async function associate() {
    const option = options.find((item) => `${item.week}:${item.session}` === selection);
    const program = state.program;
    if (!chosen || !program?.program_id || !option) return;
    const currentActivity = chosen;
    const requestUser = userId;
    setLinking(true);
    setError("");
    try {
      const { error: linkError } = await supabase.rpc("link_health_activity", {
        p_program_id: program.program_id,
        p_week: option.week,
        p_session: option.session,
        p_source: "apple_health",
        p_external_id: currentActivity.id,
        p_started_at: currentActivity.start,
        p_ended_at: currentActivity.end,
      });
      if (linkError)
        throw new Error(
          linkError.code === "23505"
            ? "Cette activité ou cette séance est déjà associée. Actualise les activités."
            : "Association impossible. Vérifie ta connexion et termine les semaines précédentes.",
        );
      if (account.current !== requestUser || activeProgram.current !== program.program_id) return;
      dispatch({
        type: "SET_PROGRAM_SESSION_COMPLETION",
        weekNumber: option.week,
        sessionId: option.session,
        completed: true,
        completedAt: currentActivity.end,
        persisted: true,
      });
      setLinked((ids) => [...ids, currentActivity.id]);
      setChosen(null);
      setSuccess("Activité associée : ta séance est marquée comme réalisée.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Association impossible.");
    } finally {
      setLinking(false);
    }
  }
  return (
    <section
      id="sante"
      aria-labelledby="health-title"
      className="rounded-2xl border border-line p-5"
    >
      <h2 id="health-title" className="text-lg font-black">
        Santé et montres
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Retrouve tes entraînements des 60 derniers jours et choisis la séance qu’ils valident.
        Aucune séance n’est cochée sans ta confirmation.
      </p>
      <div className="mt-4 rounded-xl bg-card-soft p-4">
        <h3 className="font-bold">Apple Santé · Apple Watch</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Lecture des entraînements uniquement. Les données brutes restent sur l’iPhone ; seul le
          lien avec la séance et les dates de l’activité sont enregistrés sur ton compte. Aucune
          donnée Santé n’est transmise au coach IA.
        </p>
        {native ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void synchronize()}
            className="app-primary mt-3 min-h-11"
          >
            {busy
              ? "Lecture des activités…"
              : loaded
                ? "Actualiser mes activités"
                : "Connecter Apple Santé"}
          </button>
        ) : (
          <p className="mt-3 text-sm font-semibold">
            Ouvre Vincere sur ton iPhone pour connecter Apple Santé.
          </p>
        )}
        <p className="mt-2 text-xs text-ink-soft">
          Tu peux modifier ou retirer l’accès à tout moment dans les réglages de Santé. Pour effacer
          une association, remets la séance à faire ou réinitialise sa semaine.
        </p>
      </div>
      <div className="mt-3 rounded-xl bg-card-soft p-4">
        <h3 className="font-bold">Montre Garmin</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Sur iPhone, active le partage de Garmin Connect vers Apple Santé, puis synchronise ta
          montre dans Garmin Connect avant d’actualiser ici. Seules les activités effectivement
          partagées avec Santé apparaîtront.
        </p>
        <button
          type="button"
          className="app-secondary mt-3 min-h-11"
          onClick={() =>
            void openExternalUrl("https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA")
          }
        >
          Configurer le partage Garmin
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-3 text-sm text-brand">
          {success}
        </p>
      )}
      {loaded && activities.length === 0 && (
        <p role="status" className="mt-4 text-sm text-ink-soft">
          Aucune activité accessible sur les 60 derniers jours. Vérifie les autorisations de Vincere
          dans Santé et la synchronisation de ta montre.
        </p>
      )}
      {loaded && !options.length && (
        <p className="mt-3 text-sm text-ink-soft">
          Aucune séance à associer dans la semaine active. Tu peux créer un programme ou recommencer
          une semaine.
        </p>
      )}
      <ul className="mt-4 space-y-2">
        {activities.map((activity) => (
          <li key={activity.id} className="rounded-xl border border-line p-3">
            <p className="font-bold">{activity.type}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {new Date(activity.start).toLocaleDateString("fr-FR")} ·{" "}
              {Math.round(activity.durationSeconds / 60)} min
              {activity.distanceMeters > 0
                ? ` · ${(activity.distanceMeters / 1000).toFixed(1)} km`
                : ""}{" "}
              · {activity.sourceName}
            </p>
            {linked.includes(activity.id) ? (
              <p className="mt-2 text-sm text-brand">Déjà associée</p>
            ) : (
              <button
                type="button"
                disabled={!options.length || !state.program?.program_id}
                className="app-secondary mt-2 min-h-11"
                onClick={() => {
                  setSelection(options[0] ? `${options[0].week}:${options[0].session}` : "");
                  setChosen(activity);
                  setError("");
                }}
              >
                Associer à une séance
              </button>
            )}
          </li>
        ))}
      </ul>
      <Modal
        open={!!chosen}
        title="Valider une séance avec cette activité ?"
        onClose={() => {
          if (!linking) setChosen(null);
        }}
      >
        <p className="text-sm">
          {chosen?.type} · {chosen ? new Date(chosen.start).toLocaleDateString("fr-FR") : ""}.
          Choisis la séance correspondante ; elle sera marquée comme réalisée.
        </p>
        <label className="mt-4 block text-sm font-bold" htmlFor="health-session">
          Séance du programme
        </label>
        <select
          id="health-session"
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-line bg-card p-3"
        >
          {options.map((option) => (
            <option
              key={`${option.week}:${option.session}`}
              value={`${option.week}:${option.session}`}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={linking}
            className="app-secondary flex-1"
            onClick={() => setChosen(null)}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={linking || !selection}
            className="app-primary flex-1"
            onClick={() => void associate()}
          >
            {linking ? "Validation…" : "Confirmer et valider"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
