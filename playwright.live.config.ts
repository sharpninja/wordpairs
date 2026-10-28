import { defineConfig } from "@playwright/test";
const origin = process.env.WORDPAIRS_LIVE_ORIGIN;
if (!origin || !/^https?:\/\//.test(origin))
  throw new Error(
    "Set WORDPAIRS_LIVE_ORIGIN to the explicitly authorized local game origin",
  );
const localTls = process.env.WORDPAIRS_LIVE_LOCAL_TLS === "1";
if (localTls && (new URL(origin).protocol !== "https:" || new URL(origin).hostname !== "127.0.0.1"))
  throw new Error("The generated test-certificate exception is restricted to HTTPS127.0.0.1");
export default defineConfig({
  testDir: "tests/browser",
  testMatch: ["live-multiplayer.integration.spec.ts", "live-player-counts.integration.spec.ts", "heartbeat.integration.spec.ts"],
  workers: 1,
  timeout: 360000,
  // A failed mutation can await a10s authorized refresh before unlocking the UI.
  expect: { timeout: 30000 },
  use: {
    baseURL: origin,
    ignoreHTTPSErrors: localTls,
    headless: true,
    actionTimeout: 30000,
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" },
    launchOptions: process.env.WORDPAIRS_BROWSER_PATH
      ? { executablePath: process.env.WORDPAIRS_BROWSER_PATH }
      : {},
  },
});
