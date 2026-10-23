import { expect, test, type Page } from "@playwright/test";
import { setupApp } from "./support/app";

const callback = "app.vincere.fitness://auth/callback?code=recovery-fixture&next=%2Freset-password";
const expiredMessage = "Ce lien a expiré ou a déjà été utilisé.";

async function setupNative(page: Page) {
  await setupApp(page, { theme: "light", objective: "running" });
  await page.context().route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === "http://127.0.0.1:4175" || origin === "https://vincere-test.supabase.co")
      return route.fallback();
    return route.abort();
  });
  await page.addInitScript((launchUrl) => {
    const nativeWindow = window as unknown as {
      webkit: unknown;
      Capacitor: unknown;
    };
    nativeWindow.webkit = { messageHandlers: { bridge: {} } };
    const listeners = new Map<string, (event: unknown) => void>();
    nativeWindow.Capacitor = {
      PluginHeaders: [
        { name: "App", methods: [{ name: "getLaunchUrl", rtype: "promise" }] },
        { name: "Keyboard", methods: [] },
        { name: "SplashScreen", methods: [{ name: "hide", rtype: "promise" }] },
        { name: "StatusBar", methods: [{ name: "setStyle", rtype: "promise" }] },
      ].map((header) => ({
        ...header,
        methods: [
          ...header.methods,
          { name: "addListener", rtype: "callback" },
          { name: "removeListener", rtype: "promise" },
        ],
      })),
      nativePromise: async (_plugin: string, method: string, options?: { callbackId?: string }) => {
        if (method === "getLaunchUrl") return { url: launchUrl };
        if (method === "removeListener" && options?.callbackId)
          listeners.delete(options.callbackId);
        return {};
      },
      nativeCallback: async (
        plugin: string,
        _method: string,
        options: { eventName: string },
        listener: (event: unknown) => void,
      ) => {
        const id = `${plugin}:${options.eventName}`;
        listeners.set(id, listener);
        return id;
      },
    };
    window.addEventListener("fixture-native-url", (event) => {
      listeners.get("App:appUrlOpen")?.({ url: (event as CustomEvent<string>).detail });
    });
    localStorage.setItem(
      "sb-vincere-test-auth-token-code-verifier",
      "fixture-verifier/PASSWORD_RECOVERY",
    );
  }, callback);
}

test("a successful recovery is not exchanged again after navigation, a duplicate event or reload", async ({
  page,
}) => {
  await setupNative(page);
  let exchanges = 0;
  await page.route("https://vincere-test.supabase.co/auth/v1/token?**", async (route) => {
    exchanges += 1;
    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("sb-vincere-test-auth-token")!),
    );
    await route.fulfill({ json: { ...session, expires_in: 3600 } });
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toBeVisible();
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("offline-fixture-password");
  await page.getByLabel("Confirmer le mot de passe").fill("offline-fixture-password");
  await page.getByRole("button", { name: "Mettre à jour", exact: true }).click();
  await expect(page.getByText("Ton mot de passe a été mis à jour.")).toBeVisible();
  await page.getByRole("link", { name: "Continuer", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.evaluate(
    (url) => window.dispatchEvent(new CustomEvent("fixture-native-url", { detail: url })),
    callback,
  );
  await expect(page.getByText(expiredMessage, { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
  await expect(page.getByText(expiredMessage, { exact: false })).toHaveCount(0);
  expect(exchanges).toBe(1);
});

test("dismissing an expired callback survives navigation and reload while a new link still works", async ({
  page,
}) => {
  await setupNative(page);
  let exchanges = 0;
  await page.route("https://vincere-test.supabase.co/auth/v1/token?**", async (route) => {
    exchanges += 1;
    if (exchanges === 1) {
      await route.fulfill({
        status: 400,
        json: { code: "flow_state_not_found", message: "Expired fixture" },
      });
      return;
    }
    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("sb-vincere-test-auth-token")!),
    );
    await route.fulfill({ json: { ...session, expires_in: 3600 } });
  });
  await page.goto("/dashboard");
  await expect(page.getByText(expiredMessage, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Fermer le message", exact: true }).click();
  if ((page.viewportSize()?.width ?? 0) >= 768)
    await page.locator(".app-top-nav").getByRole("link", { name: "Suivi", exact: true }).click();
  else
    await page
      .locator(".app-bottom-nav")
      .getByRole("button", { name: "Suivi", exact: true })
      .click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(page.getByText(expiredMessage, { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Suivi", exact: true })).toBeVisible();
  await expect(page.getByText(expiredMessage, { exact: false })).toHaveCount(0);
  expect(exchanges).toBe(1);
  await page.evaluate(
    (url) => window.dispatchEvent(new CustomEvent("fixture-native-url", { detail: url })),
    callback.replace("recovery-fixture", "new-recovery-fixture"),
  );
  await expect(page).toHaveURL(/\/reset-password$/);
  expect(exchanges).toBe(2);
});
