import assert from "node:assert/strict";
import { expect, type Locator, type Page } from "@playwright/test";
import { awaitCommandUi, readCommandUi } from "./ui-command-acknowledgement";
import type { Scope, UiCommandState } from "./ui-command-acknowledgement.contract";
import type { EntryPhase, FailureUi, RejectedProbe } from "./ui-command-entry.contract";

/** An actual enabled action is the entry precondition, never a substitute for the guard. */
export async function awaitCommandEntry(page: Page, scope: Scope, control: Locator, rejected?: RejectedProbe, phase?: EntryPhase): Promise<void> {
  assert(control.page() === page, "Entry control belongs to a different page");
  if (phase) {
    const visible = await control.isVisible();
    const enabled = await control.count() > 0 && await control.isEnabled();
    if (!visible || !enabled) phase("waiting-action");
  }
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  try { await awaitCommandUi(page, scope, 0, "fresh", undefined, rejected); }
  finally { phase?.("guard-settled"); }
}

/** Capture while owned pages remain open; diagnostic errors never replace the journey failure. */
export async function retainUiFailure(pages: Page[], original: unknown, save: (value: FailureUi) => Promise<void>): Promise<never> {
  const value: FailureUi = { qualification: "post-failure observation before cleanup", uiStates: [], diagnosticFailures: [] };
  for (const [player, page] of pages.entries()) {
    const state: FailureUi["uiStates"][number] = { player, closed: page.isClosed(), body: null, room: null, game: null };
    value.uiStates.push(state);
    if (state.closed) { value.diagnosticFailures.push({ player, operation: "page-unavailable" }); continue; }
    try { state.body = (await page.locator("body").innerText()).replace(/https?:\/\/\S+/g, "[URL omitted]"); }
    catch { value.diagnosticFailures.push({ player, operation: "body-read" }); }
    for (const scope of ["room", "game"] as const) {
      try { state[scope] = await readCommandUi(page, scope) as UiCommandState; }
      catch { value.diagnosticFailures.push({ player, operation: `${scope}-state-read` }); }
    }
  }
  try { await save(value); }
  catch { console.error("Strict UI failure diagnostics could not be saved; original journey failure retained."); }
  throw original;
}
