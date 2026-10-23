import { describe, expect, test, vi } from "vite-plus/test";
import { NativeAuthCodeGuard } from "./nativeAuth";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
}

describe("native authentication callback replay", () => {
  test("claims simultaneous launch and appUrlOpen callbacks only once", async () => {
    const guard = new NativeAuthCodeGuard();
    expect(
      await Promise.all([guard.claim("one-use-code", null), guard.claim("one-use-code", null)]),
    ).toEqual([true, false]);
  });

  test("a WebView reload does not replay a previously consumed code", async () => {
    const saved = storage();
    expect(await new NativeAuthCodeGuard().claim("used-recovery-code", saved)).toBe(true);
    expect(await new NativeAuthCodeGuard().claim("used-recovery-code", saved)).toBe(false);
    expect(await new NativeAuthCodeGuard().claim("new-recovery-code", saved)).toBe(true);
    expect([...saved.values.values()].join()).not.toContain("recovery-code");
    expect([...saved.values.values()][0]).toMatch(/^[a-f0-9]{64}$/);
  });

  test("unavailable storage does not block a fresh login or repeated-code protection", async () => {
    const unavailable = vi.fn(() => {
      throw new Error("Storage unavailable");
    });
    const guard = new NativeAuthCodeGuard();
    const saved = { getItem: unavailable, setItem: unavailable };
    expect(await guard.claim("first", saved)).toBe(true);
    expect(await guard.claim("first", saved)).toBe(false);
    expect(await guard.claim("second", saved)).toBe(true);
  });
});
