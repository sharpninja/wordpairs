import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { connectGame, roomId } from "./phase6-fixture";

test("AC-05-T01 counterpart artwork retry renders the successfully probed URL", async ({
  browser,
}, info) => {
  const context = await browser.newContext();
  try {
    await connectGame(context);
    await context.route("**/backgrounds/heroes-16x9.webp*", (route) =>
      new URL(route.request().url()).searchParams.has("attempt")
        ? route.fulfill({
            status: 200,
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
          })
        : route.fulfill({ status: 404, body: "Missing original asset" }),
    );
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    await expect(
      page.getByText("Category artwork unavailable", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Retry artwork", exact: true })
      .click();
    await expect(page.locator(".game-panel")).toHaveAttribute(
      "data-artwork",
      "loaded",
    );
    const observed = await page
      .locator(".game-panel")
      .evaluate(async (element) => {
        const background = getComputedStyle(
          document.querySelector(".game-backdrop")!,
        ).backgroundImage;
        const image = new Image();
        image.src = background.slice(5, -2);
        let decoded = true;
        try {
          await image.decode();
        } catch {
          decoded = false;
        }
        return { background, decoded };
      });
    await writeFile(
      info.outputPath("artwork-retry.json"),
      JSON.stringify(observed, null, 2),
    );
    expect(observed.decoded).toBe(true);
    expect(observed.background).toContain(
      "/backgrounds/heroes-16x9.webp?attempt=1",
    );
    await expect(
      page.getByText("Category artwork unavailable", { exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("AC-05-T01 counterpart artwork failure shows an accessible fallback with usable answer controls", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    await connectGame(context);
    await context.route("**/backgrounds/heroes-9x16.webp", (r) =>
      r.abort("failed"),
    );
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    await expect(
      page.getByText("Category artwork unavailable", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
    await expect(page.locator(".game-panel")).toHaveAttribute(
      "data-artwork",
      "fallback",
    );
    const observed = await page.locator(".game-panel").evaluate((e) => ({
      background: getComputedStyle(e).backgroundImage,
      controlsUsable: !(e.querySelector("input") as HTMLInputElement)?.disabled,
      fallbackLabel: e.textContent?.includes("Category artwork unavailable"),
    }));
    await writeFile(
      info.outputPath("artwork-fallback.json"),
      JSON.stringify(observed, null, 2),
    );
    await context.unroute("**/backgrounds/heroes-9x16.webp");
    await page
      .getByRole("button", { name: "Retry artwork", exact: true })
      .click();
    await expect(page.locator(".game-panel")).toHaveAttribute(
      "data-artwork",
      "loaded",
    );
    await expect(
      page.getByText("Category artwork unavailable", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
  } finally {
    await context.close();
  }
});

for (const [category, index] of [
  ["heroes", 0],
  ["heroes", 1],
  ["colors", 0],
  ["years", 0],
  ["directors", 0],
  ["singers", 0],
  ["opposites", 0],
] as const) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 960 },
  ]) {
    test(`AC-05-T01 counterpart real ${category} asset for pair ${index} at ${viewport.width}`, async ({
      browser,
    }, info) => {
      const context = await browser.newContext({
        viewport,
      });
      try {
        const { pair } = await connectGame(context, category, index);
        const page = await context.newPage();
        await page.goto(`/rooms/${roomId}`);
        await expect(page.locator(".game-panel")).toHaveAttribute(
          "data-artwork",
          "loaded",
        );
        await expect(page.locator(".game-prompt")).toHaveText(pair.prompt);
        await expect(
          page.getByLabel("Your answer", { exact: true }),
        ).toBeEnabled();
        const artwork = page.locator(".game-backdrop");
        await expect(page.locator(".category-artwork")).toHaveCount(0);
        await expect(artwork).toBeVisible();
        const observed = await page
          .locator(".game-panel")
          .evaluate(async (e) => {
            const surface = getComputedStyle(e.querySelector(".game-surface")!);
            const prompt = getComputedStyle(e.querySelector(".game-prompt")!);
            const luminance = (color: string) => {
              const channels = color
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number)
                .map((c) => {
                  const v = c / 255;
                  return v <= 0.04045
                    ? v / 12.92
                    : ((v + 0.055) / 1.055) ** 2.4;
                });
              return (
                channels[0] * 0.2126 +
                channels[1] * 0.7152 +
                channels[2] * 0.0722
              );
            };
            const contrastFor = (fill: string, color: string) => {
              const rgba = fill.match(/[\d.]+/g)!.map(Number);
              const opacity = rgba[3] ?? 1;
              const foreground = luminance(color);
              return Math.min(
                ...[0, 255].map((underlay) => {
                  const composite = rgba
                    .slice(0, 3)
                    .map((c) => c * opacity + underlay * (1 - opacity));
                  const background = luminance(`rgb(${composite.join(",")})`);
                  return (
                    (Math.max(background, foreground) + 0.05) /
                    (Math.min(background, foreground) + 0.05)
                  );
                }),
              );
            };
            const topbar = getComputedStyle(document.querySelector(".topbar")!);
            const install = getComputedStyle(
              document.querySelector(".pwa-install")!,
            );
            const backdrop = document.querySelector(".game-backdrop")!;
            const background = getComputedStyle(backdrop).backgroundImage;
            const image = new Image();
            image.src = background.slice(5, -2);
            await image.decode();
            return {
              background,
              backdropPosition: getComputedStyle(backdrop).position,
              backdropWidth: backdrop.getBoundingClientRect().width,
              backdropHeight: backdrop.getBoundingClientRect().height,
              viewportWidth: innerWidth,
              viewportHeight: innerHeight,
              prompt: e.querySelector("h3")?.textContent,
              promptContrast: contrastFor(
                surface.backgroundColor,
                prompt.color,
              ),
              headerContrast: contrastFor(topbar.backgroundColor, topbar.color),
              installContrast: contrastFor(
                install.backgroundColor,
                install.color,
              ),
              surfaceOpacity: Number(
                surface.backgroundColor.match(/[\d.]+/g)![3] ?? 1,
              ),
              backdropFilter: surface.backdropFilter,
              surfaceBackground: surface.backgroundColor,
              imageWidth: image.naturalWidth,
              imageHeight: image.naturalHeight,
              noHorizontalOverflow:
                document.documentElement.scrollWidth <= innerWidth,
            };
          });
        expect(observed.backdropPosition).toBe("fixed");
        expect(observed.backdropWidth).toBe(observed.viewportWidth);
        expect(observed.backdropHeight).toBe(observed.viewportHeight);
        expect(observed.imageWidth).toBe(
          viewport.width < viewport.height ? 864 : 1536,
        );
        expect(observed.imageHeight).toBe(
          viewport.width < viewport.height ? 1536 : 864,
        );
        expect(observed.promptContrast).toBeGreaterThanOrEqual(4.5);
        expect(observed.headerContrast).toBeGreaterThanOrEqual(4.5);
        expect(observed.installContrast).toBeGreaterThanOrEqual(4.5);
        expect(observed.surfaceOpacity).toBeGreaterThanOrEqual(0.85);
        expect(observed.surfaceOpacity).toBeLessThan(1);
        expect(observed.backdropFilter).toContain("blur");
        expect(observed.noHorizontalOverflow).toBe(true);
        await page
          .locator(".game-panel")
          .evaluate((e) =>
            e.scrollIntoView({ block: "start", behavior: "instant" }),
          );
        await page.screenshot({
          path: info.outputPath("category.png"),
          animations: "disabled",
        });
        expect(observed.background).toContain(
          `/backgrounds/${category}-${viewport.width < viewport.height ? "9x16" : "16x9"}.webp`,
        );
        await page
          .locator(".game-surface, .topbar, .pwa-install")
          .evaluateAll((elements) => {
            for (const element of elements) {
              (element as HTMLElement).style.backdropFilter = "none";
              (element as HTMLElement).style.setProperty(
                "-webkit-backdrop-filter",
                "none",
              );
            }
          });
        const withoutBlur = await page
          .locator(".game-surface, .topbar, .pwa-install")
          .evaluateAll((elements) =>
            elements.map((e) => ({
              fill: getComputedStyle(e).backgroundColor,
              blur: getComputedStyle(e).backdropFilter,
            })),
          );
        expect(withoutBlur).toHaveLength(3);
        for (const style of withoutBlur) {
          expect(style.fill).toBe(observed.surfaceBackground);
          expect(style.blur).toBe("none");
        }
        await expect(
          page.getByLabel("Your answer", { exact: true }),
        ).toBeEnabled();
        if (viewport.width < viewport.height) {
          await page.setViewportSize({ width: 844, height: 390 });
          await expect(page.locator(".game-panel")).toHaveAttribute(
            "data-artwork",
            "loaded",
          );
          await expect
            .poll(() =>
              artwork.evaluate((e) => getComputedStyle(e).backgroundImage),
            )
            .toContain(`/backgrounds/${category}-16x9.webp`);
          await page.setViewportSize(viewport);
          await expect(page.locator(".game-panel")).toHaveAttribute(
            "data-artwork",
            "loaded",
          );
          await expect
            .poll(() =>
              artwork.evaluate((e) => getComputedStyle(e).backgroundImage),
            )
            .toContain(`/backgrounds/${category}-9x16.webp`);
        }
        await writeFile(
          info.outputPath("artwork.json"),
          JSON.stringify({ pairId: pair.id, category, ...observed }, null, 2),
        );
      } finally {
        await context.close();
      }
    });
  }
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 568, height: 320 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`AC-15/44 counterparts ${viewport.width}x${viewport.height} keyboard and touch`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: true });
    try {
      const { pair } = await connectGame(context);
      const page = await context.newPage();
      await page.goto(`/rooms/${roomId}`);
      const input = page.getByLabel("Your answer", { exact: true });
      await expect(input).toBeEnabled();
      await expect(page.getByLabel("Your visible hints")).toBeVisible();
      await expect(
        page.getByRole("table").filter({
          has: page.getByText("Round 1 scorecard", { exact: true }),
        }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await input.tap();
      await input.fill(pair.target);
      // A keyboard transition from the answer field must reach the enabled primary control.
      await page.keyboard.press("Tab");
      const submit = page.getByRole("button", {
        name: "Submit answer",
        exact: true,
      });
      await expect(submit).toBeFocused();
      const measured = await page.evaluate(() => {
        const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
        const composite = (fg: number[], bg: number[]) =>
          fg
            .slice(0, 3)
            .map((c, i) => c * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
        const lum = (a: number[]) =>
          a
            .slice(0, 3)
            .map((x) => {
              const v = x / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            })
            .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const ratio = (a: number[], b: number[]) => {
          const x = lum(a),
            y = lum(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        const surface = getComputedStyle(
          document.querySelector(".game-surface")!,
        );
        const overlay = rgb(surface.backgroundColor);
        const samples = [
          ".game-prompt",
          ".game-hints",
          "label",
          ".score-table",
          'button[type="submit"]',
        ].map((selector) => {
          const e = document.querySelector(`.game-panel ${selector}`)!;
          const s = getComputedStyle(e);
          const bg = rgb(s.backgroundColor);
          const backgrounds = [
            [0, 0, 0],
            [255, 255, 255],
          ].map((base) => composite(bg, composite(overlay, base)));
          return {
            selector,
            color: s.color,
            background: s.backgroundColor,
            ratios: backgrounds.map((b) => ratio(rgb(s.color), b)),
          };
        });
        const focus = getComputedStyle(document.activeElement!);
        return {
          overlay: surface.backgroundColor,
          samples,
          focus: {
            width: focus.outlineWidth,
            style: focus.outlineStyle,
            color: focus.outlineColor,
          },
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          buttonHeight: document.activeElement!.getBoundingClientRect().height,
        };
      });
      for (const sample of measured.samples)
        expect(
          Math.min(...sample.ratios),
          sample.selector,
        ).toBeGreaterThanOrEqual(4.5);
      expect(measured.focus.style).toBe("solid");
      expect(Number.parseFloat(measured.focus.width)).toBeGreaterThanOrEqual(3);
      expect(measured.buttonHeight).toBeGreaterThanOrEqual(44);
      if (viewport.width < viewport.height) await page.keyboard.press("Enter");
      else await submit.tap();
      await expect(
        page.getByText(
          "✓ Solved. Your score is locked; later hints stay private to unsolved players.",
        ),
      ).toBeVisible();
      await expect(page.getByText(/Solved · \+3 points/)).toBeVisible();
      await writeFile(
        info.outputPath("accessibility.json"),
        JSON.stringify(
          {
            viewport,
            input: viewport.width < viewport.height ? "keyboard" : "touch",
            ...measured,
            solvedText: await page
              .getByText(/^✓ Solved\. Your score/)
              .textContent(),
            scoreText: await page
              .getByText(/Solved · \+3 points/)
              .textContent(),
          },
          null,
          2,
        ),
      );
      await page.screenshot({
        path: info.outputPath("solved.png"),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });
}

test("AC-03/44 chosen icon persists through reload, room, live scorecard, summary and final standings", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const { h, pair, advance } = await connectGame(context, "heroes", 0, 0);
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    const selected = page.getByRole("button", {
      name: "Choose frog",
      exact: true,
    });
    await selected.click();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    const playerRow = (table: ReturnType<typeof page.getByRole>) =>
      table.getByRole("row").filter({ hasText: "Guest Oak" });
    await expect(
      page
        .locator(".roster li")
        .filter({ hasText: "Guest Oak" })
        .getByRole("img", { name: "frog", exact: true }),
    ).toBeVisible();
    const scorecard = page.getByRole("table", {
      name: "Round 1 scorecard",
      exact: true,
    });
    await expect(
      playerRow(scorecard).getByRole("img", { name: "frog", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Your answer", { exact: true }).fill(pair.target);
    await page
      .getByRole("button", { name: "Submit answer", exact: true })
      .click();
    valueForBrowser(await h.answer("p2", pair.target));
    await page
      .getByRole("button", { name: "Refresh game", exact: true })
      .click();
    await expect(
      page.getByText("Correct answer:", { exact: false }),
    ).toBeVisible();
    await expect(
      playerRow(scorecard).getByRole("img", { name: "frog", exact: true }),
    ).toBeVisible();
    for (let round = 2; round <= 8; round++) {
      valueForBrowser(
        await h.act(
          h.store.state.autoCategoryId
            ? { type: "continue" }
            : { type: "choose", categoryId: "heroes" },
          h.store.state.chooserId ?? "p1",
        ),
      );
      advance(80000);
      valueForBrowser(await h.expire(round * 80000));
    }
    await page
      .getByRole("button", { name: "Refresh game", exact: true })
      .click();
    const final = page.getByRole("table", {
      name: "Final ranking",
      exact: true,
    });
    await expect(
      playerRow(final).getByRole("img", { name: "frog", exact: true }),
    ).toBeVisible();
    await writeFile(
      info.outputPath("icon-lifecycle.json"),
      JSON.stringify(
        {
          chosen: "frog",
          pressed: await selected.getAttribute("aria-pressed"),
          finalRow: await playerRow(final).textContent(),
          rounds: h.store.state.rounds.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
  }
});
function valueForBrowser<T>(
  result: { ok: true; value: T } | { ok: false; error: { code: string } },
) {
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

test("maximum room roster and 25-player scorecard remain usable on a phone", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
  });
  try {
    await connectGame(context, "heroes", 0, 1, 25);
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    await expect(
      page.getByText("25 / 25 players · 0 open player slots · playing"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Observers (25 / 25)" }),
    ).toBeVisible();
    const table = page.getByRole("table", {
      name: "Round 1 scorecard",
      exact: true,
    });
    await expect(table.getByRole("row")).toHaveCount(26);
    await table.getByRole("row").last().scrollIntoViewIfNeeded();
    await expect(table.getByRole("row").last()).toContainText("Guest p25");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await writeFile(
      info.outputPath("maximum-room.json"),
      JSON.stringify(
        {
          players: 25,
          observers: 25,
          scoreRows: (await table.getByRole("row").count()) - 1,
          viewport: { width: 320, height: 568 },
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
  }
});
