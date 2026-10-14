import { Link } from "react-router-dom";
import { Check, ChevronRight, Circle, Clock } from "lucide-react";
import { programSessionLink, type SessionStatus } from "../../lib/program";
import { capitalize, shortDay } from "../../lib/sessionDisplay";
import type { Session } from "../../lib/types";

interface Props {
  readonly weekNumber: number;
  readonly totalWeeks: number;
  readonly states: ReadonlyArray<{ session: Session; status: SessionStatus }>;
}

const STATUS: Record<SessionStatus, { label: string; tone: string; Icon: typeof Check | null }> = {
  done: { label: "Faite", tone: "bg-brand text-brand-fg", Icon: Check },
  overdue: {
    label: "À rattraper",
    tone: "bg-warn-soft text-warn border border-warn-line",
    Icon: Clock,
  },
  today: {
    label: "Aujourd'hui",
    tone: "bg-brand-soft text-brand border border-brand-line",
    Icon: null,
  },
  upcoming: {
    label: "À faire",
    tone: "bg-card-soft text-ink-soft border border-line-strong",
    Icon: Circle,
  },
};

/** Semaine en cours : 4 segments de progression, une pastille par séance, lien vers le programme. */
export default function WeekStrip({ weekNumber, totalWeeks, states }: Props) {
  const done = states.filter((entry) => entry.status === "done").length;
  const overdue = states.filter((entry) => entry.status === "overdue").length;
  return (
    <section
      aria-labelledby="week-strip-title"
      className="rounded-2xl border border-line bg-card p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="week-strip-title" className="text-base font-black">
          Semaine {weekNumber}
        </h2>
        <p className="font-display text-sm font-bold tabular-nums">
          {done}/{states.length}{" "}
          <span className="font-sans font-semibold text-ink-soft">faites</span>
        </p>
      </div>

      <div
        className="mt-3 flex gap-1.5"
        role="img"
        aria-label={`${done} séance${done > 1 ? "s" : ""} réalisée${done > 1 ? "s" : ""} sur ${states.length}`}
      >
        {states.map(({ session, status }) => (
          <span
            key={session.session_id}
            className={`h-2 flex-1 rounded-full ${
              status === "done"
                ? "bg-brand"
                : status === "overdue"
                  ? "bg-warn-line"
                  : "bg-card-strong"
            }`}
          />
        ))}
      </div>
      {overdue > 0 && (
        <p className="mt-2 text-sm font-semibold text-warn">
          {overdue} séance{overdue > 1 ? "s" : ""} à rattraper
        </p>
      )}

      <ul className="mt-4 flex gap-2 overflow-x-auto" aria-label="Séances de la semaine">
        {states.map(({ session, status }) => {
          const { label, tone, Icon } = STATUS[status];
          return (
            <li key={session.session_id} className="min-w-16 flex-1">
              <Link
                to={programSessionLink(weekNumber, session.session_id)}
                aria-label={`${capitalize(session.day)} : ${session.type}, ${label.toLocaleLowerCase("fr-FR")}`}
                className="flex min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-card-muted px-1 py-2 text-center transition-colors hover:bg-card-soft"
              >
                <span className="text-xs font-bold">{shortDay(session.day)}</span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}
                  aria-hidden="true"
                >
                  {Icon ? (
                    <Icon size={15} strokeWidth={status === "done" ? 3 : 2} />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  )}
                </span>
                <span className="text-[11px] font-semibold leading-tight text-ink-soft">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        to={`/result?week=${weekNumber}`}
        className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-sm font-bold hover:bg-card-soft"
      >
        <span>Voir le programme</span>
        <span className="flex items-center gap-1 font-semibold text-ink-soft">
          Semaine {weekNumber} sur {totalWeeks}
          <ChevronRight size={18} aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}
