import { describe, expect, test } from "vite-plus/test";
import { parseNativeAuthUrl } from "./nativeAuth";
import { sanitizeNextPath } from "./authRedirect";
import { formatTimer, remainingSeconds } from "./timer";
import { encodeSharedSession, parseSharedSession } from "./sharedSession";
import type { DailySession } from "./types";

describe("native authentication", () => {
  test("accepts a PKCE callback and its internal destination", () => {
    expect(
      parseNativeAuthUrl("app.vincere.fitness://auth/callback?code=valid&next=%2Freset-password"),
    ).toEqual({ code: "valid", next: "/reset-password" });
  });
  test.each([
    "https://auth/callback?code=valid",
    "app.vincere.fitness://other/callback?code=valid",
    "app.vincere.fitness://auth/other?code=valid",
    "app.vincere.fitness://auth/callback#access_token=token",
    "app.vincere.fitness://auth/callback?code=first&code=second",
    "app.vincere.fitness://other@auth/callback?code=valid",
  ])("rejects unexpected callbacks: %s", (url) => expect(parseNativeAuthUrl(url)).toBeNull());
  test.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%5cevil.test",
    "/%2fevil.test",
    "/sign-in#loop",
    "/x/../sign-up",
  ])("rejects external destinations and auth loops: %s", (url) =>
    expect(sanitizeNextPath(url)).toBe("/dashboard"),
  );
});

test("timer uses elapsed wall time after backgrounding", () => {
  expect(remainingSeconds(60000, 50100)).toBe(10);
  expect(remainingSeconds(60000, 90000)).toBe(0);
  expect(formatTimer(90)).toBe("1:30");
  expect(formatTimer(0)).toBe("0:00");
});

const session: DailySession = {
  uid: "private-id",
  date: "Jeudi",
  goal: "Endurance",
  duration_min: 30,
  intensity: "Modérée",
  warmup: [],
  cooldown: [],
  motivation_message: "Motivation personnelle",
  notes: "Note privée",
  feedback: "hard",
  blocks: [
    {
      block_name: "Course",
      exercises: [
        { name: "Course", sets: 1, reps: "20 min", notes: "Information de santé privée" },
      ],
    },
  ],
};
test("shared workouts exclude identity and private notes", () => {
  const encoded = encodeSharedSession(session);
  const raw = decodeURIComponent(atob(encoded));
  expect(raw).not.toContain("private-id");
  expect(raw).not.toContain("privée");
  expect(raw).not.toContain("feedback");
  expect(parseSharedSession(encoded)?.blocks[0].exercises[0].name).toBe("Course");
});
test.each([null, "not-base64", btoa("null"), btoa('{"blocks":{}}'), "x".repeat(100001)])(
  "invalid shared links fail safely",
  (value) => expect(parseSharedSession(value)).toBeNull(),
);
