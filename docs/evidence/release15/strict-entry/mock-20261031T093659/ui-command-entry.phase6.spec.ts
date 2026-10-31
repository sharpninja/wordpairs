import assert from "node:assert/strict";
import { expect, test, type Page } from "@playwright/test";
import { commandUiState, readCommandUi } from "./ui-command-acknowledgement";
import type { Scope, UiCommandState } from "./ui-command-acknowledgement.contract";
import { assertEntryCase, entryCases, type EntryBinding, type EntryCase, type FailureUi, type RejectedProbe } from "./ui-command-entry.contract";

function independent(wrong?: EntryCase): EntryBinding {
  const probe = async (page: Page, scope: Scope, rejected?: RejectedProbe) => {
    if (wrong && ["missing-perspective", "denied-perspective", "malformed-projection", "unknown-pending"].includes(wrong)) return;
    const state = await readCommandUi(page, scope);
    try { assert.equal(commandUiState(state, scope, 0, "fresh"), "acknowledged"); }
    catch (error) {
      if (wrong === "rejected-probe-attribution") throw error;
      try { rejected?.({ ...state }, error); }
      catch (observerError) { if (wrong === "rejected-probe-observer-error") throw observerError; throw new AggregateError([error, observerError]); }
      throw error;
    }
  };
  return {
    entry: async (page, scope, control, rejected, phase) => {
      if (wrong === "same-page-control") return;
      assert(control.page() === page, "Entry control belongs to a different page");
      const probeFirst = wrong === "delayed-room-action" || wrong === "visible-loading-panel";
      if (!probeFirst) {
        const visible = await control.isVisible();
        const enabled = await control.count() > 0 && await control.isEnabled();
        const blocked = wrong === "disabled-action" ? !visible : wrong === "hidden-action" ? !enabled : !visible || !enabled;
        if (blocked) phase?.("waiting-action");
        if (wrong !== "hidden-action") await expect(control).toBeVisible();
        if (wrong !== "disabled-action") await expect(control).toBeEnabled();
      }
      try { await probe(page, wrong === "game-input-entry" ? "room" : scope, rejected); }
      finally { phase?.("guard-settled"); }
    },
    probe,
    failure: async (pages, original, save) => {
      if (wrong === "failure-before-cleanup") await pages[0].close();
      const value: FailureUi = { qualification: "post-failure observation before cleanup", uiStates: [], diagnosticFailures: [] };
      for (const [player, page] of pages.entries()) {
        if (page.isClosed()) {
          value.uiStates.push({ player, closed: true, body: null, room: null, game: null });
          if (wrong !== "diagnostic-failure-truthful") value.diagnosticFailures.push({ player, operation: "page-unavailable" });
        } else value.uiStates.push({ player, closed: false, body: await page.locator("body").innerText(), room: await readCommandUi(page, "room"), game: await readCommandUi(page, "game") });
      }
      await save(value); throw original;
    },
  };
}

async function actual(): Promise<EntryBinding> {
  // Deferred import keeps the independent mock gate executable before the new
  // entry helper exists. The same oracle is then bound to the actual helpers.
  const entryPath = "./ui-command-entry";
  const actualEntry = await import(entryPath);
  const ackPath = "./ui-command-acknowledgement";
  const actualAck = await import(ackPath);
  return {
    entry: actualEntry.awaitCommandEntry,
    probe: async (page, scope, rejected) => actualAck.waitCommandState(() => readCommandUi(page, scope), scope, 0, "fresh", async (condition: () => Promise<unknown>) => { await condition(); }, undefined, rejected),
    failure: actualEntry.retainUiFailure,
  };
}

for (const name of entryCases) {
  test(`UI entry correct ${name}`, async ({ page }) => {
    const binding = process.env.WORDPAIRS_UI_ENTRY_BINDING === "mock" ? independent() : await actual();
    await assertEntryCase(name, binding, page);
  });
  test(`UI entry rejects wrong ${name}`, async ({ page }) => {
    await expect(assertEntryCase(name, independent(name), page)).rejects.toThrow();
  });
}
