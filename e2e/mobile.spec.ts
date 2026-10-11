import { expect, test, type Page } from "@playwright/test";

const id = "00000000-0000-0000-0000-000000000001";
const user = {
  id,
  email: "fixture@example.test",
  role: "authenticated",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const profile = {
  objective: "running",
  gender: "homme",
  age: 30,
  height: 180,
  weight: 75,
  level: "débutant",
  weeklyFrequency: 3,
  sessionDuration: [30],
  equipment: [],
  likedExercises: [],
  dislikedExercises: [],
  injuries: "",
  nutritionRestrictions: "",
  availability: ["soir"],
};
const workout = {
  uid: "fixture",
  date: "Jeudi 8 octobre",
  intensity: "Modérée",
  goal: "Endurance",
  duration_min: 30,
  warmup: [],
  cooldown: [],
  motivation_message: "",
  blocks: [
    {
      block_name: "Course",
      exercises: [{ name: "Course en endurance", sets: 1, reps: "20 min", rest_sec: 60 }],
    },
  ],
};

async function setup(page: Page, theme: "light" | "dark", signedIn = false) {
  await page.route("https://vincere-test.supabase.co/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];
    if (path.startsWith("/auth/v1/user")) body = user;
    else if (path.endsWith("/users")) body = { ...user, first_name: "Test", subscription: "free" };
    else if (path.endsWith("/user_profiles"))
      body = {
        user_id: id,
        objective: "running",
        gender: "homme",
        age: 30,
        height_cm: 180,
        weight_kg: 75,
        level: "débutant",
        weekly_frequency: 3,
        session_duration: [30],
        equipment: [],
        availability: ["soir"],
      };
    else if (path.endsWith("/programs") || path.endsWith("/onboarding_progress")) body = null;
    else if (path.endsWith("/recover")) body = {};
    else if (path.endsWith("/logout")) {
      await route.fulfill({ status: 204 });
      return;
    } else if (path.includes("/functions/")) {
      await route.fulfill({ status: 503, json: { error: "Test : service indisponible." } });
      return;
    }
    await route.fulfill({ json: body });
  });
  await page.addInitScript(
    ({ theme, signedIn, user, profile, workout }) => {
      localStorage.setItem("vincere-theme-mode", theme);
      if (signedIn) {
        localStorage.setItem(
          "sb-vincere-test-auth-token",
          JSON.stringify({
            access_token: "fixture-access-token",
            refresh_token: "fixture-refresh-token",
            expires_at: 4102444800,
            expires_in: 3600,
            token_type: "bearer",
            user,
          }),
        );
        localStorage.setItem(
          `Vincere_state_${user.id}`,
          JSON.stringify({
            profile,
            program: null,
            programStartDate: null,
            sessions: [workout],
            records: [],
            onboardingStep: 0,
          }),
        );
      }
    },
    { theme, signedIn, user, profile, workout },
  );
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}

for (const theme of ["light", "dark"] as const) {
  test(`guest entry and theme: ${theme}`, async ({ page }, info) => {
    await setup(page, theme);
    await page.goto("/explore");
    await expect(
      page.getByRole("heading", { name: "Construis un programme qui suit ton objectif." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Créer mon programme/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "J'ai déjà un compte" })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`guest-${theme}.png`), fullPage: true });
  });

  test(`public account and legal screens: ${theme}`, async ({ page }, info) => {
    await setup(page, theme);
    for (const path of [
      "/sign-in",
      "/sign-up",
      "/reset-password",
      "/privacy",
      "/terms",
      "/support",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await noOverflow(page);
      await page.screenshot({
        path: info.outputPath(`${path.slice(1)}-${theme}.png`),
        fullPage: true,
      });
    }
    await expect(page.getByRole("link", { name: "taylanethan@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:taylanethan@gmail.com",
    );
  });

  test(`connected layouts and account controls: ${theme}`, async ({ page }, info) => {
    await setup(page, theme, true);
    for (const path of [
      "/dashboard",
      "/builder",
      "/session?uid=fixture",
      "/result",
      "/records",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.locator(".app-top-nav")).toBeVisible();
      if (path === "/builder") {
        await page.getByRole("button", { name: "Jambes +10 min", exact: true }).click();
        await expect(page.locator(".app-builder-cart")).toBeVisible();
        const bottomNav = await page.locator(".app-bottom-nav").isVisible();
        if (bottomNav) {
          const navigation = await page.locator(".app-bottom-nav").boundingBox();
          if (navigation)
            await expect
              .poll(async () => {
                const panel = await page.locator(".app-builder-cart").boundingBox();
                return panel ? panel.y + panel.height : Infinity;
              })
              .toBeLessThanOrEqual(navigation.y);
        }
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await noOverflow(page);
      const heading = await page.locator("h1").first().boundingBox();
      const nav = await page.locator(".app-top-nav").boundingBox();
      if (heading && nav) expect(heading.y).toBeGreaterThanOrEqual(nav.y + nav.height);
      await page.screenshot({
        path: info.outputPath(`${path.split("?")[0].slice(1)}-${theme}.png`),
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Compte", exact: true }).click();
    await page.getByRole("button", { name: "Supprimer mon compte", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Supprimer définitivement", exact: true }),
    ).toBeDisabled();
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`account-${theme}.png`), fullPage: true });
  });

  test(`AI refusal prevents any server request: ${theme}`, async ({ page }, info) => {
    await setup(page, theme, true);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().includes("/functions/v1/ai-coach")) requests++;
    });
    await page.goto("/session?uid=fixture");
    await page.getByTitle("Remplacer cet exercice").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: info.outputPath(`ai-consent-${theme}.png`), fullPage: true });
    await page.getByRole("button", { name: "Pas maintenant" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("alert")).toContainText("n'a pas été autorisé");
    expect(requests).toBe(0);
  });
}

test("password recovery sends an email request instead of waiting forever", async ({ page }) => {
  await setup(page, "light");
  await page.goto("/reset-password");
  await page.getByLabel("Adresse e-mail").fill("fixture@example.test");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("status")).toContainText("Si un compte correspond");
});
