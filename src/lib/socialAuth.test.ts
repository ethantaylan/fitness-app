import { beforeEach, expect, test, vi } from "vite-plus/test";
const mocks = vi.hoisted(() => ({
  native: true,
  apple: vi.fn(),
  oauth: vi.fn(),
  oauthStart: vi.fn(),
  token: vi.fn(),
  exchange: vi.fn(),
  claim: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "ios", isNativePlatform: () => mocks.native },
  registerPlugin: () => ({ apple: mocks.apple, oauth: mocks.oauth }),
}));
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: mocks.oauthStart,
      signInWithIdToken: mocks.token,
      exchangeCodeForSession: mocks.exchange,
    },
  },
}));
vi.mock("./appUrl", () => ({
  getAppRedirectUrl: () => "app.vincere.fitness://auth/callback?next=%2Fdashboard",
}));
vi.mock("./nativeAuth", async (original) => ({
  ...(await original<typeof import("./nativeAuth")>()),
  nativeAuthCodeGuard: { claim: mocks.claim },
}));
import { hashNonce, isSocialAuthCancelled, signInWithSocial } from "./socialAuth";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.native = true;
  vi.stubGlobal("localStorage", {});
  mocks.claim.mockResolvedValue(true);
  mocks.token.mockResolvedValue({ error: null });
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.oauthStart.mockResolvedValue({
    data: { url: "https://fixture.supabase.co/auth/v1/authorize" },
    error: null,
  });
  mocks.oauth.mockResolvedValue({
    url: "app.vincere.fitness://auth/callback?code=fixture-code&next=%2Fdashboard",
  });
});

test("Apple sends a hashed nonce to iOS and its original to Supabase", async () => {
  mocks.apple.mockImplementation(async ({ state }) => ({
    identityToken: "fixture-id-token",
    state,
  }));
  await signInWithSocial("apple", "/dashboard");
  const nativeNonce = mocks.apple.mock.calls[0][0].nonce;
  const request = mocks.token.mock.calls[0][0];
  expect(request.provider).toBe("apple");
  expect(nativeNonce).toBe(await hashNonce(request.nonce));
  expect(nativeNonce).not.toBe(request.nonce);
});

test("Apple rejects a changed state before exchanging the token", async () => {
  mocks.apple.mockResolvedValue({ identityToken: "fixture-token", state: "wrong-state" });
  await expect(signInWithSocial("apple", "/dashboard")).rejects.toThrow("vérifiée");
  expect(mocks.token).not.toHaveBeenCalled();
});

test("native Google uses the system session and exchanges a single PKCE code", async () => {
  await signInWithSocial("google", "/dashboard");
  expect(mocks.oauthStart.mock.calls[0][0].options.skipBrowserRedirect).toBe(true);
  expect(mocks.oauth).toHaveBeenCalledTimes(1);
  expect(mocks.exchange).toHaveBeenCalledWith("fixture-code");
  mocks.claim.mockResolvedValue(false);
  await signInWithSocial("google", "/dashboard");
  expect(mocks.exchange).toHaveBeenCalledTimes(1);
});

test("web Google keeps the existing redirect flow", async () => {
  mocks.native = false;
  await signInWithSocial("google", "/dashboard");
  expect(mocks.oauthStart.mock.calls[0][0].options.skipBrowserRedirect).toBe(false);
  expect(mocks.oauth).not.toHaveBeenCalled();
});

test("invalid Google callback is rejected and cancellation is distinguishable", async () => {
  mocks.oauth.mockResolvedValue({ url: "https://untrusted.example/?code=fixture" });
  await expect(signInWithSocial("google", "/dashboard")).rejects.toThrow("n’a pas abouti");
  expect(mocks.exchange).not.toHaveBeenCalled();
  expect(isSocialAuthCancelled({ code: "AUTH_CANCELLED" })).toBe(true);
  expect(isSocialAuthCancelled(new Error("failed"))).toBe(false);
});
