import assert from "node:assert/strict";
import { expect, type Page } from "@playwright/test";
import type { AckMode, AckOutcome, OwnSolveState, Scope, UiCommandState } from "./ui-command-acknowledgement.contract";
import type { CapturedCommand } from "./ui-command-capture.contract";
import type { RetirementObservation, UntilCommandState } from "./ui-command-retirement.contract";

/** A delivered projection does not establish that the sender retired its command. */
export function commandUiState(value: UiCommandState, scope: Scope, minimum: number, mode: AckMode): AckOutcome {
  assert.equal(value.scope, scope, "Command acknowledgement scope changed");
  assert(value.present && value.visible && !value.denied, "Command perspective missing or denied");
  assert(Number.isSafeInteger(minimum) && minimum >= 0, "Malformed command response version");
  assert(value.busy === "true" || value.busy === "false", "Malformed command busy state");
  assert(value.version !== null && /^\d+$/.test(value.version) && Number.isSafeInteger(Number(value.version)), "Malformed rendered command version");
  assert(["absent", "disabled", "enabled"].includes(value.pending), "Malformed pending state");
  if (mode === "fresh") assert.equal(value.pending, "absent", "Unknown pending command blocks a new intent");
  if (value.busy === "true") return "waiting";
  if (value.pending !== "absent") {
    if (mode === "retire" || value.pending === "disabled") return "waiting";
    assert.equal(mode, "matrix", "Strict command was not acknowledged by its sender");
    return "pending";
  }
  return Number(value.version) >= minimum ? "acknowledged" : "waiting";
}

export function assertOwnRoundSolve(value: OwnSolveState, alias: string, round: number): void {
  assert.equal(value.actorAlias, alias, "Submitting browser identity changed");
  assert.equal(value.rowAlias, alias, "Another player's solve cannot acknowledge this actor");
  assert.equal(value.round, round, "An old round's solve cannot count in this round");
  assert.equal(value.solved, true, "The submitting player's current-round solve is not rendered");
}

export async function readCommandUi(page: Page, scope: Scope): Promise<UiCommandState> {
  const panel = page.locator(scope === "game" ? ".game-panel" : ".room-panel");
  if (await panel.count() !== 1) return { scope, present: false, visible: false, denied: false, busy: null, version: null, pending: "absent" };
  return panel.evaluate((element, ownScope): UiCommandState => {
    const buttons = Array.from(element.querySelectorAll("button")).filter((button) => button.textContent?.trim() === `Retry pending ${ownScope} request`);
    if (buttons.length > 1) throw new Error("Duplicate scoped pending controls");
    const button = buttons[0];
    const visible = element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
    const pendingVisible = button && button.getClientRects().length > 0 && getComputedStyle(button).visibility !== "hidden";
    const text = element.textContent ?? "";
    return {
      scope: ownScope, present: true, visible,
      denied: text.includes("Your game perspective is unavailable.") || text.includes("Your account changed.") || text.includes("Room access is unavailable. Refresh your profile or find a room."),
      busy: element.getAttribute("aria-busy"),
      version: element.getAttribute(ownScope === "game" ? "data-match-version" : "data-room-version"),
      pending: !button ? "absent" : pendingVisible && !button.disabled ? "enabled" : "disabled",
    };
  }, scope);
}

/** Own every started probe, including when the assertion deadline wins its race. */
export async function waitCommandState(read: () => Promise<UiCommandState>, scope: Scope, minimum: number, mode: AckMode, until: UntilCommandState, observe?: (state: UiCommandState, outcome: AckOutcome) => void): Promise<"acknowledged" | "pending"> {
  let outcome: AckOutcome = "waiting";
  const probes: Promise<AckOutcome>[] = [];
  const failures: unknown[] = [];
  try {
    await until(() => {
      const work = (async () => {
        const state = await read();
        outcome = commandUiState(state, scope, minimum, mode);
        observe?.(state, outcome);
        return outcome;
      })();
      probes.push(work);
      return work;
    });
  } catch (error) { failures.push(error); }
  const settled = await Promise.allSettled(probes);
  for (const probe of settled) if (probe.status === "rejected" && !failures.includes(probe.reason)) failures.push(probe.reason);
  if (failures.length > 1) throw new AggregateError(failures);
  if (failures.length === 1) throw failures[0];
  assert.notEqual(outcome, "waiting", "Command wait returned before acknowledgement");
  return outcome as "acknowledged" | "pending";
}

/** Known409 retirement never authorizes replay or another intent while pending. */
export async function retireCapturedCommand(command: CapturedCommand, scope: Scope, minimum: number, read: () => Promise<UiCommandState>, until: UntilCommandState, observe?: (event: RetirementObservation) => void): Promise<void> {
  assert.equal(command.status(), 409, "Only a captured conflict can enter retirement");
  const payload: unknown = command.request().postDataJSON();
  assert(typeof payload === "object" && payload !== null, "Captured conflict payload is missing");
  const expected = (payload as { expectedVersion?: unknown }).expectedVersion;
  assert(typeof expected === "number" && Number.isSafeInteger(expected) && expected >= 0 && expected < Number.MAX_SAFE_INTEGER, "Malformed captured conflict version");
  assert(Number.isSafeInteger(minimum) && minimum >= 0, "Malformed conflict retirement minimum");
  const freshMinimum = Math.max(minimum, expected + 1);
  const outcome = await waitCommandState(read, scope, freshMinimum, "retire", until, (state, outcome) => observe?.({ command, state, outcome }));
  assert.equal(outcome, "acknowledged");
}

function untilCommandUi(scope: Scope): UntilCommandState {
  return (condition) => expect.poll(condition, { message: `The ${scope} sender must acknowledge its command in the rendered UI` }).not.toBe("waiting");
}

/** Existing assertion bounds, condition synchronization, no API refresh or sleeps. */
export async function awaitCommandUi(page: Page, scope: Scope, minimum: number, mode: AckMode, observe?: (state: UiCommandState, outcome: AckOutcome) => void): Promise<"acknowledged" | "pending"> {
  return waitCommandState(() => readCommandUi(page, scope), scope, minimum, mode, untilCommandUi(scope), observe);
}

export async function awaitCommandRetirement(page: Page, scope: Scope, command: CapturedCommand, minimum: number, observe?: (event: RetirementObservation) => void): Promise<void> {
  return retireCapturedCommand(command, scope, minimum, () => readCommandUi(page, scope), untilCommandUi(scope), observe);
}

export async function assertPageOwnRoundSolve(page: Page, alias: string, round: number): Promise<void> {
  const table = page.getByRole("table", { name: `Round ${round} scorecard`, exact: true });
  const row = table.getByRole("row").filter({ has: page.getByRole("rowheader").filter({ hasText: alias }) });
  await expect(table).toBeVisible();
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("✓ Solved");
  const header = (await row.getByRole("rowheader").innerText()).trim();
  const caption = (await table.locator("caption").innerText()).match(/^Round (\d+) scorecard$/);
  assertOwnRoundSolve({
    actorAlias: (await page.locator(".profile-alias strong").innerText()).trim(),
    rowAlias: header.endsWith(alias) ? alias : header,
    round: caption ? Number(caption[1]) : Number.NaN,
    solved: (await row.innerText()).includes("✓ Solved"),
  }, alias, round);
}
