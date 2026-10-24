import { Clock, Gauge, Info, RefreshCw } from "lucide-react";
import { exerciseMetrics, formatSeconds, usesHolds } from "../../lib/exerciseDisplay";
import { capitalize, sessionFocus, whenLabel } from "../../lib/sessionDisplay";
import type { SessionStatus } from "../../lib/program";
import type { Exercise, Session, WarmupItem } from "../../lib/types";
import PageHeader from "../ui/PageHeader";
import SessionCheck from "../ui/SessionCheck";
import ExerciseGuide from "./ExerciseGuide";
import ExerciseVisual from "./ExerciseVisual";

function Steps({ title, items }: Readonly<{ title: string; items: WarmupItem[] }>) {
  return (
    <section className="mt-6" aria-labelledby={`steps-${title}`}>
      <h2 id={`steps-${title}`} className="mb-2 text-base font-black">
        {title}
      </h2>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
        {items.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 break-words font-semibold">{item.name}</span>
            {(item.duration_sec || item.reps) && (
              <span className="shrink-0 text-ink-soft">
                {item.duration_sec ? formatSeconds(item.duration_sec) : `${item.reps} reps`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExerciseCard({
  exercise,
  index,
  holds,
}: Readonly<{ exercise: Exercise; index: number; holds: boolean }>) {
  const metrics = exerciseMetrics(exercise, { holds });
  return (
    <li className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          className="font-display flex h-9 min-w-9 items-center justify-center rounded-xl bg-card-soft px-1 text-sm font-bold tabular-nums"
          aria-hidden="true"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-black leading-snug">{exercise.name}</h3>
          {exercise.notes && (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{exercise.notes}</p>
          )}
        </div>
        <ExerciseVisual src={exercise.media_url} name={exercise.name} />
      </div>
      {metrics.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="min-w-[5.5rem] flex-1 rounded-xl bg-card-soft px-3 py-2"
            >
              <dt className="text-xs text-ink-soft">{metric.label}</dt>
              <dd className="font-display text-base font-bold">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <ExerciseGuide name={exercise.name} notes={exercise.notes} />
      {exercise.alternative && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Alternative :</span> {exercise.alternative}
          </span>
        </p>
      )}
    </li>
  );
}

/** Écran dédié d'une séance du programme : une séance par page, action de validation fixe en bas. */
export default function ProgramSessionScreen({
  session,
  weekNumber,
  date,
  status,
  objective,
  onToggleCompletion,
}: Readonly<{
  session: Session;
  weekNumber: number;
  date: Date | null;
  status: SessionStatus;
  objective?: string | null;
  onToggleCompletion: (completed: boolean) => void;
}>) {
  const holds = usesHolds(objective, session.type);
  const focus = sessionFocus(session);
  return (
    <div className="theme-app-page min-h-screen">
      <PageHeader
        title={`${capitalize(session.day)} · ${session.type}`}
        backLabel="Retour"
        fallbackPath={`/result?week=${weekNumber}`}
      />
      <div>
        <main
          id={`program-session-${session.session_id}`}
          className="mx-auto max-w-3xl px-4 pt-5 sm:px-6"
          style={{ paddingBottom: "13rem" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Semaine {weekNumber} · {whenLabel(date, session.day)}
          </p>
          {focus && <p className="mt-1 text-base font-semibold">{focus}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card-soft px-3 py-1.5 font-semibold">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {session.duration_min} min
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card-soft px-3 py-1.5 font-semibold">
              <Gauge className="h-4 w-4" aria-hidden="true" />
              {session.intensity}
            </span>
            {status === "overdue" && (
              <span className="rounded-full border border-warn-line bg-warn-soft px-3 py-1.5 font-semibold text-warn">
                À rattraper
              </span>
            )}
            {session.completed && (
              <span className="rounded-full border border-brand-line bg-brand-soft px-3 py-1.5 font-semibold text-brand">
                Faite
              </span>
            )}
          </div>

          {session.warmup?.length > 0 && <Steps title="Échauffement" items={session.warmup} />}

          {session.blocks?.map((block) => (
            <section
              key={block.block_name}
              className="mt-6"
              aria-labelledby={`block-${block.block_name}`}
            >
              <h2 id={`block-${block.block_name}`} className="mb-2 text-base font-black">
                {block.block_name}
              </h2>
              <ol className="space-y-3">
                {block.exercises?.map((exercise, index) => (
                  <ExerciseCard
                    key={exercise.name}
                    exercise={exercise}
                    index={index}
                    holds={holds}
                  />
                ))}
              </ol>
            </section>
          ))}

          {session.cooldown?.length > 0 && <Steps title="Récupération" items={session.cooldown} />}

          {session.notes && (
            <p className="mt-6 flex items-start gap-2 rounded-2xl bg-card-soft p-4 text-sm leading-relaxed">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
              {session.notes}
            </p>
          )}
        </main>
      </div>

      <div className="app-dock fixed inset-x-0 z-55">
        <div className="mx-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-2xl border border-line bg-card p-2 shadow-[0_8px_30px_rgba(2,6,23,0.18)]">
          <SessionCheck
            variant="button"
            completed={Boolean(session.completed)}
            day={session.day}
            onChange={onToggleCompletion}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
