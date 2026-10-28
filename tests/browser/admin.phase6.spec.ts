import { type BrowserContext, expect, test } from "@playwright/test";
import {
  type ContentAction,
  type ContentContext,
  type ContentPort,
  ContentService,
} from "../../src/application/content";
import type { Command, Transition } from "../../src/application/ports";
import { buildCatalog } from "../../src/domain/catalog";
import { type ContentState, emptyContent } from "../../src/domain/content";
import type { Pair } from "../../src/domain/model";
import { failure, type Result, success } from "../../src/domain/result";
import seed from "../../src/infrastructure/catalog-seed.json" with {
  type: "json",
};
import { contentAction } from "../../src/web/content-input";

const value = <T>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};
async function session(context: BrowserContext, id = "owner") {
  await context.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        profile: {
          id,
          version: 0,
          kind: "guest",
          alias: `Guest ${id}`,
          icon: "owl",
          publicLeaderboard: false,
          wins: 0,
          points: 0,
          earliestWinAt: null,
        },
      },
    }),
  );
}
// HTTP transport fixture: real content policy/service, in-memory transaction port.
async function catalogFixture(context: BrowserContext) {
  await session(context);
  let state = emptyContent();
  let serial = 0;
  let catalog = value(buildCatalog(seed.categories, seed.pairs as Pair[]));
  const records = new Map<string, Result<Transition<ContentState, unknown>>>();
  const writes: unknown[] = [];
  let uncertain = true;
  const evidence = (): ContentContext => ({
    actor: { profileId: "owner", roles: ["admin"] },
    wins: 0,
    catalog,
  });
  const port: ContentPort = {
    read: async () => success({ state, evidence: evidence() }),
    async transact<T>(
      command: Command,
      _action: ContentAction,
      decide: (
        state: ContentState,
        evidence: ContentContext,
      ) => Promise<Result<Transition<ContentState, T>>>,
    ) {
      const prior = records.get(command.commandId);
      if (prior) return prior as Result<Transition<ContentState, T>>;
      if (command.expectedVersion !== state.version) return failure("CONFLICT");
      const next = await decide(structuredClone(state), evidence());
      if (next.ok) {
        const previous = state.publications.length;
        state = next.value.state;
        catalog = {
          ...catalog,
          pairs: [
            ...catalog.pairs,
            ...state.publications
              .slice(previous)
              .flatMap((publication) => publication.content.pairs),
          ],
        };
        records.set(command.commandId, next);
      }
      return next;
    },
  };
  const service = new ContentService(
    port,
    { now: () => 1000 },
    { next: () => `admin-browser-${++serial}` },
  );
  await context.route("**/api/content", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: value(await service.view("owner")) });
    const body = route.request().postDataJSON();
    writes.push(body);
    const action = contentAction(body);
    if (!action) throw new Error("Bad content action");
    const result = await service.act(
      {
        aggregateId: "content-catalog",
        actorId: "owner",
        commandId: body.commandId,
        expectedVersion: body.expectedVersion,
        requestDigest: JSON.stringify(action),
      },
      action,
    );
    if (uncertain && result.ok) {
      uncertain = false;
      return route.fulfill({
        status: 503,
        json: { error: { code: "TEMPORARY_UNAVAILABLE" } },
      });
    }
    return route.fulfill({
      status: result.ok ? 200 : 409,
      json: result.ok ? result.value : result,
    });
  });
  return { writes, catalog: () => catalog };
}
test("phone catalog form creates and edits all three hints, and retries an uncertain save without duplicating content", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const fixture = await catalogFixture(context);
    const page = await context.newPage();
    await page.goto("/admin/words");
    await page
      .getByRole("button", { name: "Add word pair", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Pair category", exact: true })
      .selectOption("opposites");
    await page.getByLabel("Prompt", { exact: true }).fill("Cloud");
    await page.getByLabel("Target answer", { exact: true }).fill("Rain");
    for (let n = 1; n <= 3; n++)
      await page
        .getByRole("textbox", { name: `Hint ${n}`, exact: true })
        .fill(`Clue ${n}`);
    await page
      .getByLabel("Change reason", { exact: true })
      .fill("Add weather association");
    if (process.env.WORDPAIRS_ADMIN_CAPTURES)
      await page
        .locator(".admin-editor")
        .screenshot({ path: "/tmp/wordpairs-admin-editor-phone.png" });
    await page
      .getByRole("button", { name: "Save word pair", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Retry pending admin request" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Retry pending admin request" })
      .click();
    await expect(
      page.getByRole("button", { name: "Save word pair", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Cloud → Rain", exact: true }),
    ).toBeVisible();
    expect(fixture.writes).toHaveLength(2);
    expect(fixture.writes[0]).toEqual(fixture.writes[1]);
    await page.getByRole("button", { name: "Edit Cloud", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Hint 2", exact: true })
      .fill("An improved clue");
    await page
      .getByLabel("Change reason", { exact: true })
      .fill("Improve hint clarity");
    await page
      .getByRole("button", { name: "Save word pair", exact: true })
      .click();
    await expect(
      page.getByRole("list", { name: "Hints for Cloud" }),
    ).toContainText("An improved clue");
    const versions = fixture
      .catalog()
      .pairs.filter((p) => p.prompt === "Cloud");
    expect(versions.map((p) => p.version)).toEqual([0, 1]);
    expect(versions[0].hints[1]).toBe("Clue 2");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
test("administrator searches users, grants/revokes moderation and clears private results after authorization loss", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    await session(context);
    let version = 0;
    let moderator = false;
    let denied = false;
    const writes: unknown[] = [];
    await context.route("**/api/admin/users**", async (route) => {
      if (denied)
        return route.fulfill({
          status: 403,
          json: { error: { code: "NOT_AUTHORIZED" } },
        });
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        writes.push(body);
        moderator = body.grant;
        return route.fulfill({ json: { version: ++version } });
      }
      const search =
        new URL(route.request().url()).searchParams.get("search") ?? "";
      const users = [
        {
          id: "owner",
          alias: "Guest owner",
          kind: "guest",
          configuredAdmin: true,
          roles: ["player", "admin"],
        },
        {
          id: "alice",
          alias: "Guest Alice",
          kind: "guest",
          configuredAdmin: false,
          roles: moderator ? ["player", "moderator"] : ["player"],
        },
      ].filter((user) =>
        `${user.id} ${user.alias}`.toLowerCase().includes(search.toLowerCase()),
      );
      return route.fulfill({
        json: {
          actorId: "owner",
          version,
          users,
          total: users.length,
          audit: [],
        },
      });
    });
    const page = await context.newPage();
    await page.goto("/admin/users");
    await expect(
      page.getByText(
        "Administrator access is controlled by server configuration.",
      ),
    ).toBeVisible();
    await page.getByLabel("Search users by alias or profile ID").fill("Alice");
    await page
      .getByRole("button", { name: "Search users", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Grant moderator for Guest Alice",
        exact: true,
      })
      .click();
    await page.getByLabel("Access change reason").fill("Trusted reviewer");
    await page.getByRole("button", { name: "Confirm access change" }).click();
    await expect(
      page.getByRole("button", {
        name: "Revoke moderator for Guest Alice",
        exact: true,
      }),
    ).toBeVisible();
    if (process.env.WORDPAIRS_ADMIN_CAPTURES)
      await page
        .locator(".admin-surface")
        .screenshot({ path: "/tmp/wordpairs-admin-users-phone.png" });
    await page
      .getByRole("button", {
        name: "Revoke moderator for Guest Alice",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Access change reason")
      .fill("Review assignment ended");
    await page.getByRole("button", { name: "Confirm access change" }).click();
    await expect(
      page.getByRole("button", {
        name: "Grant moderator for Guest Alice",
        exact: true,
      }),
    ).toBeVisible();
    expect(writes).toMatchObject([
      {
        profileId: "alice",
        role: "moderator",
        grant: true,
        expectedProfileId: "owner",
      },
      {
        profileId: "alice",
        role: "moderator",
        grant: false,
        expectedProfileId: "owner",
      },
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    denied = true;
    await page.getByRole("button", { name: "Refresh user access" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Access required" }),
    ).toContainText("Access required");
    await expect(
      page.getByRole("heading", { name: "Guest Alice", exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
test("ordinary players cannot see the catalog or user directory on administration pages", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    await session(context, "player");
    await context.route("**/api/content", (route) =>
      route.fulfill({
        json: {
          actorId: "player",
          version: 0,
          canModerate: false,
          cases: [],
          catalogPairs: [],
          categories: [],
        },
      }),
    );
    await context.route("**/api/admin/users**", (route) =>
      route.fulfill({
        status: 403,
        json: { error: { code: "NOT_AUTHORIZED" } },
      }),
    );
    const page = await context.newPage();
    await page.goto("/admin/words");
    await expect(
      page.getByRole("alert").filter({ hasText: "Access required" }),
    ).toContainText("Access required");
    await expect(
      page.getByRole("button", { name: "Add word pair", exact: true }),
    ).toHaveCount(0);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("alert").filter({ hasText: "Access required" }),
    ).toContainText("Access required");
    await expect(page.getByRole("article")).toHaveCount(0);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Moderation access required" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const section of ["users", "moderation"] as const)
  test(`late authorized ${section} GET cannot restore private data after a mutation is denied`, async ({
    browser,
  }) => {
    const context = await browser.newContext();
    let release = () => {};
    try {
      await session(context);
      let holdNext = false;
      let started = () => {};
      const waiting = new Promise<void>((resolve) => {
        started = resolve;
      });
      const delayed = new Promise<void>((resolve) => {
        release = resolve;
      });
      const api = section === "users" ? "/api/admin/users" : "/api/content";
      const data =
        section === "users"
          ? {
              actorId: "owner",
              version: 0,
              total: 1,
              audit: [],
              users: [
                {
                  id: "private",
                  alias: "Protected Alice",
                  kind: "guest",
                  configuredAdmin: false,
                  roles: ["player"],
                },
              ],
            }
          : {
              actorId: "owner",
              version: 0,
              canModerate: true,
              isSenior: true,
              cases: [
                {
                  id: "private",
                  version: 0,
                  kind: "nomination",
                  word: "Protected candidate",
                  status: "pending",
                  nominationCount: 10,
                  futureEligible: false,
                  playable: false,
                  reason: null,
                  createdAt: 1,
                  canReview: true,
                  canAppeal: false,
                  canResolve: false,
                  canActivate: false,
                },
              ],
              categories: [],
              catalogPairs: [],
              audit: [],
              wins: 0,
              canSuggest: false,
            };
      await context.route(`**${api}**`, async (route) => {
        if (route.request().method() === "POST")
          return route.fulfill({
            status: 403,
            json: { error: { code: "NOT_AUTHORIZED" } },
          });
        if (holdNext) {
          holdNext = false;
          started();
          await delayed;
        }
        return route.fulfill({ json: data });
      });
      const page = await context.newPage();
      await page.goto(section === "users" ? "/admin/users" : "/admin");
      const privateHeading = page.getByRole("heading", {
        name: section === "users" ? "Protected Alice" : "Protected candidate",
        exact: true,
      });
      await expect(privateHeading).toBeVisible();
      if (section === "users") {
        await page
          .getByRole("button", {
            name: "Grant moderator for Protected Alice",
            exact: true,
          })
          .click();
        await page.getByLabel("Access change reason").fill("Review change");
      } else
        await page
          .getByLabel("Decision reason", { exact: true })
          .fill("Review change");
      holdNext = true;
      await page
        .getByRole("button", {
          name:
            section === "users" ? "Refresh user access" : "Refresh submissions",
          exact: true,
        })
        .click();
      await waiting;
      await page
        .getByRole("button", {
          name: section === "users" ? "Confirm access change" : "Reject",
          exact: true,
        })
        .click();
      await expect(privateHeading).toHaveCount(0);
      const late = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === api &&
          response.request().method() === "GET",
      );
      release();
      await (await late).finished();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(privateHeading).toHaveCount(0);
    } finally {
      release();
      await context.close();
    }
  });
