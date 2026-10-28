import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, test } from "@playwright/test";
const evidence = "docs/evidence/pwa";
test("PWA-01/02 production manifest, icons, metadata and Chromium installation prerequisites", async ({
  request,
}) => {
  const profile = await mkdtemp(join(tmpdir(), "pwa-chrome-"));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    baseURL: "http://127.0.0.1:3200",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    ...(process.env.WORDPAIRS_BROWSER_PATH
      ? { executablePath: process.env.WORDPAIRS_BROWSER_PATH }
      : {}),
  });
  try {
    const page = await context.newPage();
    await mkdir(evidence, { recursive: true });
    await page.goto("/play");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    await expect(
      page.locator('meta[name="mobile-web-app-capable"]'),
    ).toHaveAttribute("content", "yes");
    await expect(
      page.locator('meta[name="apple-mobile-web-app-title"]'),
    ).toHaveAttribute("content", "Wordpairs");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/icons/apple-touch-icon.png",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#142c32",
    );
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.headers()["content-type"]).toMatch(
      /manifest\+json/,
    );
    const manifest = await manifestResponse.json();
    expect(manifest).toMatchObject({
      id: "/",
      scope: "/",
      start_url: "/play",
      display: "standalone",
    });
    for (const icon of manifest.icons) {
      const response = await request.get(icon.src);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toMatch(/image\/png/);
    }
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    const cdp = await context.newCDPSession(page);
    const parsed = await cdp.send("Page.getAppManifest");
    expect(parsed.errors).toEqual([]);
    const installability = await cdp.send("Page.getInstallabilityErrors");
    expect(installability.installabilityErrors).toEqual([]);
    await writeFile(
      `${evidence}/chromium-installability.json`,
      JSON.stringify(
        {
          parsed,
          installability,
          qualification:
            "Web prerequisites only; no physical phone OS installation performed.",
        },
        null,
        2,
      ),
    );
    const sw = await request.get("/sw.js");
    expect(sw.headers()["cache-control"]).toMatch(/no-store/);
    expect(sw.headers()["content-type"]).toMatch(/javascript/);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
test("PWA-03/06/07 real worker offline launch, private cache isolation and reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/play");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.goto("/admin");
  await page.evaluate(async () => {
    await fetch("/api/session");
    await fetch("/api/auth/login");
  });
  const keys = await page.evaluate(async () => {
    const result: Record<string, string[]> = {};
    for (const name of await caches.keys())
      result[name] = (await (await caches.open(name)).keys())
        .map((r) => new URL(r.url).pathname)
        .sort();
    return result;
  });
  expect(keys["wordpairs-pwa-v1"]).toEqual([
    "/icons/apple-touch-icon.png",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/maskable-512.png",
    "/offline.html",
  ]);
  await context.setOffline(true);
  await page.goto("/play");
  await expect(
    page.getByRole("heading", { name: "You’re offline" }),
  ).toBeVisible();
  for (const method of ["GET", "POST"]) {
    expect(
      await page.evaluate(async (method) => {
        try {
          await fetch("/api/session", { method });
          return "unexpected response";
        } catch {
          return "network failure";
        }
      }, method),
    ).toBe("network failure");
  }
  // Even a top-level API request must never receive the offline HTML fallback.
  await expect(page.goto("/api/session")).rejects.toThrow();
  await context.setOffline(false);
  await page.goto("/play");
  await expect(
    page.getByRole("heading", { name: "You’re offline" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "wordpairs", exact: true }),
  ).toBeVisible();
});
test("PWA-04/05 phone guidance, synthetic prompt lifecycle and installed-state UI", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Get Wordpairs on your phone", { exact: true }).click();
  await expect(page.getByText(/Open as Web App/)).toBeVisible();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "Install Wordpairs", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Install Wordpairs", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${evidence}/android-install-guidance.png`,
    fullPage: true,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByLabel("Install Wordpairs", { exact: true }),
  ).toHaveCount(0);
});
test("PWA-05 iPhone browser guidance and standalone launch presentation", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3200/play");
    await page
      .getByText("Get Wordpairs on your phone", { exact: true })
      .click();
    await expect(page.getByText(/Share/)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/iphone-install-guidance.png`,
      fullPage: true,
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "standalone", { value: true });
    });
    await page.reload();
    await expect(
      page.getByLabel("Install Wordpairs", { exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
