import { expect, type Page, test } from "@playwright/test";
import { connectGame, roomId } from "./phase6-fixture";
import { uiContentFixture } from "./ui-gaps-fixture";

// Current guest/admin release; superseded community UI journeys are retained in docs/testing/historical/.
test("TEST-CANDIDATEHOLD-141 holds preserve nominations and forbid review until reasoned resume", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  f.seedCandidate();
  try {
    await f.connect(context, "bob");
    const page = await context.newPage();
    await page.goto("/admin");
    await page.getByLabel("Decision reason").fill("Verify wording");
    await page.getByRole("button", { name: "Hold candidate" }).click();
    await expect(page.getByText("on_hold", { exact: true })).toBeVisible();
    await expect(
      page.getByText("10 unique nominations", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve for curation" }),
    ).toHaveCount(0);
    expect(f.state().publications).toHaveLength(0);
    await page.getByLabel("Submission status").selectOption("pending");
    await expect(page.getByText(/No submissions match/)).toBeVisible();
    await page.getByLabel("Submission status").selectOption("on_hold");
    await page.getByLabel("Resume reason").fill("Wording checked");
    await page.getByRole("button", { name: "Resume review" }).click();
    await page.getByLabel("Submission status").selectOption("pending");
    await expect(
      page.getByText("pending_review", { exact: true }),
    ).toBeVisible();
    expect(f.state().cases[0].nominatorIds).toHaveLength(10);
    expect(f.audits.map((a) => a.action)).toEqual(["hold", "resume"]);
  } finally {
    await context.close();
  }
});
test("TEST-NAVIGATIONDRAFTS-142 profile Cancel sends no write, preserves saved alias/icon and returns focus", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    await connectGame(context);
    const writes: unknown[] = [];
    context.on("request", (r) => {
      if (new URL(r.url()).pathname === "/api/profile")
        writes.push(r.postDataJSON());
    });
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    const opener = page.getByRole("button", {
      name: "Edit profile",
      exact: true,
    });
    await opener.click();
    await page.getByLabel("Draft profile icon").selectOption("fox");
    await page.getByLabel("Generate a new alias on Save").check();
    await page.getByRole("button", { name: "Cancel profile editing" }).click();
    await expect(opener).toBeFocused();
    expect(writes).toHaveLength(0);
    await expect(
      page.getByRole("button", { name: "Choose owl", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".profile-alias")).toContainText("Guest Oak");
    await opener.click();
    await expect(
      page.getByRole("dialog", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Draft profile icon").selectOption("fox");
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    expect(writes).toHaveLength(0);
    await opener.click();
    await expect(page.getByLabel("Draft profile icon")).toHaveValue("owl");
    await page.getByLabel("Draft profile icon").selectOption("fox");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Choose fox", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(writes).toHaveLength(1);
  } finally {
    await context.close();
  }
});
test("TEST-NAVIGATIONDRAFTS-142 privileged editor Back, Cancel and revocation clear private values", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  try {
    await f.connect(context, "root");
    const page = await context.newPage();
    await page.goto("/admin/words");
    await page
      .getByRole("button", { name: "Add word pair", exact: true })
      .click();
    await page.getByLabel("Prompt", { exact: true }).fill("Private prompt");
    await page.getByRole("link", { name: "Moderation", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goBack();
    await expect(page.getByLabel("Prompt", { exact: true })).toHaveValue(
      "Private prompt",
    );
    expect(f.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Cancel editing" }).click();
    await page
      .getByRole("button", { name: "Add word pair", exact: true })
      .click();
    await expect(page.getByLabel("Prompt", { exact: true })).toHaveValue("");
    await page.getByLabel("Prompt", { exact: true }).fill("Revoked secret");
    f.roles("root", ["player"]);
    await page.getByRole("button", { name: "Refresh word pairs" }).click();
    await expect(page.getByLabel("Prompt", { exact: true })).toHaveCount(0);
    f.roles("root", ["admin"]);
    await page.getByRole("button", { name: "Refresh word pairs" }).click();
    await page
      .getByRole("button", { name: "Add word pair", exact: true })
      .click();
    await expect(page.getByLabel("Prompt", { exact: true })).toHaveValue("");
    expect(f.writes).toHaveLength(0);
  } finally {
    await context.close();
  }
});
for (const configuration of [
  { name: "320x568", width: 320, height: 568, scale: 1, text: 1 },
  { name: "390x844", width: 390, height: 844, scale: 1, text: 1 },
  { name: "844x390", width: 844, height: 390, scale: 1, text: 1 },
  {
    name: "1280-at400%-equivalent",
    width: 320,
    height: 568,
    scale: 4,
    text: 1,
  },
  { name: "200%-text", width: 390, height: 844, scale: 1, text: 2 },
]) {
  test(`TEST-RESPONSIVEMATRIX-145 / TEST-ACCESSIBILITYDETAILS-144 ${configuration.name} game/editor reflow and controls`, async ({
    browser,
  }, info) => {
    for (const screen of ["game", "editor"]) {
      const context = await browser.newContext({
        viewport: { width: configuration.width, height: configuration.height },
        deviceScaleFactor: configuration.scale,
      });
      try {
        if (screen === "game") await connectGame(context);
        else
          await uiContentFixture().connect(
            context,
            screen === "editor" ? "root" : "alice",
          );
        const page = await context.newPage();
        await page.goto(
          screen === "game"
            ? `/rooms/${roomId}`
            : screen === "editor"
              ? "/admin/words"
              : "/content",
        );
        if (screen === "editor")
          await page
            .getByRole("button", { name: "Add word pair", exact: true })
            .click();
        const input = page.getByLabel(
          screen === "game"
            ? "Your answer"
            : screen === "editor"
              ? "Prompt"
              : "Proposed category",
          { exact: true },
        );
        await expect(input).toBeVisible();
        await input.fill(
          "Long safe draft for orientation and text enlargement",
        );
        if (configuration.text > 1)
          await page.addStyleTag({
            content: `html { font-size: ${configuration.text * 100}% !important; }`,
          });
        await input.focus();
        await page.keyboard.press("Tab");
        const measured = await page.evaluate(() => {
          const surface = document.querySelector(
            ".game-panel, .admin-surface, .content-panel",
          )!;
          const controls = [
            ...surface.querySelectorAll<HTMLButtonElement>("button"),
          ]
            .filter((e) => !e.disabled && !!e.getClientRects().length)
            .map((e) => ({
              name: e.textContent,
              width: e.getBoundingClientRect().width,
              height: e.getBoundingClientRect().height,
            }));
          const active = getComputedStyle(document.activeElement!);
          const rgb = (v: string) => v.match(/[\d.]+/g)!.map(Number);
          const luminance = (v: number[]) =>
            v
              .slice(0, 3)
              .map((n) => n / 255)
              .map((n) =>
                n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
              )
              .reduce((s, n, i) => s + n * [0.2126, 0.7152, 0.0722][i], 0);
          const ratio = (a: string, b: string) => {
            const x = luminance(rgb(a)),
              y = luminance(rgb(b));
            return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
          };
          const field = surface.querySelector(
            "input:not([type=checkbox]),textarea",
          )!;
          const fieldStyle = getComputedStyle(field);
          return {
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            controls,
            focus: { outline: active.outlineStyle, width: active.outlineWidth },
            textContrast: ratio(fieldStyle.color, fieldStyle.backgroundColor),
            controlContrast: ratio(
              fieldStyle.borderTopColor,
              fieldStyle.backgroundColor,
            ),
            focusContrast: ratio(active.outlineColor, "rgb(247,245,237)"),
            viewport: document
              .querySelector('meta[name="viewport"]')
              ?.getAttribute("content"),
          };
        });
        expect(measured.scrollWidth).toBeLessThanOrEqual(measured.width);
        expect(measured.controls.length).toBeGreaterThan(0);
        for (const control of measured.controls) {
          expect(control.width, String(control.name)).toBeGreaterThanOrEqual(
            44,
          );
          expect(control.height, String(control.name)).toBeGreaterThanOrEqual(
            44,
          );
        }
        expect(measured.textContrast).toBeGreaterThanOrEqual(4.5);
        expect(measured.controlContrast).toBeGreaterThanOrEqual(3);
        expect(measured.focusContrast).toBeGreaterThanOrEqual(3);
        expect(measured.focus.outline).toBe("solid");
        expect(measured.viewport).not.toMatch(
          /user-scalable=no|maximum-scale=1(?:,|$)/,
        );
        await page.screenshot({
          path: info.outputPath(`${screen}.png`),
          fullPage: false,
        });
        await info.attach(`${screen}-measurements`, {
          body: JSON.stringify({ configuration, ...measured }),
          contentType: "application/json",
        });
        // Orientation changes preserve the draft and never submit it.
        await page.setViewportSize({
          width: configuration.height,
          height: configuration.width,
        });
        await expect(input).toHaveValue(
          "Long safe draft for orientation and text enlargement",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      } finally {
        await context.close();
      }
    }
  });
}
test("TEST-REQUESTFEEDBACK-143 completed private room creation survives navigation without another mutation", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const writes: unknown[] = [];
  try {
    await f.connect(context, "alice");
    await context.route("**/api/rooms", async (r) => {
      writes.push(r.request().postDataJSON());
      await gate;
      await r.fulfill({ json: { roomId } });
    });
    await context.route("**/api/rooms/**", (r) =>
      r.fulfill({ status: 404, json: {} }),
    );
    const page = await context.newPage();
    await page.goto("/play");
    await page
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect.poll(() => writes.length).toBe(1);
    await page
      .getByRole("link", { name: "Community board", exact: true })
      .click();
    await expect(page).toHaveURL(/\/$/);
    const complete = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/rooms",
    );
    release();
    await (await complete).finished();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/rooms/${roomId}$`));
    expect(writes).toHaveLength(1);
  } finally {
    release();
    await context.close();
  }
});
test("TEST-ACCESSIBILITYDETAILS-144 stage, score and errors announce without moving the answer focus", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const { h, pair, advance } = await connectGame(context);
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    const input = page.getByLabel("Your answer", { exact: true });
    const live = page.locator(
      '.game-panel [role="status"][aria-atomic="true"]',
    );
    await input.fill("Still composing");
    await input.focus();
    const refresh = () =>
      page
        .getByRole("button", { name: "Refresh game", exact: true })
        .evaluate((button: HTMLButtonElement) => button.click());
    const expired = await h.expire(40000);
    expect(expired.ok).toBe(true);
    advance(20000);
    await refresh();
    await expect(live).toContainText("Stage 2");
    await expect(input).toBeFocused();
    expect((await h.answer("p2", pair.target)).ok).toBe(true);
    await refresh();
    await expect(live).toContainText("Guest Elm: 2 points");
    await expect(input).toBeFocused();
    await context.route(`**/api/rooms/${roomId}/match`, (r) =>
      r.fulfill({ status: 503, body: "DO-NOT-DISPLAY-SECRET" }),
    );
    await refresh();
    await expect(page.locator(".game-panel").getByRole("alert")).toContainText(
      "Game updates are unavailable",
    );
    await expect(input).toBeFocused();
    await expect(
      page.getByText("DO-NOT-DISPLAY-SECRET", { exact: false }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
for (const surface of ["game", "social", "room"] as const) {
  test(`TEST-REQUESTFEEDBACK-143 ${surface} denial prevents an older private GET from returning`, async ({
    browser,
  }) => {
    const context = await browser.newContext();
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const waiting = new Promise<void>((r) => {
      started = r;
    });
    try {
      await connectGame(context);
      const page = await context.newPage();
      await page.clock.install();
      const endpoint = `/api/rooms/${roomId}${surface === "game" ? "/match" : surface === "social" ? "/reactions" : ""}`;
      const original = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === endpoint &&
          r.request().method() === "GET",
      );
      await page.goto(`/rooms/${roomId}`);
      const data = await (await original).json();
      if (surface === "social")
        data.reactions = [
          {
            id: "private-reaction",
            actorId: "p2",
            emoji: "🎯",
            expiresAt: 1e9,
          },
        ];
      let hold = true;
      let denied = false;
      await context.route(`**${endpoint}`, async (r) => {
        if (r.request().method() === "POST") {
          denied = true;
          return r.fulfill({ status: 403, body: "Not authorized" });
        }
        if (hold) {
          hold = false;
          started();
          await gate;
          return r.fulfill({ json: data });
        }
        return r.fulfill({
          status: denied ? 403 : 200,
          json: denied ? {} : data,
        });
      });
      if (surface === "social") await page.clock.fastForward(1000);
      else
        await page
          .getByRole("button", {
            name: surface === "game" ? "Refresh game" : "Refresh room",
            exact: true,
          })
          .click();
      await waiting;
      if (surface === "game") {
        await page.getByLabel("Your answer", { exact: true }).fill("Cold");
        await page
          .getByRole("button", { name: "Submit answer", exact: true })
          .click();
      } else if (surface === "social") {
        await page.getByText("Send a reaction", { exact: true }).click();
        await page
          .getByRole("button", { name: /^React with/ })
          .first()
          .click();
      } else
        await page
          .getByRole("button", { name: "Copy Invitation Link", exact: true })
          .click();
      await expect.poll(() => denied).toBe(true);
      const complete = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === endpoint &&
          r.request().method() === "GET" &&
          r.status() === 200,
      );
      release();
      await (await complete).finished();
      await page.evaluate(
        () =>
          new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          ),
      );
      if (surface === "social")
        await expect(
          page
            .getByRole("list", { name: "Room reactions", exact: true })
            .getByRole("listitem"),
        ).toHaveCount(0);
      else if (surface === "game")
        await expect(page.locator(".game-prompt")).toHaveCount(0);
      else {
        await expect(page.locator(".roster li")).toHaveCount(0);
        await expect(
          page.getByRole("button", {
            name: "Copy Invitation Link",
            exact: true,
          }),
        ).toHaveCount(0);
      }
    } finally {
      release();
      await context.close();
    }
  });
}

for (const method of ["GET", "POST"] as const) {
  test(`TEST-REQUESTFEEDBACK-143 malformed room ${method} never renders parser body or raw exception`, async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      await connectGame(context);
      const page = await context.newPage();
      await page.clock.install();
      await page.goto(`/rooms/${roomId}`);
      await expect(
        page.getByRole("button", {
          name: "Copy Invitation Link",
          exact: true,
        }),
      ).toBeVisible();
      let malformed = true;
      await context.route(`**/api/rooms/${roomId}`, (r) => {
        if (r.request().method() !== method || !malformed) return r.fallback();
        malformed = false;
        return r.fulfill({
          status: 200,
          contentType: "application/json",
          body: "DO-NOT-DISPLAY-PRIVATE-ROOM-SENTINEL invalid json",
        });
      });
      await page
        .getByRole("button", {
          name: method === "GET" ? "Refresh room" : "Copy Invitation Link",
          exact: true,
        })
        .click();
      const alert = page.locator(".room-panel").getByRole("alert");
      await expect(alert).toHaveText(
        method === "GET"
          ? "Room information is unavailable. Try again."
          : "Room access is unavailable. Retry the same request.",
      );
      await expect(
        page.getByText("DO-NOT-DISPLAY-PRIVATE-ROOM-SENTINEL", {
          exact: false,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText(/SyntaxError|Unexpected token|Failed to fetch/),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Refresh room", exact: true })
        .click();
      await expect(alert).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Leave room", exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
}
