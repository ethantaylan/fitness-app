import type { Exercise, Program, Session, SessionBlock, WarmupItem, Week } from "./types";

function cloneWarmupItem(item: WarmupItem): WarmupItem {
  return { ...item };
}

function cloneExercise(exercise: Exercise): Exercise {
  return { ...exercise };
}

function cloneBlock(block: SessionBlock): SessionBlock {
  return {
    ...block,
    exercises: block.exercises.map(cloneExercise),
  };
}

function cloneSessionForWeek(session: Session, weekNumber: number, sessionIndex: number): Session {
  return {
    ...session,
    session_id: `W${weekNumber}D${sessionIndex + 1}`,
    warmup: session.warmup.map(cloneWarmupItem),
    blocks: session.blocks.map(cloneBlock),
    cooldown: session.cooldown.map(cloneWarmupItem),
    completed: false,
    completedAt: null,
  };
}

function buildWeekTemplate(sourceWeek: Week, weekNumber: number): Week {
  return {
    ...sourceWeek,
    week_number: weekNumber,
    focus: sourceWeek.focus || `Bloc ${weekNumber}`,
    sessions: sourceWeek.sessions.map((session, sessionIndex) =>
      cloneSessionForWeek(session, weekNumber, sessionIndex),
    ),
  };
}

export function normalizeProgramWeeks(program: Program): Program {
  const expectedWeeks = Math.max(
    program.program_overview.duration_weeks ?? 0,
    program.weeks.length,
  );

  if (program.weeks.length === 0 || program.weeks.length >= expectedWeeks) {
    return program;
  }

  const explicitWeeks = new Map(program.weeks.map((week) => [week.week_number, week]));
  const normalizedWeeks: Week[] = [];

  for (let weekNumber = 1; weekNumber <= expectedWeeks; weekNumber++) {
    const explicitWeek = explicitWeeks.get(weekNumber);

    if (explicitWeek) {
      normalizedWeeks.push(explicitWeek);
      continue;
    }

    const sourceWeek = program.weeks[(weekNumber - 1) % program.weeks.length] ?? program.weeks[0];
    normalizedWeeks.push(buildWeekTemplate(sourceWeek, weekNumber));
  }

  return {
    ...program,
    weeks: normalizedWeeks,
  };
}
