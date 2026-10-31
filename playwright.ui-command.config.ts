import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  testMatch: "ui-command-entry.phase6.spec.ts",
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
    launchOptions: process.env.WORDPAIRS_BROWSER_PATH
      ? { executablePath: process.env.WORDPAIRS_BROWSER_PATH }
      : {},
  },
});
