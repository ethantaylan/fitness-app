import { expect, test } from "@playwright/test";
import { setupApp } from "./support/app";

test("validation au bas de l’écran, progression et remise à zéro persistées", async ({ page }) => {
  const { program } = await setupApp(page, { theme: "dark" });
  let resets = 0;
  let completions = 0;
  await page.route("**/rest/v1/program_sessions?**", async (route) => {
    const label = new URL(route.request().url()).searchParams
      .get("session_label")
      ?.replace("eq.", "");
    const update = route.request().postDataJSON();
    for (const week of program.program_weeks) {
      const session = week.program_sessions.find((item) => item.session_label === label);
      if (session) session.completed_at = update.completed_at;
    }
    completions++;
    await route.fulfill({ json: { id: "session-1" } });
  });
  await page.route("**/rpc/reset_program_weeks", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.p_program_id).toBe("program-1");
    for (const week of program.program_weeks) {
      if (week.week_number === body.p_week || (body.p_following && week.week_number > body.p_week))
        for (const session of week.program_sessions) session.completed_at = null;
    }
    resets++;
    await route.fulfill({ json: null });
  });
  await page.goto("/result?week=2&session=W2D1");
  await expect(
    page.getByRole("checkbox", { name: "Marquer la séance 1 comme réalisée" }),
  ).toBeDisabled();
  expect(completions).toBe(0);
  for (const index of [1, 3, 4]) {
    await page.goto(`/result?week=1&session=W1D${index}`);
    const button = page.getByRole("checkbox", {
      name: `Marquer la séance ${index} comme réalisée`,
    });
    await expect(button).toBeEnabled();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const dock = page.locator(".session-completion-dock");
    const box = await dock.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.y + box!.height - page.viewportSize()!.height)).toBeLessThanOrEqual(2);
    await button.click();
    await expect(page.getByRole("checkbox")).toBeChecked();
  }
  expect(completions).toBe(3);
  await page.goto("/result?week=2&session=W2D1");
  await expect(
    page.getByRole("checkbox", { name: "Marquer la séance 1 comme réalisée" }),
  ).toBeEnabled();
  await page.goto("/result?week=1");
  await page.getByRole("button", { name: "Recommencer cette semaine" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Recommencer", exact: true }).click();
  await expect.poll(() => resets).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Marquer la séance 1 comme réalisée" }),
  ).not.toBeChecked();
  await page.goto("/result?week=2&session=W2D1");
  await expect(
    page.getByRole("checkbox", { name: "Marquer la séance 1 comme réalisée" }),
  ).toBeDisabled();
});

test("Santé explique la disponibilité iPhone et le parcours Garmin sur le web", async ({
  page,
}) => {
  await setupApp(page, { theme: "light" });
  await page.goto("/settings?tab=compte");
  await expect(page.getByRole("heading", { name: "Santé et montres" })).toBeVisible();
  await expect(page.getByText(/Ouvre Vincere sur ton iPhone/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Connecter Apple Santé" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Garmin/ })).toBeVisible();
});

test("la connexion ne comporte plus de bouton retour", async ({ page }) => {
  await page.route("https://vincere-test.supabase.co/**", (route) => route.fulfill({ json: null }));
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Retour à l’accueil" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Content de te revoir" })).toBeVisible();
});

test("activité Santé : confirmation obligatoire et association unique", async ({ page }) => {
  await setupApp(page, { theme: "dark" });
  await page.addInitScript(() => {
    const target = window as unknown as {
      CapacitorCustomPlatform: { name: string };
      Capacitor: unknown;
    };
    target.CapacitorCustomPlatform = { name: "ios" };
    target.Capacitor = {
      PluginHeaders: [
        {
          name: "VincereHealth",
          methods: ["availability", "requestAccess", "workouts"].map((name) => ({
            name,
            rtype: "promise",
          })),
        },
      ],
      nativePromise: async (_plugin: string, method: string) => {
        if (method === "availability") return { available: true };
        if (method === "requestAccess") return { requested: true };
        return {
          activities: [
            {
              id: "health-fixture",
              type: "Course à pied",
              start: "2026-11-08T10:00:00Z",
              end: "2026-11-08T10:30:00Z",
              durationSeconds: 1800,
              distanceMeters: 5000,
              sourceName: "Apple Watch",
            },
          ],
        };
      },
    };
  });
  let associations = 0;
  await page.route("**/rpc/link_health_activity", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.p_external_id).toBe("health-fixture");
    expect(body.p_program_id).toBe("program-1");
    expect(body.p_session).toBe("W1D1");
    associations++;
    await route.fulfill({ json: "session-id" });
  });
  await page.goto("/settings?tab=compte");
  await page.getByRole("button", { name: "Connecter Apple Santé" }).click();
  await expect(page.getByText("Course à pied", { exact: true })).toBeVisible();
  expect(associations).toBe(0);
  await page.getByRole("button", { name: "Associer à une séance" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByRole("combobox")).toHaveValue("1:W1D1");
  await expect(modal.getByRole("option", { name: /Semaine 2/ })).toHaveCount(0);
  expect(associations).toBe(0);
  await modal.getByRole("button", { name: "Confirmer et valider" }).click();
  await expect(page.getByText("Déjà associée", { exact: true })).toBeVisible();
  expect(associations).toBe(1);
  await expect(page.getByRole("button", { name: "Associer à une séance" })).toHaveCount(0);
});

test("un échec de sauvegarde ne valide pas la séance", async ({ page }) => {
  await setupApp(page, { theme: "light" });
  await page.route("**/rest/v1/program_sessions?**", (route) =>
    route.fulfill({ status: 403, json: { message: "Permission denied" } }),
  );
  await page.goto("/result?week=1&session=W1D1");
  await page.getByRole("checkbox", { name: "Marquer la séance 1 comme réalisée" }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("status")).toContainText("Validation impossible");
});
