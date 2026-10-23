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
  let jobId = "";
  await page.route("https://vincere-test.supabase.co/functions/v1/ai-coach", async (route) => {
    const request = route.request().postDataJSON() as {
      action: string;
      payload: { jobId: string };
    };
    if (request.action === "program-start") {
      received += 1;
      jobId = request.payload.jobId;
      await route.fulfill({ json: { result: { id: jobId, status: "queued" } } });
      return;
    }
    await responseGate;
    await route.fulfill({
      json: {
        result: {
          id: jobId,
          status: "completed",
          result: {
            program_id: jobId,
            user_profile: profile,
            program_overview: {
              duration_weeks: 8,
              training_days_per_week: 4,
              summary: "Programme fictif local",
            },
            weeks: [],
          },
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

test("reloading while work is queued resumes its stable ID without another quota debit", async ({
  page,
  context,
}) => {
  await context.route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    return origin === "http://127.0.0.1:4175" || origin === "https://vincere-test.supabase.co"
      ? route.fallback()
      : route.abort();
  });
  const { profile, program } = await setupApp(page, {
    theme: "light",
    objective: "running",
    empty: true,
  });
  const accepted = new Set<string>();
  let starts = 0;
  let complete = false;
  let savedId: string | null = null;
  await page.route("https://vincere-test.supabase.co/functions/v1/ai-coach", async (route) => {
    const body = route.request().postDataJSON() as { action: string; payload: { jobId: string } };
    if (body.action === "program-start") {
      starts++;
      accepted.add(body.payload.jobId);
    }
    await route.fulfill({
      json: {
        result: {
          id: body.payload.jobId,
          status: complete ? "completed" : "queued",
          result: complete
            ? {
                program_id: body.payload.jobId,
                user_profile: profile,
                program_overview: {
                  duration_weeks: 8,
                  training_days_per_week: 4,
                  summary: "Fixture",
                },
                weeks: [],
              }
            : undefined,
        },
      },
    });
  });
  await page.route(
    "https://vincere-test.supabase.co/rest/v1/rpc/save_generated_program",
    async (route) => {
      savedId = route.request().postDataJSON().p_program_id as string;
      await route.fulfill({ json: savedId });
    },
  );
  await page.route("https://vincere-test.supabase.co/rest/v1/programs?**", (route) =>
    route.fulfill({ json: complete ? { ...program, id: [...accepted][0] } : null }),
  );
  await page.goto("/generating");
  await expect.poll(() => starts).toBe(1);
  await page.reload();
  await expect.poll(() => starts).toBe(2);
  expect(accepted.size).toBe(1);
  complete = true;
  await expect(page.getByRole("status").filter({ hasText: "Ton programme est prêt" })).toBeVisible({
    timeout: 10000,
  });
  expect(savedId).toBe([...accepted][0]);
  expect(
    await page.evaluate((userId) => localStorage.getItem(`Vincere_generation_job_${userId}`), id),
  ).toBeNull();
});

test("quota exhaustion displays the weekly limit without leaving a phantom server creation", async ({
  page,
  context,
}) => {
  await context.route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    return origin === "http://127.0.0.1:4175" || origin === "https://vincere-test.supabase.co"
      ? route.fallback()
      : route.abort();
  });
  await setupApp(page, { theme: "light", objective: "running", empty: true });
  let requests = 0;
  await page.route("https://vincere-test.supabase.co/functions/v1/ai-coach", async (route) => {
    requests++;
    await route.fulfill({
      status: 429,
      json: {
        code: "AI_QUOTA",
        error: "Limite de 5 programmes par semaine atteinte. Disponible à nouveau lundi.",
      },
    });
  });
  await page.goto("/generating");
  await expect(page.locator(".app-generation")).toContainText("5 programmes par semaine");
  expect(requests).toBe(1);
  expect(
    await page.evaluate((userId) => localStorage.getItem(`Vincere_generation_job_${userId}`), id),
  ).toBeNull();
  await page.getByRole("button", { name: "Fermer le message d'erreur", exact: true }).click();
  await expect(page.locator(".app-generation")).toHaveCount(0);
});
