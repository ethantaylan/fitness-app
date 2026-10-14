import { Link } from "react-router-dom";
import { ChevronRight, Clock, Plus, Zap } from "lucide-react";
import { FEEDBACK_META } from "../../lib/constants";
import type { FeedbackType } from "../../lib/constants";
import { FREE_SESSION_BUILDER_ENABLED } from "../../lib/features";
import type { UserProfile } from "../../lib/types";

const MAX_SESSIONS_PER_DAY = 3;

interface SessionSummary {
  uid: string;
  date: string;
  duration_min: number;
  intensity: string;
  goal: string;
  feedback?: string;
}

interface Props {
  readonly todaySessions: SessionSummary[];
  readonly profile: UserProfile | null;
  readonly onGenerate: () => void;
  readonly onNavigate: (uid: string) => void;
}

/** Un seul message et un seul CTA : créer une séance libre, hors programme. */
export default function FreeSessionCard({ todaySessions, profile, onGenerate, onNavigate }: Props) {
  const canGenerate = !!profile?.objective && todaySessions.length < MAX_SESSIONS_PER_DAY;

  // Builder masqué pour le moment (voir src/lib/features.ts) : ce bloc n'apparaît que s'il y a des
  // séances libres du jour à retrouver, sans proposer d'en créer.
  if (!FREE_SESSION_BUILDER_ENABLED && todaySessions.length === 0) return null;

  if (!profile?.objective) {
    return (
      <section className="rounded-2xl border border-line bg-card p-5" aria-labelledby="free-title">
        <h2 id="free-title" className="text-base font-black">
          Séance libre
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Remplis ton profil pour débloquer ton programme et les séances libres.
        </p>
        <Link to="/onboarding" className="app-primary mt-4 w-full sm:w-auto">
          Configurer mon profil
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5" aria-labelledby="free-title">
      <h2 id="free-title" className="text-base font-black">
        Séance libre
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        {FREE_SESSION_BUILDER_ENABLED
          ? "Une séance ponctuelle, adaptée à ton état du jour. Elle ne remplace pas ton programme."
          : "Tes séances libres du jour."}
      </p>

      {todaySessions.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Séances libres du jour">
          {todaySessions.map((s) => {
            const fb = s.feedback ? FEEDBACK_META[s.feedback as FeedbackType] : null;
            return (
              <li key={s.uid}>
                <button
                  type="button"
                  aria-label={`Voir la séance libre ${s.goal}`}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-card-muted p-3 text-left transition-colors hover:bg-card-soft"
                  onClick={() => onNavigate(s.uid)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-bold">{s.goal || "Séance prête"}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {s.duration_min} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" aria-hidden="true" />
                        {s.intensity}
                      </span>
                      {fb && <span>{fb.label}</span>}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!FREE_SESSION_BUILDER_ENABLED ? null : canGenerate ? (
        <button type="button" onClick={onGenerate} className="app-secondary mt-4 w-full sm:w-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {todaySessions.length === 0 ? "Créer une séance libre" : "Créer une autre séance libre"}
        </button>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          Maximum de {MAX_SESSIONS_PER_DAY} séances libres par jour atteint.
        </p>
      )}
    </section>
  );
}
