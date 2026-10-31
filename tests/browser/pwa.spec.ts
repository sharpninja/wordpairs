import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext, expect, test } from "@playwright/test";
const evidence = "docs/evidence/pwa/admin";
const owner = { id: "owner", kind: "member", version: 0, alias: "sharpninja fixture", icon: "owl", publicLeaderboard: false, wins: 0, points: 0, earliestWinAt: null };
async function administrator(context: BrowserContext) {
 await context.route("**/api/admin/session", route => route.fulfill({ json: { profile: owner, permissions: ["moderate", "manage-content", "resolve-appeals"], sessionGeneration: "admin-fixture" } }));
 await context.route("**/api/content", route => route.fulfill({ json: { actorId: owner.id, version: 0, canModerate: true, isSenior: true, cases: [], categories: [], catalogPairs: [], audit: [], wins: 0, canSuggest: false } }));
}
test("admin-only manifest, real worker scope, icons and Chromium installation prerequisites", async ({ request }) => {
 const directory = await mkdtemp(join(tmpdir(), "admin-pwa-chromium-"));
 const context = await chromium.launchPersistentContext(directory, { headless: true, baseURL: "http://127.0.0.1:3200", viewport: { width: 390, height: 844 }, ...(process.env.WORDPAIRS_BROWSER_PATH ? { executablePath: process.env.WORDPAIRS_BROWSER_PATH } : {}) });
 const page = await context.newPage();
 try {
 await mkdir(evidence, { recursive: true });
 for (const path of ["/", "/play"]) {
  await page.goto(path);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.getByText(/Get Wordpairs.*on your phone/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Install Wordpairs/ })).toHaveCount(0);
 }
 expect((await request.get("/manifest.webmanifest")).status()).toBe(404);
 await administrator(context);
 await page.goto("/admin");
 await expect(page.getByText(owner.alias, { exact: true })).toBeVisible();
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/admin/manifest.webmanifest");
 await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Wordpairs Admin");
 const response = await request.get("/admin/manifest.webmanifest");
 expect(response.status()).toBe(200);
 expect(response.headers()["content-type"]).toMatch(/manifest\+json/);
 const manifest = await response.json();
 expect(manifest).toMatchObject({ id: "/admin", scope: "/admin", start_url: "/admin", name: "Wordpairs Admin", display: "standalone" });
 for (const icon of manifest.icons) {
  const result = await request.get(icon.src);
  expect(result.status()).toBe(200);
  expect(result.headers()["content-type"]).toMatch(/image\/png/);
 }
 const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
 expect(new URL(scope).pathname).toBe("/admin");
 const cdp = await context.newCDPSession(page);
 const parsed = await cdp.send("Page.getAppManifest");
 expect(parsed.errors).toEqual([]);
 const installability = await cdp.send("Page.getInstallabilityErrors");
 expect(installability.installabilityErrors).toEqual([]);
 await writeFile(evidence + "/chromium-installability.json", JSON.stringify({ parsed, installability, qualification: "Isolated authenticated HTTP fixture and real production worker/manifest. No physical phone OS installation or live GitHub authentication claimed." }, null, 2));
 const worker = await request.get("/admin-sw.js");
 expect(worker.status()).toBe(200);
 expect(worker.headers()["cache-control"]).toMatch(/no-store/);
 expect(worker.headers()["service-worker-allowed"]).toBe("/admin");
 expect(worker.headers()["content-type"]).toMatch(/javascript/);
 } finally { await context.close(); await rm(directory, { recursive: true, force: true }); }
});
test("real admin worker provides generic offline launch and never caches private pages or APIs", async ({ page, context }) => {
 await administrator(context);
 await page.goto("/admin");
 await expect(page.getByText(owner.alias, { exact: true })).toBeVisible();
 await page.evaluate(async () => { await navigator.serviceWorker.ready; });
 await page.reload();
 await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
 await page.goto("/admin/words");
 await expect(page.getByText(owner.alias, { exact: true })).toBeVisible();
 const keys = await page.evaluate(async () => {
  const result: Record<string, string[]> = {};
  for (const name of await caches.keys()) result[name] = (await (await caches.open(name)).keys()).map(r => new URL(r.url).pathname).sort();
  return result;
 });
 expect(keys["wordpairs-admin-pwa-v1"]).toEqual(["/admin-offline.html", "/icons/apple-touch-icon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"]);
 await context.unrouteAll();
 // Fault the outgoing worker network boundary, not the document response.
 // The real worker/cache must produce the fallback; context offline emulation
 // alone does not consistently propagate to worker-owned fetches in Chromium.
 let workerNetworkFailures = 0;
 await context.route("**/*", route => {
  if (route.request().serviceWorker()) {
   workerNetworkFailures++;
   return route.abort("internetdisconnected");
  }
  return route.fallback();
 });
 const offline = await page.goto("/admin?offline-check=1");
 expect(offline?.fromServiceWorker()).toBe(true);
 expect(workerNetworkFailures).toBeGreaterThan(0);
 await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible();
 await expect(page.getByText(owner.alias, { exact: true })).toHaveCount(0);
 await context.setOffline(true);
 for (const method of ["GET", "POST"]) expect(await page.evaluate(async method => {
  try { await fetch("/api/admin/session", { method }); return "unexpected response"; } catch { return "network failure"; }
 }, method)).toBe("network failure");
 await expect(page.goto("/api/auth/github/login")).rejects.toThrow();
 await expect(page.goto("/play")).rejects.toThrow();
 await context.unrouteAll();
 await context.setOffline(false);
 await page.goto("/admin");
 await expect(page.getByRole("heading", { name: "You’re offline" })).toHaveCount(0);
 await expect(page.getByText(/restricted to the GitHub account sharpninja/)).toBeVisible();
 await expect(page.getByText(owner.alias, { exact: true })).toHaveCount(0);
});
test("phone guidance, prompt lifecycle and standalone presentation are admin-only", async ({ page, context }) => {
 await administrator(context);
 await page.goto("/admin");
 await page.getByText("Get Wordpairs Admin on your phone", { exact: true }).click();
 await expect(page.getByText(/Open as Web App/)).toBeVisible();
 await page.evaluate(() => {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  window.dispatchEvent(event);
 });
 await page.getByRole("button", { name: "Install Wordpairs Admin", exact: true }).click();
 await expect(page.getByRole("button", { name: "Install Wordpairs Admin", exact: true })).toHaveCount(0);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.screenshot({ path: evidence + "/phone-install-guidance.png", fullPage: true });
 await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
 await expect(page.getByLabel("Install Wordpairs Admin", { exact: true })).toHaveCount(0);
 await page.goto("/play");
 await expect(page.getByText(/Get Wordpairs.*on your phone/)).toHaveCount(0);
});
test("welcome card retains phone and desktop whitespace without horizontal overflow", async ({ page }) => {
 await page.route("**/api/session", route => route.fulfill({ status: 401, json: {} }));
 for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  await page.setViewportSize(viewport);
  await page.goto("/play");
  await expect(page.getByRole("button", { name: "Continue as guest" })).toBeEnabled();
  const insets = await page.locator(".identity-panel").evaluate(panel => {
   const box = panel.getBoundingClientRect(), eyebrow = panel.querySelector(".eyebrow")!.getBoundingClientRect(), button = panel.querySelector(".hero-actions button")!.getBoundingClientRect();
   return { top: eyebrow.top - box.top, left: eyebrow.left - box.left, button: button.left - box.left, bottom: box.bottom - button.bottom, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  const minimumInset = viewport.width >= 800 ? 32 : 20;
  expect(insets.top).toBeGreaterThanOrEqual(minimumInset);
  expect(insets.left).toBeGreaterThanOrEqual(minimumInset);
  expect(insets.button).toBeGreaterThanOrEqual(minimumInset);
  expect(insets.bottom).toBeGreaterThanOrEqual(minimumInset);
  expect(insets.overflow).toBe(false);
  await page.screenshot({ path: evidence + `/welcome-card-${viewport.width}.png`, fullPage: true });
 }
});

