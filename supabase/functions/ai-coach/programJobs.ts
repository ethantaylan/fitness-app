import type { Program, UserProfile, Week } from "../../../src/lib/types.ts";
import { IncompleteStructuredResponseError } from "./programGeneration.ts";

export interface ProgramPlan {
  summary: string;
  phases: Array<{ start_week: number; end_week: number; focus: string; progression: string }>;
  nutrition_recommendations: Program["nutrition_recommendations"];
  general_advice: string;
  legal_disclaimer: string;
}

type Batch = { numbers: number[]; attempt: number; correction: string };
export interface ProgramCheckpoint {
  durationWeeks: number;
  plan?: ProgramPlan;
  planAttempt: number;
  correction: string;
  pending: Batch[];
  weeks: Week[];
  repairAttempts: Record<string, number>;
}

export interface ProgramSteps {
  plan: (attempt: number, correction: string) => Promise<ProgramPlan>;
  planErrors: (plan: ProgramPlan) => string[];
  weeks: (
    plan: ProgramPlan,
    numbers: number[],
    attempt: number,
    correction: string,
  ) => Promise<Week[]>;
  weekErrors: (weeks: Week[], numbers: number[]) => string[];
  needsRepair: (weeks: Week[]) => Array<{ session: Week["sessions"][number] }>;
  repair: (
    plan: ProgramPlan,
    session: Week["sessions"][number],
    attempt: number,
  ) => Promise<Week["sessions"]>;
  validRepair: (
    weeks: Week[],
    original: Week["sessions"][number],
    candidate: Week["sessions"][number],
  ) => boolean;
  assemble: (plan: ProgramPlan, weeks: Week[], durationWeeks: number) => Program;
}

export function initialProgramCheckpoint(
  durationWeeks: number,
  batchSize: number,
): ProgramCheckpoint {
  const pending: Batch[] = [];
  for (let start = 1; start <= durationWeeks; start += batchSize) {
    pending.push({
      numbers: Array.from(
        { length: Math.min(batchSize, durationWeeks - start + 1) },
        (_, i) => start + i,
      ),
      attempt: 0,
      correction: "",
    });
  }
  return { durationWeeks, planAttempt: 0, correction: "", pending, weeks: [], repairAttempts: {} };
}

/** Exactly one model request per invocation; each accepted result is a durable checkpoint. */
export async function advanceProgramJob(
  checkpoint: ProgramCheckpoint,
  steps: ProgramSteps,
): Promise<{ checkpoint: ProgramCheckpoint; program?: Program }> {
  const next = structuredClone(checkpoint);
  if (!next.plan) {
    let plan: ProgramPlan;
    try {
      plan = await steps.plan(next.planAttempt, next.correction);
    } catch (error) {
      if (!(error instanceof IncompleteStructuredResponseError)) throw error;
      next.planAttempt++;
      if (next.planAttempt >= 3)
        throw new Error("Impossible de construire la progression : réponse IA trop longue.");
      next.correction =
        "Raccourcis les conseils et la description des phases pour terminer la réponse.";
      return { checkpoint: next };
    }
    const errors = steps.planErrors(plan);
    next.planAttempt++;
    if (errors.length === 0) next.plan = plan;
    else {
      if (next.planAttempt >= 3)
        throw new Error("Impossible de construire une progression cohérente.");
      next.correction = errors.join(" ");
    }
    return { checkpoint: next };
  }
  const batch = next.pending[0];
  if (batch) {
    let weeks: Week[];
    try {
      weeks = await steps.weeks(next.plan, batch.numbers, batch.attempt, batch.correction);
    } catch (error) {
      if (!(error instanceof IncompleteStructuredResponseError)) throw error;
      if (batch.numbers.length > 1) {
        const middle = Math.ceil(batch.numbers.length / 2);
        next.pending.splice(
          0,
          1,
          ...[batch.numbers.slice(0, middle), batch.numbers.slice(middle)].map((numbers) => ({
            numbers,
            attempt: 0,
            correction: "Réponse concise, sans retirer de séance ni d'exercice.",
          })),
        );
      } else {
        batch.attempt++;
        batch.correction =
          "Réponse trop longue : raccourcis les notes, sans retirer de séance ni d'exercice.";
        if (batch.attempt >= 3)
          throw new Error("Impossible de finaliser une semaine : réponse IA trop longue.");
      }
      return { checkpoint: next };
    }
    const errors = steps.weekErrors(weeks, batch.numbers);
    if (errors.length) {
      // Retain individually valid weeks instead of paying to generate them again.
      for (const number of batch.numbers) {
        const received = weeks.filter((week) => week.week_number === number);
        if (received.length === 1 && steps.weekErrors(received, [number]).length === 0)
          next.weeks.push(received[0]);
      }
      batch.numbers = batch.numbers.filter(
        (number) => !next.weeks.some((week) => week.week_number === number),
      );
      if (batch.numbers.length === 0) next.pending.shift();
      else {
        batch.attempt++;
        batch.correction = errors.join(" ");
        if (batch.attempt >= 3)
          throw new Error(`Impossible de générer les semaines ${batch.numbers.join(", ")}.`);
      }
    } else {
      next.weeks.push(...weeks);
      next.pending.shift();
    }
    next.weeks.sort((a, b) => a.week_number - b.week_number);
    return { checkpoint: next };
  }
  const target = steps.needsRepair(next.weeks)[0];
  if (target) {
    const id = target.session.session_id;
    const attempt = (next.repairAttempts[id] ?? 0) + 1;
    next.repairAttempts[id] = attempt;
    let response: Week["sessions"] = [];
    try {
      response = await steps.repair(next.plan, target.session, attempt);
    } catch (error) {
      if (!(error instanceof IncompleteStructuredResponseError)) throw error;
    }
    const candidate = response.length === 1 ? response[0] : undefined;
    if (candidate?.session_id === id && steps.validRepair(next.weeks, target.session, candidate)) {
      next.weeks = next.weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((session) => (session.session_id === id ? candidate : session)),
      }));
    } else if (attempt >= 3) throw new Error(`Impossible de compléter la séance ${id}.`);
    return { checkpoint: next };
  }
  return { checkpoint: next, program: steps.assemble(next.plan, next.weeks, next.durationWeeks) };
}

export type ProgramJob = {
  id: string;
  user_id: string;
  profile: UserProfile;
  checkpoint: ProgramCheckpoint & { program?: Program };
  status: "queued" | "running" | "completed" | "failed";
  error: string | null;
  lease_token: string;
};

export function publicProgramJob(job: ProgramJob) {
  return {
    id: job.id,
    status: job.status,
    error: job.error,
    completedWeeks: job.checkpoint.weeks?.length ?? job.checkpoint.program?.weeks.length ?? 0,
    result:
      job.status === "completed" ? { ...job.checkpoint.program, program_id: job.id } : undefined,
  };
}
