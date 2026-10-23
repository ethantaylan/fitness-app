/** Helpers kept free of the OpenAI/Deno runtime so regressions can be tested offline. */
export class IncompleteStructuredResponseError extends Error {
  constructor() {
    super("Impossible de finaliser la réponse IA : limite de longueur atteinte.");
    this.name = "IncompleteStructuredResponseError";
  }
}

export function parseStructuredResponse<T>(choice?: {
  finish_reason?: string | null;
  message?: { content?: string | null; refusal?: string | null };
}): T {
  if (choice?.finish_reason === "length") throw new IncompleteStructuredResponseError();
  const message = choice?.message;
  if (!message?.content) {
    throw new Error(
      message?.refusal ||
        `Le modèle n'a pas retourné de réponse exploitable (${choice?.finish_reason ?? "raison inconnue"}).`,
    );
  }
  return JSON.parse(message.content) as T;
}

/** Split truncated week responses without restarting successful parallel batches. */
export async function generateWeekBatch<T>(
  weekNumbers: number[],
  options: {
    request: (
      weeks: number[],
      attempt: number,
      correction: string,
      signal: AbortSignal,
    ) => Promise<T[]>;
    validate: (weeks: T[], expected: number[]) => string[];
  },
  signal: AbortSignal,
): Promise<T[]> {
  let errors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    let weeks: T[];
    try {
      weeks = await options.request(weekNumbers, attempt, errors.join(" "), signal);
    } catch (error) {
      if (!(error instanceof IncompleteStructuredResponseError)) throw error;
      if (weekNumbers.length === 1) {
        errors = [
          "Réponse trop longue : raccourcis les notes, sans retirer de séance ni d'exercice.",
        ];
        continue;
      }
      const middle = Math.ceil(weekNumbers.length / 2);
      // Sequential subdivisions keep the existing outer concurrency limit and cancellation.
      const first = await generateWeekBatch(weekNumbers.slice(0, middle), options, signal);
      const second = await generateWeekBatch(weekNumbers.slice(middle), options, signal);
      return [...first, ...second];
    }
    signal.throwIfAborted();
    errors = options.validate(weeks, weekNumbers);
    if (errors.length === 0) return weeks;
  }
  throw new Error(
    `Impossible de générer les semaines ${weekNumbers.join(", ")} correctement : ${errors.slice(0, 4).join(" ")}`,
  );
}

/** Reserve room for exercise details as well as warmups, cooldowns and session metadata. */
export function programBatchSizing(frequency: number, maximumActivities: number) {
  const tokensPerSession = 400 + maximumActivities * 160;
  const sessionsPerBatch = Math.max(1, Math.min(10, Math.floor(11000 / tokensPerSession)));
  const weeksPerBatch = Math.max(1, Math.floor(sessionsPerBatch / frequency));
  return {
    weeksPerBatch,
    maxTokens: (weekCount: number) =>
      Math.min(16000, 1500 + weekCount * frequency * tokensPerSession),
  };
}

/** Stop the queue and cancel active requests as soon as any worker fails. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, signal: AbortSignal) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const results = Array.from({ length: items.length }) as R[];
  let nextIndex = 0;
  let failed = false;
  let firstError: unknown;

  async function worker() {
    while (!controller.signal.aborted && nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await mapper(items[index], controller.signal);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
          controller.abort(error);
        }
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, () => worker()),
    );
    if (failed) throw firstError;
    controller.signal.throwIfAborted();
    return results;
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

type SessionIdentity = { session_id: string };
type RepairTarget<T extends SessionIdentity> = { session: T };

/** Exact count and allowed IDs; duplicate IDs are also rejected by the repair validator. */
export function sessionRepairSchema(
  sessionSchema: { properties: Record<string, unknown>; [key: string]: unknown },
  sessionIds: string[],
) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["sessions"],
    properties: {
      sessions: {
        type: "array",
        minItems: sessionIds.length,
        maxItems: sessionIds.length,
        items: {
          ...sessionSchema,
          additionalProperties: false,
          properties: {
            ...sessionSchema.properties,
            session_id: { type: "string", enum: sessionIds },
          },
        },
      },
    },
  };
}

/**
 * Repair only missing/invalid sessions, retaining every accepted response. Smaller retry batches
 * keep omissions and length limits from discarding an otherwise usable program. Each session is
 * requested at most three times; transport/provider errors are not automatically retried.
 */
export async function repairSessions<T extends SessionIdentity, Target extends RepairTarget<T>>(
  targets: Target[],
  options: {
    request: (targets: Target[], attempt: number, signal: AbortSignal) => Promise<T[]>;
    isValid: (session: T, target: Target, accepted: ReadonlyMap<string, T>) => boolean;
    batchSize?: number;
    concurrency?: number;
    signal?: AbortSignal;
  },
): Promise<T[]> {
  const accepted = new Map<string, T>();
  const attempts = new Map<string, number>();
  const batchSize = Math.min(3, Math.max(1, options.batchSize ?? 3));
  const batches: Target[][] = [];
  for (let index = 0; index < targets.length; index += batchSize) {
    batches.push(targets.slice(index, index + batchSize));
  }

  async function repairBatch(batch: Target[], signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    for (const target of batch) {
      const id = target.session.session_id;
      attempts.set(id, (attempts.get(id) ?? 0) + 1);
    }
    let response: T[] = [];
    try {
      response = await options.request(
        batch,
        Math.max(...batch.map((target) => attempts.get(target.session.session_id) ?? 1)),
        signal,
      );
    } catch (error) {
      if (!(error instanceof IncompleteStructuredResponseError)) throw error;
    }
    signal.throwIfAborted();
    const counts = new Map<string, number>();
    for (const session of response) {
      counts.set(session.session_id, (counts.get(session.session_id) ?? 0) + 1);
    }
    for (const target of batch) {
      const id = target.session.session_id;
      const candidate = response.find((session) => session.session_id === id);
      if (candidate && counts.get(id) === 1 && options.isValid(candidate, target, accepted)) {
        accepted.set(id, candidate);
      }
    }
    const pending = batch.filter((target) => !accepted.has(target.session.session_id));
    if (pending.length === 0) return;
    if (pending.some((target) => (attempts.get(target.session.session_id) ?? 0) >= 3)) {
      throw new Error(
        `Impossible de réparer les séances ${pending.map((target) => target.session.session_id).join(", ")}.`,
      );
    }
    // Split failed batches, including valid JSON that omitted IDs, instead of asking for all again.
    const retrySize = Math.max(1, Math.floor(pending.length / 2));
    for (let index = 0; index < pending.length; index += retrySize) {
      await repairBatch(pending.slice(index, index + retrySize), signal);
    }
  }

  await mapWithConcurrency(batches, options.concurrency ?? 3, repairBatch, options.signal);
  return targets.map((target) => accepted.get(target.session.session_id)!);
}
