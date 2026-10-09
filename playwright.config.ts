import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "artifacts/playwright",
  fullyParallel: false,
  workers: 2,
  use: { baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure" },
  projects: [
    { name: "iphone-small", use: { ...devices["iPhone SE"], browserName: "webkit" } },
    { name: "ipad-webkit", use: { ...devices["iPad Mini"], browserName: "webkit" } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } },
    {
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "vp dev --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://vincere-test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
