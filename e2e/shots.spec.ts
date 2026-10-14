import { test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { setupApp } from "./support/app";

/**
 * Captures d'écran avant/après (docs/ui-audit/ux-revamp). Ignoré sans SHOTS_DIR :
 *   SHOTS_DIR=docs/ui-audit/ux-revamp/avant vp exec playwright test e2e/shots.spec.ts --project=iphone-webkit
 */
const dir = process.env.SHOTS_DIR;
test.skip(!dir, "SHOTS_DIR non défini");

const PAGES: Array<{ name: string; path: string; prepare?: "assistant" }> = [
  { name: "accueil", path: "/dashboard" },
  { name: "programme", path: "/result" },
  { name: "seance-programme", path: "/result?week=1&session=W1D3" },
  { name: "seances", path: "/session" },
  { name: "creation-seance-libre", path: "/builder" },
  { name: "suivi", path: "/records" },
  { name: "profil", path: "/settings" },
  { name: "profil-compte", path: "/settings?tab=compte" },
  { name: "assistant", path: "/dashboard", prepare: "assistant" },
];

for (const theme of ["light", "dark"] as const) {
  for (const entry of PAGES) {
    test(`${entry.name} ${theme}`, async ({ page }, info) => {
      await page.setViewportSize(
        info.project.name.includes("iphone")
          ? { width: 375, height: 812 }
          : { width: 1280, height: 800 },
      );
      await setupApp(page, { theme });
      await page.goto(entry.path);
      await page.waitForTimeout(700);
      if (entry.prepare === "assistant") {
        await page
          .getByRole("button", { name: /Ouvrir l'assistant/ })
          .first()
          .click();
        await page.waitForTimeout(300);
      }
      await mkdir(dir!, { recursive: true });
      await page.screenshot({
        path: `${dir}/${info.project.name}-${entry.name}-${theme}.png`,
        fullPage: entry.prepare !== "assistant",
        animations: "disabled",
      });
    });
  }
}
