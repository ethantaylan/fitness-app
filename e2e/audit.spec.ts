import { expect, test, type Page, type Locator } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { FREE_SESSION_BUILDER_ENABLED } from "../src/lib/features";

const id = "00000000-0000-0000-0000-000000000001";
const user = {
  id,
  email: "audit@example.test",
  role: "authenticated",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: { ai_consent_version: "2026-10-08" },
  created_at: "2026-01-01T00:00:00Z",
};
const today = new Date().toLocaleDateString("en-CA");
const day = new Date().toLocaleDateString("fr-FR", { weekday: "long" });
const profile = {
  objective: "running",
  goalDetail: "10 km en 1 heure",
  age: 30,
  gender: "homme",
  height: 180,
  weight: 70,
  level: "intermédiaire",
  weeklyFrequency: 3,
  sessionDuration: [45],
  equipment: [],
  likedExercises: [],
  dislikedExercises: [],
  availability: ["soir"],
  injuries: "",
  nutritionRestrictions: "",
};
const exercise = {
  name: "Course en endurance",
  sets: 1,
  reps: "20 min",
  load_kg: "N/A",
  tempo: "N/A",
  rest_sec: 0,
  alternative: "Course facile",
  notes: "Reste à une allure confortable.",
};
const workout = {
  uid: "run",
  date: "Mercredi 14 octobre",
  goal: "Développer progressivement l’endurance pour terminer un 10 km dans de bonnes conditions",
  intensity: "Modérée",
  duration_min: 45,
  warmup: [{ name: "Marche active", duration_sec: 300 }],
  cooldown: [{ name: "Marche lente", duration_sec: 300 }],
  motivation_message: "",
  notes: "Bonne séance, allure régulière.",
  blocks: [{ block_name: "Course en endurance", exercises: [exercise] }],
};
const program = {
  duration_weeks: 2,
  training_days_per_week: 4,
  summary: "Programme running existant",
  started_at: today,
  created_at: "2026-10-10T12:00:00Z",
  profile_snapshot: {
    ...profile,
    goalDetail: "5 km en 25 minutes",
    weight: 60,
    weeklyFrequency: 4,
  },
  program_weeks: [1, 2].map((number) => ({
    week_number: number,
    focus: "Adaptation",
    program_sessions: [
      {
        day,
        session_label: `W${number}D1`,
        type: "Endurance facile",
        duration_min: 45,
        intensity: "Modérée",
        warmup: workout.warmup,
        cooldown: workout.cooldown,
        completed_at: null,
        sort_order: 0,
        program_session_blocks: [
          { block_name: "Course", sort_order: 0, exercises: [{ ...exercise, sort_order: 0 }] },
        ],
      },
    ],
  })),
};

async function setup(page: Page, theme: "light" | "dark") {
  const writes = { records: 0, profiles: 0 };
  await page.route("https://vincere-test.supabase.co/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/rpc/upsert_user"))
      body = { id, email: user.email, first_name: "Test", subscription: "free" };
    else if (path.startsWith("/auth/v1/user")) body = user;
    else if (path.endsWith("/users"))
      body = { id, email: user.email, first_name: "Test", subscription: "free" };
    else if (path.endsWith("/programs")) body = program;
    else if (path.endsWith("/user_profiles")) {
      if (request.method() === "POST") {
        writes.profiles += 1;
        await route.fulfill({ status: 500, json: { message: "Fixture save failure" } });
        return;
      }
      body = {
        user_id: id,
        objective: profile.objective,
        goal_detail: profile.goalDetail,
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.height,
        weight_kg: profile.weight,
        level: profile.level,
        weekly_frequency: profile.weeklyFrequency,
        session_duration: profile.sessionDuration,
        equipment: [],
        availability: profile.availability,
      };
    } else if (path.endsWith("/personal_records") && request.method() === "POST") {
      writes.records += 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: writes.records === 1 ? 500 : 201,
        json: writes.records === 1 ? { message: "Fixture save failure" } : {},
      });
      return;
    } else if (path.endsWith("/onboarding_progress")) body = null;
    else if (path.includes("/functions/")) {
      await route.fulfill({ status: 503, json: { error: "Service momentanément indisponible." } });
      return;
    }
    await route.fulfill({ json: body });
  });
  await page.addInitScript(
    ({ theme, id, user, profile, workout }) => {
      localStorage.setItem("vincere-theme-mode", theme);
      localStorage.setItem(
        "sb-vincere-test-auth-token",
        JSON.stringify({
          access_token: "fixture-access-token",
          refresh_token: "fixture-refresh-token",
          expires_at: 4102444800,
          token_type: "bearer",
          user,
        }),
      );
      localStorage.setItem(
        `Vincere_state_${id}`,
        JSON.stringify({
          profile,
          program: null,
          programStartDate: null,
          sessions: [workout],
          records: [
            { id: "legacy", name: "Ancienne entrée", category: "force", date: "2026-10-01" },
            {
              id: "squat",
              name: "Squat",
              category: "force",
              date: "2026-10-12",
              weight_kg: 70,
              reps: 5,
            },
          ],
          onboardingStep: 0,
        }),
      );
    },
    { theme, id, user, profile, workout },
  );
  return writes;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
}

async function contrast(locator: Locator) {
  return locator.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const blend = (foreground: number[], background: number[]) => {
      const alpha = foreground[3] / 255;
      return foreground
        .slice(0, 3)
        .map((channel, index) => channel * alpha + background[index] * (1 - alpha));
    };
    const ancestors: Element[] = [];
    for (let node: Element | null = element; node; node = node.parentElement)
      ancestors.unshift(node);
    let background = [255, 255, 255];
    for (const node of ancestors)
      background = blend(rgba(getComputedStyle(node).backgroundColor), background);
    const foreground = blend(rgba(getComputedStyle(element).color), background);
    const luminance = (channels: number[]) =>
      channels
        .map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const a = luminance(foreground);
    const b = luminance(background);
    return {
      text: element.textContent?.trim(),
      foreground,
      background,
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    };
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`audit journeys, dialogs and running display: ${theme}`, async ({ page }, info) => {
    await setup(page, theme);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Endurance facile" })).toBeVisible();
    const edit = await page.getByRole("link", { name: "Modifier mon profil" }).boundingBox();
    expect(edit!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator("#home-title")).toContainText("Bonjour");
    // Une seule prochaine séance, un seul CTA principal.
    await expect(page.getByRole("heading", { name: "Endurance facile" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Commencer la séance" })).toHaveCount(1);
    await page.screenshot({
      path: info.outputPath(`dashboard-${theme}.png`),
      animations: "disabled",
    });
    await page.getByRole("link", { name: "Commencer la séance", exact: true }).click();
    await expect(page).toHaveURL(/week=1&session=W1D1/);
    await expect(page.locator("#program-session-W1D1")).toContainText("20 min");
    await expect(page.locator("#program-session-W1D1")).not.toContainText("N/A");
    await expect(page.locator("#program-session-W1D1")).not.toContainText("300s");
    await noOverflow(page);
    await page.screenshot({
      path: info.outputPath(`program-session-${theme}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/result?week=1");
    await expect(page.getByRole("heading", { name: "Ton profil a évolué" })).toBeVisible();
    await expect(page.getByText("Programme généré avec succès")).toHaveCount(0);
    const topNavigation = await page.locator(".app-top-nav").boundingBox();
    expect(topNavigation!.y).toBeGreaterThanOrEqual(0);
    await page.screenshot({
      path: info.outputPath(`program-${theme}.png`),
      animations: "disabled",
    });
    await page.goto("/settings?tab=compte");
    const contact = page.getByRole("button", { name: "Contacter l'assistance", exact: true });
    await contact.focus();
    await contact.click();
    const contactDialog = page.getByRole("dialog", { name: "Contacter l'assistance" });
    await expect(contactDialog).toBeVisible();
    for (let n = 0; n < 12; n++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog")))).toBe(
        true,
      );
    }
    await page.keyboard.press("Escape");
    await expect(contactDialog).toHaveCount(0);
    await expect(contact).toBeFocused();
    await expect(page.getByLabel("Prénom")).toHaveCount(0);
    const assistant = page.getByRole("button", { name: "Ouvrir l'assistant", exact: true });
    await assistant.click();
    await expect(page.getByRole("dialog", { name: "Assistant Vincere" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(assistant).toBeFocused();

    // Séances libres (page, détail, builder) masquées pour le moment (src/lib/features.ts).
    if (FREE_SESSION_BUILDER_ENABLED) {
      await page.goto("/session?uid=run");
      await expect(page.locator("h1")).toHaveText("Course en endurance");
      await expect(page.getByText("5 min", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("N/A", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Démarrer le minuteur" }).click();
      await expect.poll(async () => page.locator(".timer-digits").textContent()).not.toBe("1:00");
      await page.getByRole("button", { name: "Mettre en pause" }).click();
      await page.getByRole("button", { name: "Bien passé", exact: true }).click();
      await expect(page.getByRole("button", { name: "Bien passé", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(
        page.getByText("Ressenti enregistré pour adapter ta prochaine séance."),
      ).toBeVisible();
      await page.screenshot({
        path: info.outputPath(`session-${theme}.png`),
        animations: "disabled",
      });
      await page.getByTitle("Plus d'infos", { exact: true }).click();
      await expect(page.getByRole("dialog", { name: exercise.name })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "Retour aux séances" }).click();
      await expect(page).toHaveURL(/\/session$/);
      if (FREE_SESSION_BUILDER_ENABLED) {
        await page.goto("/builder");

        await expect(page.getByRole("button", { name: "Retour aux séances" })).toBeVisible();
        // Le CTA « Composer avec Vincere » reste atteignable (dock fixe au-dessus de la navigation).
        await expect(page.getByRole("button", { name: /Composer avec Vincere/ })).toBeVisible();
        await page
          .getByRole("button", { name: /Ajouter une activité : Endurance, 15 minutes/ })
          .click();
        await expect(page.locator(".app-dock")).toContainText("25 min");
        await page
          .getByRole("button", { name: "Ajouter une activité : Endurance", exact: true })
          .click();
        await expect(page.locator(".app-dock")).toContainText("40 min");
        await noOverflow(page);
        await page.screenshot({
          path: info.outputPath(`builder-${theme}.png`),
          animations: "disabled",
        });
        const nav = await page.locator(".app-bottom-nav").boundingBox();
        const cart = await page.locator(".app-dock").boundingBox();
        if (nav && cart) expect(cart.y + cart.height).toBeLessThanOrEqual(nav.y);
        await page.getByRole("button", { name: "Vider le panier" }).click();
        await expect(page.getByText(/activités? sélectionnées?/)).toHaveCount(0);
        await expect(page.getByRole("button", { name: /Composer avec Vincere/ })).toBeVisible();
      }
    } else {
      for (const hidden of ["/session", "/builder"]) {
        await page.goto(hidden);
        await expect(page).toHaveURL(/\/dashboard$/);
      }
      await expect(page.getByRole("link", { name: "Séances", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Séances", exact: true })).toHaveCount(0);
    }

    await page.goto("/records");
    await page.getByRole("tab", { name: "Notes", exact: true }).click();
    // Ancienne note rattachée à une séance libre : toujours consultable et modifiable.
    await expect(page.getByRole("heading", { name: workout.goal })).toBeVisible();
    await page.getByRole("button", { name: /^Modifier/ }).click();
    const noteDialog = page.getByRole("dialog", { name: "Modifier la note" });
    await noteDialog.getByLabel("Note *").fill("Une nouvelle note");
    await expect(page.getByText("17/2000", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(noteDialog).toHaveCount(0);
    await expect(page.getByText(workout.notes, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Modifier/ }).click();
    await noteDialog.getByLabel("Note *").fill("Note de test enregistrée");
    await noteDialog.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(page.getByText("Note de test enregistrée", { exact: true })).toBeVisible();
    // Une note libre peut être ajoutée à tout moment, sans séance.
    await page.getByRole("button", { name: "Ajouter une note", exact: true }).click();
    const newNote = page.getByRole("dialog", { name: "Nouvelle note" });
    await newNote.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(newNote.getByRole("alert")).toContainText("Écris le contenu");
    await newNote.getByLabel("Titre (facultatif)").fill("Genou gauche");
    await newNote.getByLabel("Note *").fill("Petite gêne en descente, à surveiller.");
    await newNote.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(page.getByRole("heading", { name: "Genou gauche" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Note enregistrée" })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`notes-${theme}.png`), animations: "disabled" });
    await page.goto("/settings");
    await expect(page.getByText("Profil à jour", { exact: true })).toBeVisible();
    await page.locator("summary").filter({ hasText: "Infos corporelles" }).click();
    await page.screenshot({
      path: info.outputPath(`profile-${theme}.png`),
      animations: "disabled",
    });
    await noOverflow(page);
    await page.getByRole("button", { name: "Compte", exact: true }).click();
    await page.getByRole("link", { name: "Confidentialité", exact: true }).click();
    await page.getByRole("link", { name: "Retour au profil" }).click();
    await expect(page).toHaveURL(/settings\?tab=compte/);
    await page.goto("/support?from=account");
    await expect(page.getByRole("button", { name: "Copier la version de Vincere" })).toBeVisible();
  });

  test(`records validate and preserve failed saves: ${theme}`, async ({ page }, info) => {
    const writes = await setup(page, theme);
    await page.goto("/records");
    await page.getByRole("tab", { name: "Performances", exact: true }).click();
    await expect(page.getByText("Mesure non renseignée", { exact: true }).first()).toBeVisible();
    const add = page.getByRole("button", { name: "Ajouter une performance", exact: true });
    await add.focus();
    await add.click();
    await page.getByRole("button", { name: "Squat", exact: true }).click();
    await page.getByRole("button", { name: "Enregistrer la performance", exact: true }).click();
    await expect(
      page.getByText("Indique le nombre de répétitions.", { exact: true }),
    ).toBeVisible();
    expect(writes.records).toBe(0);
    await page.getByLabel(/Charge \(kg\)/).fill("0");
    await page.getByLabel(/Répétitions/).fill("5");
    await page.getByRole("button", { name: "Enregistrer la performance", exact: true }).click();
    await expect(page.getByText(/Ta saisie est conservée/)).toBeVisible();
    await expect(page.getByLabel(/Charge \(kg\)/)).toHaveValue("0");
    await page.screenshot({
      path: info.outputPath(`record-error-${theme}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Enregistrer la performance", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("Performance enregistrée");
    expect(writes.records).toBe(2);
    await add.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`records-${theme}.png`),
      animations: "disabled",
    });
  });

  test(`key text contrast and a reduced-height dialog: ${theme}`, async ({ page }, info) => {
    await setup(page, theme);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Commencer la séance", exact: true }),
    ).toBeVisible();
    const samples = [
      await contrast(page.getByRole("link", { name: "Commencer la séance", exact: true })),
      await contrast(page.getByRole("heading", { name: "Endurance facile" })),
    ];
    if (FREE_SESSION_BUILDER_ENABLED) {
      samples.push(
        await contrast(page.getByText("Une séance ponctuelle, adaptée à ton état du jour.")),
      );
    }
    await page.goto("/records");
    await page.getByRole("tab", { name: "Performances", exact: true }).click();
    await page.getByRole("button", { name: "Ajouter une performance", exact: true }).click();
    samples.push(await contrast(page.getByRole("dialog").locator("label").first()));
    await info.attach(`contrast-${theme}.json`, {
      body: JSON.stringify(samples, null, 2),
      contentType: "application/json",
    });
    await writeFile(info.outputPath(`contrast-${theme}.json`), JSON.stringify(samples, null, 2));
    for (const sample of samples) expect(sample.ratio, sample.text).toBeGreaterThanOrEqual(4.5);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 });
    await page.goto("/settings?tab=compte");
    await page.getByRole("button", { name: "Contacter l'assistance", exact: true }).click();
    const message = page.getByRole("dialog").getByRole("textbox", { name: /Message/ });
    await message.focus();
    await message.scrollIntoViewIfNeeded();
    const field = await message.boundingBox();
    expect(field!.y).toBeGreaterThanOrEqual(0);
    expect(field!.y + field!.height).toBeLessThanOrEqual(480);
    await expect(
      page.getByRole("button", { name: "Fermer : Contacter l'assistance", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`contact-small-height-${theme}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("profile errors keep pending changes", async ({ page }) => {
  const writes = await setup(page, "light");
  await page.goto("/settings");
  await page.locator("summary").filter({ hasText: "Infos corporelles" }).click();
  await page.getByLabel("Poids", { exact: true }).fill("72");
  await expect(page.getByRole("status")).toContainText("Modifications non enregistrées");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByRole("alert")).toContainText("Tes modifications sont conservées");
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("72");
  expect(writes.profiles).toBe(1);
});

test("program loading is not shown as empty and failed reads can be retried", async ({ page }) => {
  await setup(page, "light");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reads = 0;
  await page.route("https://vincere-test.supabase.co/rest/v1/programs?**", async (route) => {
    reads++;
    if (reads === 1) {
      await gate;
      await route.fulfill({ status: 500, json: { message: "Fixture read failure" } });
    } else await route.fulfill({ json: program });
  });
  await page.goto("/result");
  await expect(page.getByRole("status")).toContainText("Chargement de tes données");
  await expect(page.getByText("Aucun programme actif", { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole("alert")).toContainText("Tes données n'ont pas pu être chargées");
  await expect(page.getByText("Aucun programme actif", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByRole("link", { name: /Endurance facile/ }).first()).toBeVisible();
  expect(reads).toBe(2);
});

test("an authoritative empty program does not reactivate the cached plan", async ({ page }) => {
  await setup(page, "light");
  await page.addInitScript(
    ({ id }) => {
      const key = `Vincere_state_${id}`;
      const cached = JSON.parse(localStorage.getItem(key)!);
      cached.program = {
        program_overview: {
          duration_weeks: 2,
          training_days_per_week: 3,
          summary: "Ancien programme",
        },
        weeks: [],
      };
      localStorage.setItem(key, JSON.stringify(cached));
    },
    { id },
  );
  let writes = 0;
  await page.route("https://vincere-test.supabase.co/rest/v1/programs?**", async (route) => {
    if (route.request().method() !== "GET") writes++;
    await route.fulfill({ json: null });
  });
  await page.goto("/result");
  await expect(page.getByText("Aucun programme actif", { exact: true })).toBeVisible();
  expect(writes).toBe(0);
});
