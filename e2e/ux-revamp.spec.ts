import { expect, test, type Page } from "@playwright/test";
import { setupApp } from "./support/app";
import { auditPage } from "./support/audit";
import { FREE_SESSION_BUILDER_ENABLED } from "../src/lib/features";

/** Contrôles d'accessibilité et de mise en page à 375 px, thèmes clair et sombre. */
const ROUTES: Array<{
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
}> = [
  { name: "accueil", path: "/dashboard" },
  { name: "programme", path: "/result" },
  { name: "séance du programme", path: "/result?week=1&session=W1D3" },
  { name: "séances", path: "/session" },
  { name: "séance libre", path: "/session?uid=libre-1" },
  { name: "création de séance libre", path: "/builder" },
  {
    name: "création avec sélection",
    path: "/builder",
    prepare: async (page) => {
      await page.getByRole("button", { name: /Ajouter une activité : Étirements/ }).click();
      await page.getByRole("button", { name: /Ajouter une activité : Mobilité/ }).click();
    },
  },
  { name: "suivi · régularité", path: "/records" },
  {
    name: "suivi · performances",
    path: "/records",
    prepare: async (page) => {
      await page.getByRole("tab", { name: "Performances" }).click();
    },
  },
  {
    name: "suivi · notes",
    path: "/records",
    prepare: async (page) => {
      await page.getByRole("tab", { name: "Notes" }).click();
    },
  },
  {
    name: "suivi · nouvelle note",
    path: "/records",
    prepare: async (page) => {
      await page.getByRole("tab", { name: "Notes" }).click();
      await page.getByRole("button", { name: "Ajouter une note", exact: true }).click();
    },
  },
  {
    name: "suivi · notes avec contenu",
    path: "/records",
    prepare: async (page) => {
      await page.getByRole("tab", { name: "Notes" }).click();
      await page.getByRole("button", { name: "Ajouter une note", exact: true }).click();
      await page.getByLabel("Titre (facultatif)").fill("Genou gauche");
      await page.getByLabel("Note *").fill("Petite gêne en descente, à surveiller.");
      await page.getByRole("button", { name: "Enregistrer la note" }).click();
    },
  },
  { name: "profil", path: "/settings" },
  {
    name: "profil · sections ouvertes",
    path: "/settings",
    prepare: async (page) => {
      await page.evaluate(() =>
        document.querySelectorAll("details").forEach((details) => (details.open = true)),
      );
    },
  },
  { name: "profil · apparence", path: "/settings?tab=apparence" },
  { name: "profil · compte", path: "/settings?tab=compte" },
  {
    name: "profil modifié",
    path: "/settings",
    prepare: async (page) => {
      await page.locator("summary").filter({ hasText: "Infos corporelles" }).click();
      await page.getByLabel("Poids", { exact: true }).fill("72");
    },
  },
  {
    name: "assistant",
    path: "/dashboard",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
    },
  },
  {
    name: "contact",
    path: "/settings?tab=compte",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Contacter l'assistance" }).click();
    },
  },
];

const WIDTHS = [375, 567, 768, 1280];
// Écrans du builder de séance libre : masqué pour le moment (src/lib/features.ts).
const BUILDER_ROUTES = new Set([
  "séances",
  "séance libre",
  "création de séance libre",
  "création avec sélection",
]);

for (const theme of ["light", "dark"] as const) {
  for (const width of WIDTHS) {
    test.describe(`audit DOM ${theme} ${width}px`, () => {
      for (const route of ROUTES) {
        test(route.name, async ({ page }) => {
          test.skip(
            !FREE_SESSION_BUILDER_ENABLED && BUILDER_ROUTES.has(route.name),
            "builder masqué",
          );
          await page.setViewportSize({ width, height: width >= 1280 ? 800 : 812 });
          await setupApp(page, { theme });
          await page.goto(route.path);
          await page.waitForLoadState("networkidle");
          await route.prepare?.(page);
          await page.waitForTimeout(300);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            "pas de défilement horizontal",
          ).toBe(true);
          const issues = await auditPage(page);
          expect(
            issues.map((issue) => `[${issue.rule}] ${issue.detail}`),
            `${route.name} (${theme}, ${width}px)`,
          ).toEqual([]);
        });
      }
    });
  }
}

test("l'audit détecte bien les défauts qu'il cherche", async ({ page }) => {
  await page.setContent(
    '<body style="margin:0;background:#fff"><p style="font-size:9px;color:#ccc">trop petit</p><button style="width:20px;height:20px">x</button></body>',
  );
  const rules = (await auditPage(page)).map((issue) => issue.rule);
  expect(rules).toEqual(expect.arrayContaining(["cible-tactile", "taille-texte", "contraste"]));
});

for (const theme of ["light", "dark"] as const) {
  test(`l'assistant suit le thème et reste utilisable sur une hauteur réduite: ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 420 }); // ≈ clavier mobile ouvert
    await setupApp(page, { theme });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Ouvrir l'assistant" }).click();
    const dialog = page.getByRole("dialog", { name: "Assistant Vincere" });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(421);
    const input = page.getByLabel("Ta question");
    const field = (await input.boundingBox())!;
    expect(field.y + field.height).toBeLessThanOrEqual(421);
    expect(field.height).toBeGreaterThanOrEqual(44);
    // Thème : le panneau n'est plus sombre en clair.
    const background = await dialog.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(background).toBe(theme === "light" ? "rgb(255, 255, 255)" : "rgb(15, 23, 42)");
    await input.fill("Comment créer une séance libre ?");
    await expect(page.getByRole("button", { name: "Envoyer la question" })).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}

test("cocher une séance : case du programme, retour immédiat et annulation", async ({ page }) => {
  const { writes } = await setupApp(page, { theme: "light" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/result?week=1");
  // La séance du jour porte le nom du jour courant (les données de test suivent la date).
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long" });
  const todayCheck = page.getByRole("checkbox", {
    name: `Marquer la séance du ${today} comme réalisée`,
  });
  await expect(todayCheck).toHaveAttribute("aria-checked", "false");
  await todayCheck.click();
  await expect(
    page.getByRole("checkbox", { name: `Marquer la séance du ${today} comme non réalisée` }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "marquée comme réalisée" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(todayCheck).toHaveAttribute("aria-checked", "false");
  await expect.poll(() => writes.completions).toBeGreaterThanOrEqual(2);
  // Accueil : un seul CTA principal, pas de second bouton de validation.
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Commencer la séance" })).toBeVisible();
  await expect(page.getByText("Marquer comme réalisée")).toHaveCount(0);
});

test("générer un nouveau programme demande une confirmation explicite", async ({ page }) => {
  await setupApp(page, { theme: "light" });
  await page.goto("/result");
  await page.getByRole("button", { name: "Générer un nouveau programme" }).click();
  const dialog = page.getByRole("dialog", { name: "Remplacer ton programme ?" });
  await expect(dialog).toContainText("remplacera le programme actuel");
  await dialog.getByRole("button", { name: "Garder mon programme" }).click();
  await expect(page).toHaveURL(/\/result/);
  await page.getByRole("button", { name: "Générer un nouveau programme" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Générer un nouveau programme" })
    .click();
  await expect(page).toHaveURL(/\/onboarding/);
});
