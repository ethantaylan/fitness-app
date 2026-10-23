import { expect, test } from "@playwright/test";
import { setupApp, id } from "./support/app";

test("first connection configures the profile without AI and reuses it", async ({ page }) => {
  await setupApp(page, { theme: "dark", empty: true });
  await page.addInitScript((id) => localStorage.removeItem(`Vincere_state_${id}`), id);
  let stored: Record<string, unknown> | null = null;
  let calls = 0;
  let rejectSave = true;
  await page.route("**/rest/v1/user_profiles*", async (route) => {
    if (route.request().method() === "POST") {
      if (rejectSave) {
        rejectSave = false;
        await route.fulfill({ status: 500, json: { message: "Fixture save failure" } });
        return;
      }
      stored = route.request().postDataJSON();
    }
    await route.fulfill({ json: stored });
  });
  await page.route("**/rest/v1/users*", async (route) => {
    await route.fulfill({ json: { id, first_name: "Athlete", email: "audit@example.test" } });
  });
  await page.route("**/functions/v1/**", async (route) => {
    calls++;
    await route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/onboarding\?setup=1/);
  await page.getByLabel("Ton pseudo").fill("Athlete");
  const next = () => page.getByRole("button", { name: /Continuer|Finaliser/ }).click();
  await next();
  await page.getByRole("button", { name: /Running/ }).click();
  await page.getByLabel("Objectif perso").fill("Courir 10 km sans marcher");
  await next();
  await page.getByRole("button", { name: /Homme/ }).click();
  await next();
  await page.getByRole("button", { name: /Débutant/ }).click();
  await next();
  await page.getByLabel("Âge", { exact: true }).fill("28");
  await page.getByLabel("Taille", { exact: true }).fill("178");
  await page.getByLabel("Poids actuel").fill("72");
  await next(); // frequency
  await next(); // duration
  if (
    !(
      (await page.getByRole("button", { name: /45 minutes/ }).getAttribute("aria-pressed")) ===
      "true"
    )
  )
    await page.getByRole("button", { name: /45 minutes/ }).click();
  await next(); // equipment
  await next(); // liked
  await next(); // disliked
  await next(); // availability
  await page.getByRole("button", { name: /Indifférent/ }).click();
  await next(); // constraints
  await next(); // timeline
  await next(); // final
  await page.screenshot({ path: "artifacts/profile-setup-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(page.getByRole("alert")).toContainText("Impossible d’enregistrer");
  await expect(page).toHaveURL(/onboarding\?setup=1/);
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(stored).toMatchObject({ age: 28, height_cm: 178, weight_kg: 72, objective: "running" });
  expect(calls).toBe(0);
  await page.goto("/onboarding");
  await expect(page.getByLabel("Objectif perso")).toHaveValue("Courir 10 km sans marcher");
  await next();
  await next();
  await next();
  await expect(page.getByLabel("Âge", { exact: true })).toHaveValue("28");
  await expect(page.getByLabel("Taille", { exact: true })).toHaveValue("178");
  expect(calls).toBe(0);
});

test("profile save stays in the document and dark header is opaque", async ({ page }) => {
  await setupApp(page, { theme: "dark" });
  await page.goto("/settings");
  const save = page.getByRole("button", { name: "Enregistrer les modifications" });
  await expect(save).toBeVisible();
  await expect(save).toBeDisabled();
  expect(
    await save.evaluate((button) => {
      for (let node: Element | null = button; node; node = node.parentElement) {
        if (["fixed", "sticky", "absolute"].includes(getComputedStyle(node).position)) return false;
      }
      return true;
    }),
  ).toBe(true);
  const nav = page.locator(".app-top-nav");
  expect(await nav.evaluate((node) => getComputedStyle(node).backdropFilter)).toBe("none");
  expect(await nav.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toContain(
    "255, 255, 255",
  );
  await page.screenshot({ path: "artifacts/profile-header-dark.png" });
});
