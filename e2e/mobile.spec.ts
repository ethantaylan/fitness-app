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

async function setup(page: Page, theme: "light" | "dark", signedIn = false, aiConsent = false) {
  await page.route("https://vincere-test.supabase.co/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];
    if (path.startsWith("/auth/v1/user")) body = user;
    else if (path.endsWith("/rpc/upsert_user"))
      body = { id, email: user.email, first_name: "Test", subscription: "free" };
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
    else if (path.endsWith("/programs"))
      body =
        request.method() === "POST"
          ? { id: "fixture-program" }
          : request.method() === "GET"
            ? new URL(request.url()).searchParams.get("select") === "id"
              ? []
              : null
            : {};
    else if (
      path.endsWith("/program_weeks") ||
      path.endsWith("/program_sessions") ||
      path.endsWith("/program_session_blocks")
    )
      body = { id: "fixture-child" };
    else if (path.endsWith("/onboarding_progress")) body = null;
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
    ({ theme, signedIn, aiConsent, user, profile, workout }) => {
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
            user: aiConsent
              ? { ...user, user_metadata: { ai_consent_version: "2026-10-08" } }
              : user,
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
    { theme, signedIn, aiConsent, user, profile, workout },
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
        await page.getByRole("button", { name: "Endurance +15 min", exact: true }).click();
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
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
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

for (const theme of ["light", "dark"] as const) {
  test(`the last onboarding step clearly starts program generation: ${theme}`, async ({
    page,
  }, info) => {
    await setup(page, theme, true);
    await page.goto("/onboarding");
    const advanceTo = async (heading: RegExp) => {
      await page.getByRole("button", { name: /Continuer|Finaliser/ }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    };
    await page.getByRole("button", { name: /Running/ }).click();
    await expect(page.getByText("Choisis aussi un objectif précis pour continuer.")).toBeVisible();
    await page.getByRole("button", { name: /Programme running régulier/ }).click();
    await advanceTo(/Comment te définis-tu/);
    await page.getByRole("button", { name: /Homme/ }).click();
    await page.getByRole("button", { name: "Revenir à l’étape précédente" }).click();
    await expect(page.getByRole("button", { name: /Programme running régulier/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await advanceTo(/Comment te définis-tu/);
    await expect(page.getByRole("button", { name: /Homme/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await advanceTo(/Ton niveau/);
    await page.getByRole("button", { name: /Débutant/ }).click();
    await advanceTo(/Ton corps/);
    await page.getByLabel("Âge").fill("30");
    await page.getByLabel("Taille").fill("180");
    await page.getByLabel("Poids actuel").fill("75");
    await advanceTo(/Combien de séances/);
    await advanceTo(/Durée par séance/);
    await page.getByRole("button", { name: /30 minutes/ }).click();
    await advanceTo(/Ton équipement/);
    await advanceTo(/Exercices que tu kiffes/);
    await advanceTo(/Exercices à éviter/);
    await advanceTo(/Tu préfères t'entraîner/);
    await page.getByRole("button", { name: /Indifférent/ }).click();
    await expect(page.getByRole("button", { name: /Indifférent/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await advanceTo(/Contraintes/);
    await advanceTo(/Ton échéance/);
    await advanceTo(/C'est parti/);
    await expect(page.getByRole("button", { name: /Générer mon programme/ })).toBeVisible();
    await expect(page.getByText(/PDF/i)).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath("onboarding-final.png"),
      animations: "disabled",
    });
  });
}

test("program generation displays errors and retries without losing the profile", async ({
  page,
}) => {
  await setup(page, "light", true, true);
  let calls = 0;
  await page.route("**/functions/v1/ai-coach", async (route) => {
    calls += 1;
    const requestBody = route.request().postDataJSON() as {
      action?: string;
      payload?: { profile?: { objective?: string } };
    };
    expect(requestBody.action).toBe("program");
    expect(requestBody.payload?.profile?.objective).toBe("running");

    if (calls === 1) {
      await route.fulfill({ status: 500, json: { error: "Service momentanément indisponible." } });
      return;
    }

    await route.fulfill({
      json: {
        result: {
          user_profile: profile,
          program_overview: {
            duration_weeks: 1,
            training_days_per_week: 3,
            summary: "Reprise progressive du running.",
          },
          weeks: [{ week_number: 1, focus: "Endurance", sessions: [] }],
        },
      },
    });
  });

  await page.goto("/generating", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText("Service momentanément indisponible.");
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("heading", { name: "Ton programme Vincere" })).toBeVisible();
  expect(calls).toBe(2);
});
