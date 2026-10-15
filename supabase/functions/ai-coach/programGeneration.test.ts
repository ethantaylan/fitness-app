import { describe, expect, test, vi } from "vite-plus/test";
import {
  IncompleteStructuredResponseError,
  mapWithConcurrency,
  parseStructuredResponse,
  repairSessions,
  sessionRepairSchema,
} from "./programGeneration.ts";

// All requests below are local callbacks. This module imports no SDK or Edge Function handler.
type Session = { session_id: string; exercises: number };
type Target = { session: Session; minimum: number };
const target = (id: string): Target => ({ session: { session_id: id, exercises: 2 }, minimum: 5 });
const complete = ({ session, minimum }: Target): Session => ({ ...session, exercises: minimum });
const isValid = (session: Session, target: Target) => session.exercises >= target.minimum;

describe("repairSessions (offline)", () => {
  test("recovers the 18 omitted production IDs without regenerating accepted sessions", async () => {
    const omitted = new Set([
      "W2D1",
      "W2D2",
      "W2D3",
      "W3D1",
      "W3D2",
      "W3D3",
      "W4D2",
      "W4D3",
      "W5D2",
      "W5D3",
      "W6D2",
      "W6D3",
      "W7D1",
      "W7D2",
      "W7D3",
      "W8D1",
      "W8D2",
      "W8D3",
    ]);
    const targets = Array.from({ length: 8 }, (_, week) =>
      Array.from({ length: 3 }, (_, day) => target(`W${week + 1}D${day + 1}`)),
    ).flat();
    const requested = new Map<string, number>();
    const request = vi.fn(async (batch: Target[]) =>
      batch.flatMap((item) => {
        const id = item.session.session_id;
        const count = (requested.get(id) ?? 0) + 1;
        requested.set(id, count);
        return omitted.has(id) && count === 1 ? [] : [complete(item)];
      }),
    );

    const repaired = await repairSessions(targets, { request, isValid });

    expect(repaired.map((session) => session.session_id)).toEqual(
      targets.map(({ session }) => session.session_id),
    );
    for (const [id, count] of requested) expect(count).toBe(omitted.has(id) ? 2 : 1);
    expect(request.mock.calls.every(([batch]) => batch.length <= 3)).toBe(true);
    expect(repaired.every((session) => session.exercises === 5)).toBe(true);
  });

  test("retries missing, underfilled and duplicated IDs while preserving valid repairs", async () => {
    const targets = ["W1D1", "W1D2", "W1D3"].map(target);
    const request = vi.fn(async (batch: Target[], attempt: number) =>
      attempt === 1
        ? [
            complete(targets[0]),
            { ...targets[1].session, exercises: 1 },
            complete(targets[2]),
            complete(targets[2]),
            complete(target("W9D1")),
          ]
        : batch.map(complete),
    );
    expect(await repairSessions(targets, { request, isValid })).toEqual(targets.map(complete));
    expect(
      request.mock.calls.map(([batch]) => batch.map(({ session }) => session.session_id)),
    ).toEqual([["W1D1", "W1D2", "W1D3"], ["W1D2"], ["W1D3"]]);
  });

  test("splits a truncated repair into smaller requests", async () => {
    const targets = ["W1D1", "W1D2", "W1D3"].map(target);
    const request = vi.fn(async (batch: Target[]) => {
      if (batch.length > 1) throw new IncompleteStructuredResponseError();
      return batch.map(complete);
    });
    expect(await repairSessions(targets, { request, isValid })).toEqual(targets.map(complete));
    expect(request.mock.calls.map(([batch]) => batch.length)).toEqual([3, 1, 1, 1]);
  });

  test("bounds attempts to three per invalid session", async () => {
    const request = vi.fn(async () => [] as Session[]);
    await expect(repairSessions([target("W1D1")], { request, isValid })).rejects.toThrow(
      "Impossible de réparer les séances W1D1.",
    );
    expect(request).toHaveBeenCalledTimes(3);
  });

  test("does not retry a provider error", async () => {
    const failure = new Error("provider rejected request");
    const request = vi.fn(async (): Promise<Session[]> => {
      throw failure;
    });
    await expect(repairSessions([target("W1D1")], { request, isValid })).rejects.toBe(failure);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe("mapWithConcurrency", () => {
  test("aborts active requests and stops queued work after the first error", async () => {
    const started: number[] = [];
    const failure = new Error("first batch failed");
    let rejectFirst: (reason: unknown) => void = () => {};
    let activeAborted = false;
    const result = mapWithConcurrency([1, 2, 3, 4], 2, async (item, signal) => {
      started.push(item);
      return new Promise<number>((_resolve, reject) => {
        if (item === 1) rejectFirst = reject;
        else
          signal.addEventListener(
            "abort",
            () => {
              activeAborted = true;
              reject(signal.reason);
            },
            { once: true },
          );
      });
    });
    rejectFirst(failure);
    await expect(result).rejects.toBe(failure);
    expect(started).toEqual([1, 2]);
    expect(activeAborted).toBe(true);
  });

  test("propagates cancellation of the parent request", async () => {
    const controller = new AbortController();
    const failure = new Error("request closed");
    const request = vi.fn(
      async (_item: number, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const result = mapWithConcurrency([1, 2], 1, request, controller.signal);
    controller.abort(failure);
    await expect(result).rejects.toBe(failure);
    expect(request).toHaveBeenCalledTimes(1);
  });

  test("keeps the input order on success", async () => {
    expect(await mapWithConcurrency([3, 1, 2], 2, async (item) => item * 2)).toEqual([6, 2, 4]);
  });
});

describe("structured response contract", () => {
  test("constrains repairs to the requested IDs and exact number of sessions", () => {
    const base = {
      type: "object",
      additionalProperties: false,
      required: ["session_id"],
      properties: { session_id: { type: "string", pattern: "^W[1-9][0-9]*D[1-7]$" } },
    };
    const schema = sessionRepairSchema(base, ["W2D1", "W2D3"]);
    expect(schema.properties.sessions.minItems).toBe(2);
    expect(schema.properties.sessions.maxItems).toBe(2);
    expect(schema.properties.sessions.items.properties.session_id).toEqual({
      type: "string",
      enum: ["W2D1", "W2D3"],
    });
    expect(schema.properties.sessions.items.additionalProperties).toBe(false);
    expect(base.properties.session_id).toHaveProperty("pattern");
  });

  test("detects a length limit even when content contains parseable JSON", () => {
    expect(() =>
      parseStructuredResponse({
        finish_reason: "length",
        message: { content: '{"sessions":[]}' },
      }),
    ).toThrow(IncompleteStructuredResponseError);
    expect(() =>
      parseStructuredResponse({
        finish_reason: "length",
        message: { content: '{"sessions":[' },
      }),
    ).toThrow(IncompleteStructuredResponseError);
  });

  test("parses a completed response and preserves a refusal", () => {
    expect(
      parseStructuredResponse({
        finish_reason: "stop",
        message: { content: '{"sessions":[]}' },
      }),
    ).toEqual({ sessions: [] });
    expect(() =>
      parseStructuredResponse({
        finish_reason: "stop",
        message: { refusal: "Refus explicite" },
      }),
    ).toThrow("Refus explicite");
  });
});
