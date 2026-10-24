import { expect, test, type Page } from "@playwright/test";
import { setupApp } from "./support/app";

async function nativeLogin(page: Page) {
  await setupApp(page, { theme: "light" });
  await page.context().route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    return origin === "http://127.0.0.1:4175" || origin === "https://vincere-test.supabase.co"
      ? route.fallback()
      : route.abort();
  });
  await page.addInitScript(() => {
    const session = JSON.parse(localStorage.getItem("sb-vincere-test-auth-token")!);
    localStorage.removeItem("sb-vincere-test-auth-token");
    const fixture = window as unknown as {
      webkit: unknown;
      Capacitor: unknown;
      fixtureSession: unknown;
      cancelSocial: boolean;
    };
    fixture.fixtureSession = session;
    fixture.cancelSocial = false;
    fixture.webkit = { messageHandlers: { bridge: {} } };
    fixture.Capacitor = {
      PluginHeaders: [
        {
          name: "NativeSignIn",
          methods: [
            { name: "apple", rtype: "promise" },
            { name: "oauth", rtype: "promise" },
          ],
        },
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
      nativePromise: async (plugin: string, method: string, options: { state?: string }) => {
        if (plugin === "NativeSignIn") {
          if (fixture.cancelSocial) throw { code: "AUTH_CANCELLED" };
          return method === "apple"
            ? { identityToken: "fixture-apple-token", state: options.state }
            : { url: "app.vincere.fitness://auth/callback?code=social-fixture&next=%2Fdashboard" };
        }
        return {};
      },
      nativeCallback: async () => "fixture-listener",
    };
  });
  await page.route("**/auth/v1/token?**", async (route) => {
    const session = await page.evaluate(
      () => (window as unknown as { fixtureSession: object }).fixtureSession,
    );
    await route.fulfill({ json: { ...session, expires_in: 3600 } });
  });
}

for (const provider of ["Apple", "Google"] as const) {
  test(`native ${provider} completes the session through the bridge`, async ({ page }, info) => {
    await nativeLogin(page);
    await page.goto("/sign-in");
    const apple = page.getByRole("button", { name: "Continuer avec Apple", exact: true });
    const google = page.getByRole("button", { name: "Continuer avec Google", exact: true });
    await expect(apple).toBeVisible();
    await expect(google).toBeVisible();
    expect((await apple.boundingBox())!.y).toBeLessThan((await google.boundingBox())!.y);
    await page.screenshot({ path: info.outputPath("native-social-login.png"), fullPage: true });
    await page.getByRole("button", { name: `Continuer avec ${provider}`, exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
  });
}

test("cancelling native login preserves the email form without an error", async ({ page }) => {
  await nativeLogin(page);
  await page.goto("/sign-up");
  await page.evaluate(() => {
    (window as unknown as { cancelSocial: boolean }).cancelSocial = true;
  });
  await page.getByRole("button", { name: "Continuer avec Apple", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continuer avec Apple", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Adresse email")).toBeVisible();
});
