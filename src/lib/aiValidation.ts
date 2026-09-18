import type { DailySession, Exercise, Program, UserProfile } from "./types";

const RUNNING_FORBIDDEN_PATTERN =
  /développé|bench press|chest press|dips?|push[- ]?ups?|pompes?|pector|\bpecs?\b|biceps|triceps|curl|upper body|push day|pull day|tirage poulie|élévations latérales|développé militaire/i;
const RUNNING_SPECIFIC_PATTERN =
  /course|running|footing|jog|fractionné|intervalle|fartlek|sortie longue|tempo run|allure|seuil|vma|côte|sprint/i;

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function minActivitiesForObjective(
  durationMin: number,
  objective: UserProfile["objective"],
): number {
  if (objective === "running") {
    if (durationMin <= 35) return 2;
    if (durationMin <= 65) return 3;
    return 4;
  }
  if (objective === "yoga") return durationMin <= 45 ? 3 : 4;
  if (durationMin <= 35) return 3;
  if (durationMin <= 50) return 5;
  if (durationMin <= 65) return 6;
  if (durationMin <= 80) return 8;
  return 10;
}

export function maxActivitiesForObjective(
  durationMin: number,
  objective: UserProfile["objective"],
): number {
  if (objective === "running") {
    if (durationMin <= 35) return 3;
    if (durationMin <= 65) return 5;
    return 6;
  }
  if (objective === "yoga") return 6;
  if (durationMin <= 35) return 4;
  if (durationMin <= 50) return 6;
  if (durationMin <= 65) return 8;
  if (durationMin <= 80) return 11;
  return 14;
}

function countExercises(session: { blocks: { exercises: unknown[] }[] }): number {
  return session.blocks.reduce((sum, block) => sum + block.exercises.length, 0);
}

function runningCoherenceError(
  sessions: Array<{
    label: string;
    type?: string;
    notes?: string;
    blocks: Array<{
      block_name: string;
      exercises: Array<Pick<Exercise, "name" | "alternative" | "notes">>;
    }>;
  }>,
): string | null {
  for (const session of sessions) {
    if (RUNNING_FORBIDDEN_PATTERN.test(`${session.type ?? ""} ${session.notes ?? ""}`)) {
      return `${session.label} : type ou note incompatible avec le running (${session.type ?? "sans type"}).`;
    }
    for (const block of session.blocks) {
      if (RUNNING_FORBIDDEN_PATTERN.test(block.block_name)) {
        return `${session.label} : bloc incompatible avec le running (${block.block_name}).`;
      }
      for (const exercise of block.exercises) {
        if (
          RUNNING_FORBIDDEN_PATTERN.test(
            `${exercise.name} ${exercise.alternative ?? ""} ${exercise.notes ?? ""}`,
          )
        ) {
          return `${session.label} : exercice incompatible avec le running (${exercise.name}).`;
        }
      }
    }
  }
  return null;
}

function sessionText(session: {
  type?: string;
  notes?: string;
  blocks: Array<{
    block_name: string;
    exercises: Array<Pick<Exercise, "name" | "alternative" | "notes">>;
  }>;
}): string {
  return [
    session.type,
    session.notes,
    ...session.blocks.flatMap((block) => [
      block.block_name,
      ...block.exercises.flatMap((exercise) => [
        exercise.name,
        exercise.alternative,
        exercise.notes,
      ]),
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

function isRunningSpecificSession(session: Parameters<typeof sessionText>[0]): boolean {
  return RUNNING_SPECIFIC_PATTERN.test(sessionText(session));
}

export function validateObjectiveCoherence(
  program: Program,
  objective: UserProfile["objective"],
): string | null {
  if (objective !== "running") return null;

  const coherenceError = runningCoherenceError(
    program.weeks.flatMap((week) =>
      week.sessions.map((session) => ({
        ...session,
        label: `Semaine ${week.week_number}, ${session.day}`,
      })),
    ),
  );
  if (coherenceError) return coherenceError;

  for (const week of program.weeks) {
    const requiredRunningSessions = Math.max(1, Math.ceil(week.sessions.length * 0.6));
    const runningSessions = week.sessions.filter(isRunningSpecificSession).length;
    if (runningSessions < requiredRunningSessions) {
      return `Semaine ${week.week_number} : ${runningSessions} séance de course au lieu d'au moins ${requiredRunningSessions}.`;
    }
  }
  return null;
}

export function validateProgram(
  program: Program,
  profile: UserProfile,
  expectedWeeks: number,
): string[] {
  const errors: string[] = [];

  if (program.program_overview.duration_weeks !== expectedWeeks) {
    errors.push(`La durée annoncée doit être de ${expectedWeeks} semaines.`);
  }
  if (program.weeks.length !== expectedWeeks) {
    errors.push(
      `Le programme contient ${program.weeks.length} semaines au lieu de ${expectedWeeks}.`,
    );
  }
  if (program.program_overview.training_days_per_week !== profile.weeklyFrequency) {
    errors.push(`La fréquence annoncée doit être de ${profile.weeklyFrequency} séances.`);
  }

  const sessionIds = new Set<string>();

  for (let weekNumber = 1; weekNumber <= expectedWeeks; weekNumber++) {
    const week = program.weeks.find((candidate) => candidate.week_number === weekNumber);
    if (!week) {
      errors.push(`La semaine ${weekNumber} est absente.`);
      continue;
    }
    if (week.sessions.length !== profile.weeklyFrequency) {
      errors.push(
        `La semaine ${weekNumber} contient ${week.sessions.length} séances au lieu de ${profile.weeklyFrequency}.`,
      );
    }
    const days = new Set<string>();
    for (const session of week.sessions) {
      if (sessionIds.has(session.session_id)) {
        errors.push(`Identifiant de séance dupliqué : ${session.session_id}.`);
      }
      sessionIds.add(session.session_id);
      if (!new RegExp(`^W${weekNumber}D[1-7]$`).test(session.session_id)) {
        errors.push(`Identifiant incohérent en semaine ${weekNumber} : ${session.session_id}.`);
      }
      const normalizedDay = normalizeName(session.day);
      if (days.has(normalizedDay)) {
        errors.push(`Semaine ${weekNumber} : le jour ${session.day} est utilisé deux fois.`);
      }
      days.add(normalizedDay);
      const total = countExercises(session);
      const required = minActivitiesForObjective(session.duration_min, profile.objective);
      const maximum = maxActivitiesForObjective(session.duration_min, profile.objective);
      if (total < required) {
        errors.push(
          `Semaine ${weekNumber}, ${session.day} : ${total} éléments au lieu d'au moins ${required}.`,
        );
      }
      if (total > maximum) {
        errors.push(
          `Semaine ${weekNumber}, ${session.day} : ${total} éléments au lieu de ${maximum} maximum.`,
        );
      }
      if (session.duration_min < 15 || session.duration_min > 180) {
        errors.push(`Semaine ${weekNumber}, ${session.day} : durée incohérente.`);
      }
      const matchesPreferredDuration = profile.sessionDuration.some(
        (duration) => Math.abs(session.duration_min - duration) <= 10,
      );
      if (!matchesPreferredDuration) {
        errors.push(
          `Semaine ${weekNumber}, ${session.day} : durée éloignée des préférences utilisateur.`,
        );
      }
    }
  }

  const coherenceError = validateObjectiveCoherence(program, profile.objective);
  if (coherenceError) errors.push(coherenceError);
  return errors;
}

export function validateDailySession(
  session: Omit<DailySession, "uid">,
  profile: UserProfile,
): string[] {
  const errors: string[] = [];
  const required = minActivitiesForObjective(profile.sessionDuration[0] ?? 45, profile.objective);
  const maximum = maxActivitiesForObjective(profile.sessionDuration[0] ?? 45, profile.objective);
  const total = countExercises(session);

  if (total < required)
    errors.push(`La séance contient ${total} éléments au lieu d'au moins ${required}.`);
  if (total > maximum)
    errors.push(`La séance contient ${total} éléments au lieu de ${maximum} maximum.`);
  if (session.duration_min < 15 || session.duration_min > 180) {
    errors.push("La durée de la séance est incohérente.");
  }
  const targetDuration = profile.sessionDuration[0] ?? 45;
  const durationTolerance = Math.max(10, Math.round(targetDuration * 0.2));
  if (Math.abs(session.duration_min - targetDuration) > durationTolerance) {
    errors.push(
      `La séance dure ${session.duration_min} minutes au lieu d'environ ${targetDuration}.`,
    );
  }
  if (profile.objective === "running") {
    const runningSession = { ...session, label: "Séance générée", type: session.goal };
    const coherenceError = runningCoherenceError([runningSession]);
    if (coherenceError) errors.push(coherenceError);
    if (!isRunningSpecificSession(runningSession)) {
      errors.push("La séance ne contient aucun travail de course identifiable.");
    }
  }
  return errors;
}

export function validateReplacement(
  original: Exercise,
  replacement: Exercise,
  objective: UserProfile["objective"],
): string | null {
  if (normalizeName(original.name) === normalizeName(replacement.name)) {
    return "L'exercice proposé est identique à l'exercice d'origine.";
  }
  if (objective === "running" && RUNNING_FORBIDDEN_PATTERN.test(replacement.name)) {
    return `L'exercice ${replacement.name} est incompatible avec le running.`;
  }
  if (!replacement.name.trim() || replacement.sets < 1 || !String(replacement.reps).trim()) {
    return "L'exercice de remplacement est incomplet.";
  }
  return null;
}
