import { expect, type Page, test } from "@playwright/test";
import { connectGame, roomId } from "./phase6-fixture";
import { uiContentFixture } from "./ui-gaps-fixture";

const fillProposal = async (page: Page) => {
  await page.getByLabel("Proposed category", { exact: true }).fill("Space");
  for (const [i, pair] of [
    { prompt: "Earth", target: "Moon" },
    { prompt: "Sun", target: "Star" },
    { prompt: "Mars", target: "Planet" },
  ].entries()) {
    await page
      .getByLabel(`Pair ${i + 1} prompt`, { exact: true })
      .fill(pair.prompt);
    await page
      .getByLabel(`Pair ${i + 1} target`, { exact: true })
      .fill(pair.target);
  }
};
test("TEST-REVIEWCHANGES-140 independent reasoned change request and proposer-only audited revision", async ({
  browser,
}) => {
  const f = uiContentFixture();
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  try {
    await Promise.all(
      contexts.map((c, i) => f.connect(c, ["alice", "bob", "mallory"][i])),
    );
    const [a, b, m] = await Promise.all(contexts.map((c) => c.newPage()));
    await a.goto("/content");
    await fillProposal(a);
    await a
      .getByRole("button", { name: "Submit suggestion", exact: true })
      .click();
    await expect(a.getByText("pending", { exact: true })).toBeVisible();
    await b.goto("/admin");
    await b
      .getByRole("button", { name: "Request changes", exact: true })
      .click();
    expect(f.state().cases[0].status).toBe("pending");
    await b.getByLabel("Decision reason").fill("Clarify the space pairs");
    await b
      .getByRole("button", { name: "Request changes", exact: true })
      .click();
    await expect(
      b.getByText("changes_requested", { exact: true }),
    ).toBeVisible();
    await a.getByRole("button", { name: "Refresh submissions" }).click();
    await expect(a.getByLabel("Revised category")).toHaveValue("Space");
    await expect(
      a.getByRole("button", { name: "Submit suggestion", exact: true }),
    ).toHaveCount(0);
    await m.goto("/content");
    const before = structuredClone(f.state());
    const status = await m.evaluate(
      async (caseId) =>
        (
          await fetch("/api/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "resubmit",
              caseId,
              expectedProfileId: "mallory",
              expectedVersion: 2,
              commandId: "forged-revision",
              proposal: {
                category: "Stolen",
                pairs: [
                  { prompt: "A", target: "B" },
                  { prompt: "C", target: "D" },
                  { prompt: "E", target: "F" },
                ],
              },
            }),
          })
        ).status,
      f.state().cases[0].id,
    );
    expect(status).toBe(403);
    expect(f.state()).toEqual(before);
    await a.getByLabel("Revised category").fill("Space revised");
    await a.getByLabel("Revised pair 3 target").fill("");
    await a.getByRole("button", { name: "Resubmit suggestion" }).click();
    expect(f.state()).toEqual(before);
    await a.getByLabel("Revised pair 3 target").fill("Planet");
    await a.getByRole("button", { name: "Resubmit suggestion" }).click();
    await expect(a.getByText("pending_review", { exact: true })).toBeVisible();
    await b.getByRole("button", { name: "Refresh submissions" }).click();
    await expect(
      b.getByRole("button", { name: "Approve for curation" }),
    ).toBeVisible();
    expect(f.state().cases[0]).toMatchObject({
      appealed: false,
      playable: false,
      version: 2,
    });
    expect(f.state().publications).toHaveLength(0);
    const revision = f.audits.find((r) => r.action === "resubmit");
    expect(revision?.details).toMatchObject({
      previousStatus: "changes_requested",
      status: "pending_review",
      previousProposal: { category: "Space" },
      proposal: { category: "Space revised" },
    });
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
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
test("TEST-NAVIGATIONDRAFTS-142 same-document Back preserves drafts; Discard, reload and identity change clear them", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  try {
    const account = await f.connect(context, "alice");
    const page = await context.newPage();
    await page.goto("/content");
    await page
      .getByLabel("Proposed category", { exact: true })
      .fill("Private Space");
    const documentId = await page.evaluate(() => {
      const id = crypto.randomUUID();
      (window as unknown as { fixtureId: string }).fixtureId = id;
      return id;
    });
    await page.getByRole("link", { name: "Find a room", exact: true }).click();
    await expect(page).toHaveURL(/\/play$/);
    await page.goBack();
    await expect(
      page.getByLabel("Proposed category", { exact: true }),
    ).toHaveValue("Private Space");
    expect(
      await page.evaluate(
        () => (window as unknown as { fixtureId: string }).fixtureId,
      ),
    ).toBe(documentId);
    expect(f.writes).toHaveLength(0);
    await page.getByRole("button", { name: "Discard suggestion" }).click();
    await expect(
      page.getByLabel("Proposed category", { exact: true }),
    ).toHaveValue("");
    await page
      .getByLabel("Proposed category", { exact: true })
      .fill("Do not reload");
    await page.reload();
    await expect(
      page.getByLabel("Proposed category", { exact: true }),
    ).toHaveValue("");
    await page
      .getByLabel("Proposed category", { exact: true })
      .fill("Alice secret");
    account.identity("mallory");
    await page.getByRole("link", { name: "Find a room", exact: true }).click();
    await expect(
      page.getByText("Guest mallory", { exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByLabel("Proposed category", { exact: true }),
    ).toHaveValue("");
    expect(f.writes).toHaveLength(0);
  } finally {
    await context.close();
  }
});
test("TEST-REQUESTFEEDBACK-143 busy and uncertain writes retain exact command through navigation", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  let release!: () => void;
  f.hold(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  f.lose();
  try {
    await f.connect(context, "alice");
    const page = await context.newPage();
    await page.goto("/content");
    await fillProposal(page);
    await page
      .getByRole("button", { name: "Submit suggestion", exact: true })
      .click();
    await expect(
      page.getByText("Saving your request…", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Discard suggestion" }),
    ).toBeDisabled();
    expect(f.writes).toHaveLength(1);
    await page.getByRole("link", { name: "Find a room", exact: true }).click();
    await expect(page).toHaveURL(/\/play$/);
    await page.goBack();
    await expect(
      page.getByRole("button", { name: "Submit suggestion", exact: true }),
    ).toBeDisabled();
    release();
    f.hold(null);
    await expect(
      page.getByRole("button", { name: "Retry pending content request" }),
    ).toBeEnabled();
    await expect(
      page.getByLabel("Proposed category", { exact: true }),
    ).toHaveValue("Space");
    await expect(
      page.getByText("DO-NOT-DISPLAY-SECRET", { exact: false }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Retry pending content request" })
      .click();
    await expect(page.getByText("pending", { exact: true })).toBeVisible();
    expect(f.writes).toHaveLength(2);
    expect(f.writes[1]).toEqual(f.writes[0]);
    expect(f.state().cases).toHaveLength(1);
  } finally {
    release();
    await context.close();
  }
});
test("TEST-REQUESTFEEDBACK-143 distinct loading, empty and safe read failure with explicit retry", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const account = await f.connect(context, "alice");
    account.reads(async (route, data) => {
      await gate;
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    await page.goto("/content");
    await expect(
      page.getByText("Loading your submissions…", { exact: true }),
    ).toBeVisible();
    release();
    await expect(page.getByText(/No submissions yet/)).toBeVisible();
    account.reads(async (route) => {
      await route.fulfill({
        status: 500,
        json: { message: "DO-NOT-DISPLAY-SECRET" },
      });
    });
    await page.getByRole("button", { name: "Refresh submissions" }).click();
    await expect(
      page.locator(".content-panel").getByRole("alert"),
    ).toContainText("Submission updates are unavailable");
    await expect(
      page.getByText("DO-NOT-DISPLAY-SECRET", { exact: false }),
    ).toHaveCount(0);
    account.reads(null);
    await page.getByRole("button", { name: "Refresh submissions" }).click();
    await expect(page.locator(".content-panel").getByRole("alert")).toHaveCount(
      0,
    );
  } finally {
    release();
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
test("TEST-REQUESTFEEDBACK-143 previous-profile write completion cannot restore private state or success", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  let release!: () => void;
  f.hold(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  try {
    const account = await f.connect(context, "alice");
    const page = await context.newPage();
    await page.goto("/content");
    await fillProposal(page);
    await page
      .getByRole("button", { name: "Submit suggestion", exact: true })
      .click();
    await expect.poll(() => f.writes.length).toBe(1);
    await page.getByRole("link", { name: "Find a room", exact: true }).click();
    await expect(page).toHaveURL(/\/play$/);
    account.identity("mallory");
    await page.goBack();
    await expect(
      page.getByText("Guest mallory", { exact: true }),
    ).toBeVisible();
    const completed = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/content" &&
        r.request().method() === "POST",
    );
    release();
    f.hold(null);
    await (await completed).finished();
    await page.getByRole("button", { name: "Refresh submissions" }).click();
    await expect(
      page.getByLabel("Proposed category", { exact: true }),
    ).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "Retry pending content request" }),
    ).toHaveCount(0);
    await expect(
      page.locator(".content-panel").getByText("Saved.", { exact: true }),
    ).toHaveCount(0);
    expect(f.state().cases[0].proposerId).toBe("alice");
  } finally {
    release();
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
  test(`TEST-RESPONSIVEMATRIX-145 / TEST-ACCESSIBILITYDETAILS-144 ${configuration.name} game/content/editor reflow and controls`, async ({
    browser,
  }, info) => {
    for (const screen of ["game", "content", "editor"]) {
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
test("TEST-NAVIGATIONDRAFTS-142 replacement session for the same profile clears drafts", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const f = uiContentFixture();
  try {
    const account = await f.connect(context, "alice");
    const page = await context.newPage();
    await page.goto("/content");
    await page
      .getByLabel("Proposed category", { exact: true })
      .fill("Previous session secret");
    account.replaceSession();
    await page.getByRole("link", { name: "Find a room", exact: true }).click();
    await expect(page).toHaveURL(/\/play$/);
    await page.goBack();
    await expect(
      page.getByLabel("Proposed category", { exact: true }),
    ).toHaveValue("");
    expect(f.writes).toHaveLength(0);
  } finally {
    await context.close();
  }
});
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
      .getByRole("link", { name: "Community content", exact: true })
      .click();
    await expect(page).toHaveURL(/\/content$/);
    const complete = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/rooms",
    );
    release();
    await (await complete).finished();
    await page.getByRole("link", { name: "Find a room", exact: true }).click();
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
          .getByRole("button", { name: "Create invitation link", exact: true })
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
            name: "Create invitation link",
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

for (const surface of ["game-read", "game-write", "social-read"] as const) {
  test(`TEST-REQUESTFEEDBACK-143 obsolete ${surface} denial cannot clear a replacement profile draft`, async ({
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
      await page.goto(`/rooms/${roomId}`);
      await expect(
        page.getByLabel("Your answer", { exact: true }),
      ).toBeVisible();
      const endpoint = `/api/rooms/${roomId}/${surface === "social-read" ? "reactions" : "match"}`;
      const method = surface === "game-write" ? "POST" : "GET";
      await context.route(`**${endpoint}`, async (r) => {
        if (r.request().method() !== method) return r.fallback();
        started();
        await gate;
        return r.fulfill({ status: 403, body: "Obsolete denial" });
      });
      if (surface === "game-write") {
        await page.getByLabel("Your answer", { exact: true }).fill("Cold");
        await page
          .getByRole("button", { name: "Submit answer", exact: true })
          .click();
      } else if (surface === "social-read") await page.clock.fastForward(1000);
      else
        await page
          .getByRole("button", { name: "Refresh game", exact: true })
          .click();
      await waiting;
      await uiContentFixture().connect(context, "alice");
      await page
        .getByRole("link", {
          name: "Your submissions and community content",
          exact: true,
        })
        .click();
      const draft = page.getByLabel("Proposed category", { exact: true });
      await draft.fill("Replacement profile draft");
      const complete = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === endpoint &&
          r.request().method() === method &&
          r.status() === 403,
      );
      release();
      await (await complete).finished();
      await page.evaluate(
        () =>
          new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          ),
      );
      await expect(draft).toHaveValue("Replacement profile draft");
      await page
        .getByRole("link", { name: "Find a room", exact: true })
        .click();
      await expect(page).toHaveURL(/\/play$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/content$/);
      await expect(draft).toHaveValue("Replacement profile draft");
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
          name: "Create invitation link",
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
          name: method === "GET" ? "Refresh room" : "Create invitation link",
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
