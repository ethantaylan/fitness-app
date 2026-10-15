import { expect, test } from "@playwright/test";
import { id, setupApp } from "./support/app";

// This entire suite runs against the fake Supabase origin configured in playwright.config.ts.
// No remote request can reach a live API, even if an unexpected URL is introduced.
test("received fixture survives navigation, a failed save and reload without a second AI request", async ({
  page,
  context,
}) => {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:4175") return route.continue();
    if (url.origin === "https://vincere-test.supabase.co") return route.fallback();
    return route.abort();
  });
  const { profile, program: databaseFixture } = await setupApp(page, {
    theme: "light",
    objective: "running",
    empty: true,
  });
  let received = 0;
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let saves = 0;
  const savedIds: string[] = [];
  let active: typeof databaseFixture | null = null;
  await page.route("https://vincere-test.supabase.co/functions/v1/ai-coach", async (route) => {
    received += 1;
    await responseGate;
    await route.fulfill({
      json: {
        result: {
          user_profile: profile,
          program_overview: {
            duration_weeks: 8,
            training_days_per_week: 4,
            summary: "Programme fictif local",
          },
          weeks: [],
        },
      },
    });
  });
  await page.route(
    "https://vincere-test.supabase.co/rest/v1/rpc/save_generated_program",
    async (route) => {
      const payload = route.request().postDataJSON() as { p_program_id: string };
      saves += 1;
      savedIds.push(payload.p_program_id);
      if (saves === 1) {
        await route.fulfill({ status: 500, json: { message: "Offline fixture" } });
        return;
      }
      active = { ...databaseFixture, id: payload.p_program_id };
      await route.fulfill({ json: payload.p_program_id });
    },
  );
  await page.route("https://vincere-test.supabase.co/rest/v1/programs?**", (route) =>
    route.fulfill({ json: active }),
  );

  await page.goto("/generating");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".app-generation")).toContainText("en cours de création");
  // Navigate through the SPA while the response is still pending.
  const follow = page.locator(".app-top-nav").getByRole("link", { name: "Suivi", exact: true });
  if ((page.viewportSize()?.width ?? 0) >= 768) await follow.click();
  else
    await page
      .locator(".app-bottom-nav")
      .getByRole("button", { name: "Suivi", exact: true })
      .click();
  await expect(page).toHaveURL(/\/records$/);
  release();
  await expect(page.locator(".app-generation")).toContainText(
    "Ton programme attend son enregistrement",
  );
  await expect.poll(() => saves).toBe(1);
  expect(received).toBe(1);
  expect(
    await page.evaluate((userId) => localStorage.getItem(`Vincere_pending_program_${userId}`), id),
  ).not.toBeNull();

  await page.reload();
  await expect(page.locator(".app-generation")).toContainText("conservé sur cet appareil");
  // Wait until hydration has completed before asking to save the retained fixture.
  await expect(page.getByRole("heading", { name: "Suivi", exact: true })).toBeVisible();
  await page
    .locator(".app-generation")
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Ton programme est prêt" }),
  ).toBeVisible();
  expect(saves).toBe(2);
  expect(savedIds[0]).toBe(savedIds[1]);
  expect(received).toBe(1);
  expect(
    await page.evaluate((userId) => localStorage.getItem(`Vincere_pending_program_${userId}`), id),
  ).toBeNull();
});
