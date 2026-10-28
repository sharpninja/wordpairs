import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  testMatch: [
    "*.phase2.spec.ts",
    "*.phase3.spec.ts",
    "*.phase4.spec.ts",
    "*.phase5.spec.ts",
    "*.phase6.spec.ts",
    "pwa.spec.ts",
  ],
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3200",
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    launchOptions: process.env.WORDPAIRS_BROWSER_PATH
      ? { executablePath: process.env.WORDPAIRS_BROWSER_PATH }
      : {},
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
