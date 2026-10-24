import { expect, test } from "@playwright/test";
import { setupApp } from "./support/app";

for (const theme of ["light", "dark"] as const) {
  test(`local exercise guide and safe fallback: ${theme}`, async ({ page, context }, info) => {
    await context.route("**/*", (route) => {
      const origin = new URL(route.request().url()).origin;
      if (origin === "http://127.0.0.1:4175") return route.continue();
      if (origin === "https://vincere-test.supabase.co") return route.fallback();
      return route.abort();
    });
    const { program } = await setupApp(page, { theme, objective: "running" });
    program.program_weeks[0].program_sessions[0].program_session_blocks[0].exercises[0].name =
      "Squat barre";
    await page.route("https://vincere-test.supabase.co/rest/v1/programs?**", (route) =>
      route.fulfill({ json: program }),
    );
    await page.goto("/result?week=1&session=W1D1");
    const button = page.getByRole("button", { name: "Comment faire : Squat barre", exact: true });
    await button.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const image = dialog.getByRole("img");
    await expect(image).toHaveAttribute("src", /barbell-squat-1.webp$/);
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await dialog.getByRole("button", { name: "Position 2" }).click();
    await expect(image).toHaveAttribute("src", /barbell-squat-2.webp$/);
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`guide-${theme}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(button).toBeFocused();
    await page.getByRole("button", { name: /Comment faire : Course en endurance/ }).click();
    await expect(dialog).toContainText("n’est pas encore disponible");
    await expect(dialog.getByRole("img")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Revenir à ma séance" }).click();
    await button.click();
    // WebKit retains decoded images in memory; simulate the browser image error event.
    await dialog.getByRole("img").evaluate((element) => element.dispatchEvent(new Event("error")));
    await expect(dialog).toContainText("Illustration indisponible");
    await expect(dialog).toContainText("Les étapes");
  });
}
