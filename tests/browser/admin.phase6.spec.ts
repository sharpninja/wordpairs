import { type BrowserContext, type Page, expect, test } from "@playwright/test";
import {
  adminDecisionFixture,
  type AdminDecisionFault,
  type AdminDecisionScenario,
} from "./admin-decision-fixture";
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
  await context.route("**/api/admin/session", (route) =>
    route.fulfill({
      json: {
        permissions: ["moderate", "manage-content", "resolve-appeals"],
        profile: {
          id,
          version: 0,
          kind: "member",
          alias: `Admin ${id}`,
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

test("fixed-owner administration has no user-delegation UI and its former endpoint stays disabled", async ({ page, context, request }) => {
 await session(context);
 await context.route("**/api/content", route => route.fulfill({json:{actorId:"owner",version:0,canModerate:true,cases:[],categories:[],catalogPairs:[]}}));
 await page.goto("/admin/users");
 await expect(page).toHaveURL(/\/admin$/);
 await expect(page.getByRole("link", {name:"Users and access"})).toHaveCount(0);
 expect((await request.get("/api/admin/users")).status()).toBe(404);
 expect((await request.post("/api/admin/users",{data:{profileId:"other",role:"admin",grant:true}})).status()).toBe(404);
});
test("guest game sessions cannot reveal private administration pages", async ({ page, context }) => {
 await context.route("**/api/session", route => route.fulfill({json:{profile:{id:"guest",kind:"guest"},permissions:["moderate","manage-content"]}}));
 await context.route("**/api/admin/session", route => route.fulfill({status:401,json:{}}));
 let privateReads=0;
 await context.route("**/api/content", route => {privateReads++;return route.fulfill({status:403,json:{}});});
 for(const path of ["/admin/words","/admin/users","/admin"]){
  await page.goto(path);
  await expect(page.getByText(/restricted to the GitHub account sharpninja/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Add word pair",exact:true})).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:"Administration",exact:true})).toHaveCount(0);
 }
 expect(privateReads).toBe(0);
});
test("late authorized moderation GET cannot restore private content after a denied mutation", async ({ browser }) => {
 const context=await browser.newContext(); let release!:()=>void;
 try{
  await session(context);
  let started!:()=>void,hold=false;
  const waiting=new Promise<void>(resolve=>{started=resolve;});
  const delayed=new Promise<void>(resolve=>{release=resolve;});
  const data={actorId:"owner",version:0,canModerate:true,isSenior:true,cases:[{id:"private",version:0,kind:"nomination",word:"Protected candidate",status:"pending",nominationCount:10,futureEligible:false,playable:false,reason:null,createdAt:1,canReview:true,canAppeal:false,canResolve:false,canActivate:false}],categories:[],catalogPairs:[],audit:[],wins:0,canSuggest:false};
  await context.route("**/api/content",async route=>{
   if(route.request().method()==="POST")return route.fulfill({status:403,json:{error:{code:"NOT_AUTHORIZED"}}});
   if(hold){hold=false;started();await delayed;}
   return route.fulfill({json:data});
  });
  const page=await context.newPage();
  await page.goto("/admin");
  const privateHeading=page.getByRole("heading",{name:"Protected candidate",exact:true});
  await expect(privateHeading).toBeVisible();
  await page.getByLabel("Decision reason",{exact:true}).fill("Review change");
  hold=true;
  await page.getByRole("button",{name:"Refresh submissions",exact:true}).click();
  await waiting;
  await page.getByRole("button",{name:"Reject",exact:true}).click();
  await expect(privateHeading).toHaveCount(0);
  const late=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/content"&&r.request().method()==="GET");
  release(); await (await late).finished();
  await expect(privateHeading).toHaveCount(0);
 }finally{release?.();await context.close();}
});

// FR-23-C01 expected outcomes come from the approved existing-case contract and
// policy, independently of the HTTP snapshot provider. This exercises real UI;
// provider authentication and PostgreSQL policy assertions remain separate.
const adminDecisionExpectations = {
  approve: { action: "review", field: "decision", button: "Approve for curation", label: "Decision reason", status: "approved", audit: "approved" },
  reject: { action: "review", field: "decision", button: "Reject", label: "Decision reason", status: "rejected", audit: "rejected" },
  uphold: { action: "resolve", field: "outcome", button: "Uphold rejection", label: "Appeal decision reason", status: "rejected", audit: "upheld" },
  overturn: { action: "resolve", field: "outcome", button: "Overturn rejection", label: "Appeal decision reason", status: "approved", audit: "overturned" },
} as const;
async function assertLegacyAdminDecision(page: Page, context: BrowserContext, scenario: AdminDecisionScenario, fault: AdminDecisionFault = "correct") {
  const fixture = await adminDecisionFixture(context, scenario, fault);
  const denied = scenario === "original-reviewer" || scenario === "proposer";
  const appeal = scenario !== "approve" && scenario !== "reject";
  const reason = "Reviewed the retained legacy evidence.";
  const oldReason = "Original legacy rejection.";
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Moderation queue", exact: true })).toBeVisible();
  await page.getByLabel("Search submissions", { exact: true }).fill("Legacy Orbit");
  await page.getByRole("combobox", { name: "Submission status", exact: true }).selectOption(appeal ? "appealed" : "pending");
  const article = page.locator(".content-case").filter({ has: page.getByRole("heading", { name: "Legacy Orbit", exact: true }) });
  await expect(article).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unrelated legacy case", exact: true })).toHaveCount(0);
  await article.getByText("Decision history", { exact: true }).click();
  const originalReviewer = scenario === "original-reviewer" ? "owner" : "legacy-reviewer";
  const proposer = scenario === "proposer" ? "owner" : "legacy-proposer";
  const beforeHistory = appeal ? [
    `rejected · revision 1 · pending → rejected · by ${originalReviewer} · ${oldReason} · 10 nominations`,
    `appeal · revision 2 · rejected → appealed · by ${proposer} · Legacy proposer requested an independent review. · 10 nominations`,
  ] : [];
  expect(await article.locator("details li").allTextContents()).toEqual(beforeHistory);
  if (denied) {
    expect({
      uphold: await article.getByRole("button", { name: "Uphold rejection", exact: true }).count(),
      overturn: await article.getByRole("button", { name: "Overturn rejection", exact: true }).count(),
      status: await article.locator("p strong").textContent(),
      history: await article.locator("details li").allTextContents(),
      writes: fixture.writes,
    }, "FR-23-C01 semantic outcome").toEqual({ uphold: 0, overturn: 0, status: "appealed", history: beforeHistory, writes: [] });
    return;
  }
  const expected = adminDecisionExpectations[scenario];
  await article.getByLabel(expected.label, { exact: true }).fill(reason);
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/content" && response.request().method() === "POST");
  await article.getByRole("button", { name: expected.button, exact: true }).click();
  expect((await saved).status()).toBe(200);
  await page.getByRole("combobox", { name: "Submission status", exact: true }).selectOption("all");
  await expect(article).toBeVisible();
  await expect.poll(() => article.locator("p strong").textContent()).not.toBe(appeal ? "appealed" : "pending");
  const details = article.locator("details").filter({ hasText: "Decision history" });
  if ((await details.getAttribute("open")) === null) await details.getByText("Decision history", { exact: true }).click();
  await expect(details).toHaveAttribute("open", "");
  const paragraphs = await article.locator("p").allTextContents();
  const body = fixture.writes[0];
  expect(body.commandId).toEqual(expect.any(String));
  expect(String(body.commandId).length).toBeGreaterThan(0);
  expect({
    status: await article.locator("p strong").textContent(),
    reason: paragraphs.find(text => text.startsWith("Reason:")),
    playable: paragraphs.includes("Playable in future rounds"),
    eligible: paragraphs.includes("Approved for curation; not playable"),
    history: await details.locator("li").allTextContents(),
    historyVisible: await details.locator("ol").isVisible(),
    reviewControls: await article.getByRole("button", { name: "Approve for curation", exact: true }).count(),
    resolveControls: await article.getByRole("button", { name: "Overturn rejection", exact: true }).count(),
    command: { action: body.action, caseId: body.caseId, reason: body.reason, expectedProfileId: body.expectedProfileId, expectedVersion: body.expectedVersion, selected: body[expected.field] },
    writeCount: fixture.writes.length,
  }, "FR-23-C01 semantic outcome").toEqual({
    status: expected.status, reason: `Reason: ${reason}`, playable: false, eligible: expected.status === "approved",
    history: [...beforeHistory, `${expected.audit} · revision ${appeal ? 3 : 1} · ${appeal ? "appealed" : "pending"} → ${expected.status} · by owner · ${reason} · 10 nominations`],
    historyVisible: true,
    reviewControls: 0, resolveControls: 0,
    command: { action: expected.action, caseId: "legacy-decision-case", reason, expectedProfileId: "owner", expectedVersion: 7, selected: scenario }, writeCount: 1,
  });
  await page.getByRole("combobox", { name: "Submission status", exact: true }).selectOption(expected.status);
  await expect(article).toBeVisible();
  await page.getByRole("combobox", { name: "Submission status", exact: true }).selectOption(expected.status === "approved" ? "rejected" : "approved");
  await expect(page.getByText("No submissions match these filters. Change the search or status.", { exact: true })).toBeVisible();
}
for (const scenario of ["approve", "reject", "uphold", "overturn"] as const) {
  test(`FR-23-C01 owner ${scenario} of an existing legacy case preserves reason and decision history`, async ({ page, context }) => {
    await assertLegacyAdminDecision(page, context, scenario);
  });
}
for (const scenario of ["original-reviewer", "proposer"] as const) {
  test(`FR-23-C01 ${scenario} owner has no appeal-resolution controls or writes`, async ({ page, context }) => {
    await assertLegacyAdminDecision(page, context, scenario);
  });
}
test("FR-23-C01 rendered assertion gate rejects wrong status, reason, history and self-resolution fixtures", async ({ browser }) => {
  for (const [scenario, fault] of [
    ["approve", "wrong-status"], ["reject", "wrong-reason"], ["overturn", "missing-history"],
    ["original-reviewer", "self-resolution"], ["proposer", "self-resolution"],
  ] as const) {
    const context = await browser.newContext();
    try {
      let failure = "";
      try { await assertLegacyAdminDecision(await context.newPage(), context, scenario, fault); }
      catch (error) { failure = error instanceof Error ? error.message : String(error); }
      expect(failure, `${scenario}/${fault} must fail its actual semantic oracle`).toContain("FR-23-C01 semantic outcome");
    } finally { await context.close(); }
  }
});

