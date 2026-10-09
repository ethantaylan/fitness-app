import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), updateUser: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { auth } }));
import {
  AI_CONSENT_VERSION,
  answerAIConsent,
  isAIConsentPending,
  requestAIConsent,
  revokeAIConsent,
} from "./aiConsent";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "user-a", user_metadata: {} } } },
  });
  auth.updateUser.mockResolvedValue({ error: null });
});
afterEach(async () => {
  await answerAIConsent(false);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("no consent is assumed and refusal does not update the account", async () => {
  const result = requestAIConsent();
  await vi.waitFor(() => expect(isAIConsentPending()).toBe(true));
  await answerAIConsent(false);
  expect(await result).toBe(false);
  expect(auth.updateUser).not.toHaveBeenCalled();
});
test("acceptance is stored for the current account and shared by concurrent requests", async () => {
  const first = requestAIConsent();
  const second = requestAIConsent();
  await vi.waitFor(() => expect(isAIConsentPending()).toBe(true));
  await answerAIConsent(true);
  expect(await first).toBe(true);
  expect(await second).toBe(true);
  expect(auth.updateUser).toHaveBeenCalledWith({
    data: { ai_consent_version: AI_CONSENT_VERSION, ai_consent_at: expect.any(String) },
  });
});
test("account switching while the dialog is open cancels acceptance", async () => {
  const result = requestAIConsent();
  await vi.waitFor(() => expect(isAIConsentPending()).toBe(true));
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "user-b", user_metadata: {} } } },
  });
  await answerAIConsent(true);
  expect(await result).toBe(false);
  expect(auth.updateUser).not.toHaveBeenCalled();
});
test("a failed save keeps the request blocked", async () => {
  const result = requestAIConsent();
  await vi.waitFor(() => expect(isAIConsentPending()).toBe(true));
  auth.updateUser.mockResolvedValue({ error: new Error("network") });
  await expect(answerAIConsent(true)).rejects.toThrow();
  expect(isAIConsentPending()).toBe(true);
  await answerAIConsent(false);
  expect(await result).toBe(false);
});
test("withdrawing consent clears account and anonymous consent", async () => {
  localStorage.setItem("vincere-ai-consent-anon", AI_CONSENT_VERSION);
  await revokeAIConsent();
  expect(auth.updateUser).toHaveBeenCalledWith({
    data: { ai_consent_version: null, ai_consent_at: null },
  });
  expect(localStorage.getItem("vincere-ai-consent-anon")).toBeNull();
});
