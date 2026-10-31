# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-multiplayer.integration.spec.ts >> LIVE real two-player and observer UI: private push, all eight rounds, autonomous deadlines, renewal and reconnect
- Location: tests/browser/live-multiplayer.integration.spec.ts:24:1

# Error details

```
AssertionError: Command perspective missing or denied
```

# Test source

```ts
  1   | import assert from "node:assert/strict";
  2   | import { expect, type Page } from "@playwright/test";
  3   | import type { AckMode, AckOutcome, OwnSolveState, Scope, UiCommandState } from "./ui-command-acknowledgement.contract";
  4   | import type { CapturedCommand } from "./ui-command-capture.contract";
  5   | import type { RetirementObservation, UntilCommandState } from "./ui-command-retirement.contract";
  6   | 
  7   | /** A delivered projection does not establish that the sender retired its command. */
  8   | export function commandUiState(value: UiCommandState, scope: Scope, minimum: number, mode: AckMode): AckOutcome {
  9   |   assert.equal(value.scope, scope, "Command acknowledgement scope changed");
> 10  |   assert(value.present && value.visible && !value.denied, "Command perspective missing or denied");
      |   ^ AssertionError: Command perspective missing or denied
  11  |   assert(Number.isSafeInteger(minimum) && minimum >= 0, "Malformed command response version");
  12  |   assert(value.busy === "true" || value.busy === "false", "Malformed command busy state");
  13  |   assert(value.version !== null && /^\d+$/.test(value.version) && Number.isSafeInteger(Number(value.version)), "Malformed rendered command version");
  14  |   assert(["absent", "disabled", "enabled"].includes(value.pending), "Malformed pending state");
  15  |   if (mode === "fresh") assert.equal(value.pending, "absent", "Unknown pending command blocks a new intent");
  16  |   if (value.busy === "true") return "waiting";
  17  |   if (value.pending !== "absent") {
  18  |     if (mode === "retire" || value.pending === "disabled") return "waiting";
  19  |     assert.equal(mode, "matrix", "Strict command was not acknowledged by its sender");
  20  |     return "pending";
  21  |   }
  22  |   return Number(value.version) >= minimum ? "acknowledged" : "waiting";
  23  | }
  24  | 
  25  | export function assertOwnRoundSolve(value: OwnSolveState, alias: string, round: number): void {
  26  |   assert.equal(value.actorAlias, alias, "Submitting browser identity changed");
  27  |   assert.equal(value.rowAlias, alias, "Another player's solve cannot acknowledge this actor");
  28  |   assert.equal(value.round, round, "An old round's solve cannot count in this round");
  29  |   assert.equal(value.solved, true, "The submitting player's current-round solve is not rendered");
  30  | }
  31  | 
  32  | export async function readCommandUi(page: Page, scope: Scope): Promise<UiCommandState> {
  33  |   const panel = page.locator(scope === "game" ? ".game-panel" : ".room-panel");
  34  |   if (await panel.count() !== 1) return { scope, present: false, visible: false, denied: false, busy: null, version: null, pending: "absent" };
  35  |   return panel.evaluate((element, ownScope): UiCommandState => {
  36  |     const buttons = Array.from(element.querySelectorAll("button")).filter((button) => button.textContent?.trim() === `Retry pending ${ownScope} request`);
  37  |     if (buttons.length > 1) throw new Error("Duplicate scoped pending controls");
  38  |     const button = buttons[0];
  39  |     const visible = element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  40  |     const pendingVisible = button && button.getClientRects().length > 0 && getComputedStyle(button).visibility !== "hidden";
  41  |     const text = element.textContent ?? "";
  42  |     return {
  43  |       scope: ownScope, present: true, visible,
  44  |       denied: text.includes("Your game perspective is unavailable.") || text.includes("Your account changed.") || text.includes("Room access is unavailable. Refresh your profile or find a room."),
  45  |       busy: element.getAttribute("aria-busy"),
  46  |       version: element.getAttribute(ownScope === "game" ? "data-match-version" : "data-room-version"),
  47  |       pending: !button ? "absent" : pendingVisible && !button.disabled ? "enabled" : "disabled",
  48  |     };
  49  |   }, scope);
  50  | }
  51  | 
  52  | /** Own every started probe, including when the assertion deadline wins its race. */
  53  | export async function waitCommandState(read: () => Promise<UiCommandState>, scope: Scope, minimum: number, mode: AckMode, until: UntilCommandState, observe?: (state: UiCommandState, outcome: AckOutcome) => void): Promise<"acknowledged" | "pending"> {
  54  |   let outcome: AckOutcome = "waiting";
  55  |   const probes: Promise<AckOutcome>[] = [];
  56  |   const failures: unknown[] = [];
  57  |   try {
  58  |     await until(() => {
  59  |       const work = (async () => {
  60  |         const state = await read();
  61  |         outcome = commandUiState(state, scope, minimum, mode);
  62  |         observe?.(state, outcome);
  63  |         return outcome;
  64  |       })();
  65  |       probes.push(work);
  66  |       return work;
  67  |     });
  68  |   } catch (error) { failures.push(error); }
  69  |   const settled = await Promise.allSettled(probes);
  70  |   for (const probe of settled) if (probe.status === "rejected" && !failures.includes(probe.reason)) failures.push(probe.reason);
  71  |   if (failures.length > 1) throw new AggregateError(failures);
  72  |   if (failures.length === 1) throw failures[0];
  73  |   assert.notEqual(outcome, "waiting", "Command wait returned before acknowledgement");
  74  |   return outcome as "acknowledged" | "pending";
  75  | }
  76  | 
  77  | /** Known409 retirement never authorizes replay or another intent while pending. */
  78  | export async function retireCapturedCommand(command: CapturedCommand, scope: Scope, minimum: number, read: () => Promise<UiCommandState>, until: UntilCommandState, observe?: (event: RetirementObservation) => void): Promise<void> {
  79  |   assert.equal(command.status(), 409, "Only a captured conflict can enter retirement");
  80  |   const payload: unknown = command.request().postDataJSON();
  81  |   assert(typeof payload === "object" && payload !== null, "Captured conflict payload is missing");
  82  |   const expected = (payload as { expectedVersion?: unknown }).expectedVersion;
  83  |   assert(typeof expected === "number" && Number.isSafeInteger(expected) && expected >= 0 && expected < Number.MAX_SAFE_INTEGER, "Malformed captured conflict version");
  84  |   assert(Number.isSafeInteger(minimum) && minimum >= 0, "Malformed conflict retirement minimum");
  85  |   const freshMinimum = Math.max(minimum, expected + 1);
  86  |   const outcome = await waitCommandState(read, scope, freshMinimum, "retire", until, (state, outcome) => observe?.({ command, state, outcome }));
  87  |   assert.equal(outcome, "acknowledged");
  88  | }
  89  | 
  90  | function untilCommandUi(scope: Scope): UntilCommandState {
  91  |   return (condition) => expect.poll(condition, { message: `The ${scope} sender must acknowledge its command in the rendered UI` }).not.toBe("waiting");
  92  | }
  93  | 
  94  | /** Existing assertion bounds, condition synchronization, no API refresh or sleeps. */
  95  | export async function awaitCommandUi(page: Page, scope: Scope, minimum: number, mode: AckMode, observe?: (state: UiCommandState, outcome: AckOutcome) => void): Promise<"acknowledged" | "pending"> {
  96  |   return waitCommandState(() => readCommandUi(page, scope), scope, minimum, mode, untilCommandUi(scope), observe);
  97  | }
  98  | 
  99  | export async function awaitCommandRetirement(page: Page, scope: Scope, command: CapturedCommand, minimum: number, observe?: (event: RetirementObservation) => void): Promise<void> {
  100 |   return retireCapturedCommand(command, scope, minimum, () => readCommandUi(page, scope), untilCommandUi(scope), observe);
  101 | }
  102 | 
  103 | export async function assertPageOwnRoundSolve(page: Page, alias: string, round: number): Promise<void> {
  104 |   const table = page.getByRole("table", { name: `Round ${round} scorecard`, exact: true });
  105 |   const row = table.getByRole("row").filter({ has: page.getByRole("rowheader").filter({ hasText: alias }) });
  106 |   await expect(table).toBeVisible();
  107 |   await expect(row).toHaveCount(1);
  108 |   await expect(row).toContainText("✓ Solved");
  109 |   const header = (await row.getByRole("rowheader").innerText()).trim();
  110 |   const caption = (await table.locator("caption").innerText()).match(/^Round (\d+) scorecard$/);
```