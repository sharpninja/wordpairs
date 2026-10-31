# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-player-counts.integration.spec.ts >> LIVE-SCALE 4 real browser players complete eight UI rounds
- Location: tests/browser/live-player-counts.integration.spec.ts:18:29

# Error details

```
AssertionError: Unknown pending command blocks a new intent
actual expected

'disablsednt'

```

# Test source

```ts
  1  | import assert from "node:assert/strict";
  2  | import { expect, type Page } from "@playwright/test";
  3  | import type { AckMode, AckOutcome, OwnSolveState, Scope, UiCommandState } from "./ui-command-acknowledgement.contract";
  4  | 
  5  | /** A delivered projection does not establish that the sender retired its command. */
  6  | export function commandUiState(value: UiCommandState, scope: Scope, minimum: number, mode: AckMode): AckOutcome {
  7  |   assert.equal(value.scope, scope, "Command acknowledgement scope changed");
  8  |   assert(value.present && value.visible && !value.denied, "Command perspective missing or denied");
  9  |   assert(Number.isSafeInteger(minimum) && minimum >= 0, "Malformed command response version");
  10 |   assert(value.busy === "true" || value.busy === "false", "Malformed command busy state");
  11 |   assert(value.version !== null && /^\d+$/.test(value.version) && Number.isSafeInteger(Number(value.version)), "Malformed rendered command version");
  12 |   assert(["absent", "disabled", "enabled"].includes(value.pending), "Malformed pending state");
> 13 |   if (mode === "fresh") assert.equal(value.pending, "absent", "Unknown pending command blocks a new intent");
     |                                ^ AssertionError: Unknown pending command blocks a new intent
  14 |   if (value.busy === "true") return "waiting";
  15 |   if (value.pending !== "absent") {
  16 |     if (value.pending === "disabled") return "waiting";
  17 |     assert.equal(mode, "matrix", "Strict command was not acknowledged by its sender");
  18 |     return "pending";
  19 |   }
  20 |   return Number(value.version) >= minimum ? "acknowledged" : "waiting";
  21 | }
  22 | 
  23 | export function assertOwnRoundSolve(value: OwnSolveState, alias: string, round: number): void {
  24 |   assert.equal(value.actorAlias, alias, "Submitting browser identity changed");
  25 |   assert.equal(value.rowAlias, alias, "Another player's solve cannot acknowledge this actor");
  26 |   assert.equal(value.round, round, "An old round's solve cannot count in this round");
  27 |   assert.equal(value.solved, true, "The submitting player's current-round solve is not rendered");
  28 | }
  29 | 
  30 | export async function readCommandUi(page: Page, scope: Scope): Promise<UiCommandState> {
  31 |   const panel = page.locator(scope === "game" ? ".game-panel" : ".room-panel");
  32 |   if (await panel.count() !== 1) return { scope, present: false, visible: false, denied: false, busy: null, version: null, pending: "absent" };
  33 |   return panel.evaluate((element, ownScope): UiCommandState => {
  34 |     const buttons = Array.from(element.querySelectorAll("button")).filter((button) => button.textContent?.trim() === `Retry pending ${ownScope} request`);
  35 |     if (buttons.length > 1) throw new Error("Duplicate scoped pending controls");
  36 |     const button = buttons[0];
  37 |     const visible = element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  38 |     const pendingVisible = button && button.getClientRects().length > 0 && getComputedStyle(button).visibility !== "hidden";
  39 |     const text = element.textContent ?? "";
  40 |     return {
  41 |       scope: ownScope, present: true, visible,
  42 |       denied: text.includes("Your game perspective is unavailable.") || text.includes("Your account changed.") || text.includes("Room access is unavailable. Refresh your profile or find a room."),
  43 |       busy: element.getAttribute("aria-busy"),
  44 |       version: element.getAttribute(ownScope === "game" ? "data-match-version" : "data-room-version"),
  45 |       pending: !button ? "absent" : pendingVisible && !button.disabled ? "enabled" : "disabled",
  46 |     };
  47 |   }, scope);
  48 | }
  49 | 
  50 | /** Existing assertion bounds, condition synchronization, no API refresh or sleeps. */
  51 | export async function awaitCommandUi(page: Page, scope: Scope, minimum: number, mode: AckMode, observe?: (state: UiCommandState, outcome: AckOutcome) => void): Promise<"acknowledged" | "pending"> {
  52 |   let outcome: AckOutcome = "waiting";
  53 |   await expect.poll(async () => {
  54 |     const state = await readCommandUi(page, scope);
  55 |     outcome = commandUiState(state, scope, minimum, mode);
  56 |     observe?.(state, outcome);
  57 |     return outcome;
  58 |   }, { message: `The ${scope} sender must acknowledge its command in the rendered UI` }).not.toBe("waiting");
  59 |   return outcome as "acknowledged" | "pending";
  60 | }
  61 | 
  62 | export async function assertPageOwnRoundSolve(page: Page, alias: string, round: number): Promise<void> {
  63 |   const table = page.getByRole("table", { name: `Round ${round} scorecard`, exact: true });
  64 |   const row = table.getByRole("row").filter({ has: page.getByRole("rowheader").filter({ hasText: alias }) });
  65 |   await expect(table).toBeVisible();
  66 |   await expect(row).toHaveCount(1);
  67 |   await expect(row).toContainText("✓ Solved");
  68 |   const header = (await row.getByRole("rowheader").innerText()).trim();
  69 |   const caption = (await table.locator("caption").innerText()).match(/^Round (\d+) scorecard$/);
  70 |   assertOwnRoundSolve({
  71 |     actorAlias: (await page.locator(".profile-alias strong").innerText()).trim(),
  72 |     rowAlias: header.endsWith(alias) ? alias : header,
  73 |     round: caption ? Number(caption[1]) : Number.NaN,
  74 |     solved: (await row.innerText()).includes("✓ Solved"),
  75 |   }, alias, round);
  76 | }
  77 | 
```