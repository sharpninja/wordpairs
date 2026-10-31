import { expect, type Locator, type Page } from "@playwright/test";
import type { Scope, UiCommandState } from "./ui-command-acknowledgement.contract";

export type RejectedProbe = (state: UiCommandState, error: unknown) => void;
export interface FailureUi {
  qualification: "post-failure observation before cleanup";
  uiStates: { player: number; closed: boolean; body: string | null; room: UiCommandState | null; game: UiCommandState | null }[];
  diagnosticFailures: { player: number; operation: string }[];
}
export interface EntryBinding {
  entry(page: Page, scope: Scope, control: Locator): Promise<void>;
  probe(page: Page, scope: Scope, rejected?: RejectedProbe): Promise<void>;
  failure(pages: Page[], original: unknown, save: (value: FailureUi) => Promise<void>): Promise<never>;
}
export const entryCases = ["delayed-room-action", "visible-loading-panel", "disabled-action", "hidden-action", "same-page-control", "game-input-entry", "missing-perspective", "denied-perspective", "malformed-projection", "unknown-pending", "rejected-probe-attribution", "rejected-probe-observer-error", "failure-before-cleanup", "diagnostic-failure-truthful"] as const;
export type EntryCase = typeof entryCases[number];
export const fixturePanel = (scope: Scope, attributes = "", content = "") => `<section class="${scope}-panel" aria-busy="false" data-${scope === "game" ? "match" : "room"}-version="12" ${attributes}>${content}</section>`;
const join = '<button type="button">Join as player</button>';
function observed<T>(work: Promise<T>) { return work.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error: error as unknown })); }

/** SAME oracle: actual Playwright DOM, controlled release, no application routes. */
export async function assertEntryCase(name: EntryCase, binding: EntryBinding, page: Page): Promise<void> {
  if (name === "failure-before-cleanup" || name === "diagnostic-failure-truthful") {
    await page.setContent(fixturePanel("room", "", "Retained before cleanup"));
    const original = new Error("original journey failure");
    if (name === "diagnostic-failure-truthful") await page.close();
    let saved: FailureUi | undefined;
    let savedWhileOpen = false;
    const final = await observed(binding.failure([page], original, async value => { savedWhileOpen = !page.isClosed(); saved = value; }));
    expect(final.ok).toBe(false); if (!final.ok) expect(final.error).toBe(original);
    expect(saved).toBeDefined();
    expect(saved!.qualification).toBe("post-failure observation before cleanup");
    if (name === "failure-before-cleanup") {
      expect(savedWhileOpen).toBe(true); expect(saved!.uiStates[0].body).toContain("Retained before cleanup");
      expect(saved!.uiStates[0].room?.version).toBe("12"); expect(saved!.diagnosticFailures).toEqual([]);
      await page.close();
    } else { expect(saved!.uiStates[0].closed).toBe(true); expect(saved!.diagnosticFailures).toEqual([{ player: 0, operation: "page-unavailable" }]); }
    return;
  }
  if (["missing-perspective", "denied-perspective", "malformed-projection", "unknown-pending", "rejected-probe-attribution", "rejected-probe-observer-error"].includes(name)) {
    let html = fixturePanel("room");
    if (name === "missing-perspective") html = join;
    if (name === "denied-perspective" || name.startsWith("rejected-probe")) html = fixturePanel("room", "", "Room access is unavailable. Refresh your profile or find a room.");
    if (name === "malformed-projection") html = '<section class="room-panel" aria-busy="false" data-room-version="NaN"></section>';
    if (name === "unknown-pending") html = fixturePanel("room", "", '<button disabled>Retry pending room request</button>');
    await page.setContent(html);
    const calls: { state: UiCommandState; error: unknown }[] = [];
    const observerFailure = new Error("original rejected-state observer failure");
    const final = await observed(binding.probe(page, "room", (state, error) => {
      calls.push({ state: { ...state }, error });
      state.denied = false; // A copy cannot change the already-rejected decision.
      if (name === "rejected-probe-observer-error") throw observerFailure;
    }));
    expect(final.ok).toBe(false);
    if (name.startsWith("rejected-probe")) {
      expect(calls).toHaveLength(1); expect(calls[0].state).toEqual({ scope: "room", present: true, visible: true, denied: true, busy: "false", version: "12", pending: "absent" });
      if (!final.ok && name === "rejected-probe-attribution") expect(final.error).toBe(calls[0].error);
      if (!final.ok && name === "rejected-probe-observer-error") { expect(final.error).toBeInstanceOf(AggregateError); expect((final.error as AggregateError).errors).toEqual([calls[0].error, observerFailure]); }
    }
    return;
  }
  if (name === "same-page-control") {
    await page.setContent(fixturePanel("room", "", join));
    const other = await page.context().newPage();
    try { await other.setContent(join); expect((await observed(binding.entry(page, "room", other.getByRole("button", { name: "Join as player", exact: true })))).ok).toBe(false); }
    finally { await other.close(); }
    return;
  }
  const scope: Scope = name === "game-input-entry" ? "game" : "room";
  const readyHtml = fixturePanel(scope, "", scope === "game" ? '<label>Your answer<input aria-label="Your answer"></label>' : join);
  const control = scope === "game" ? page.getByLabel("Your answer", { exact: true }) : page.getByRole("button", { name: "Join as player", exact: true });
  if (name === "delayed-room-action") await page.setContent("<main>Identity mounting</main>");
  else if (name === "visible-loading-panel") await page.setContent('<section class="room-panel" aria-busy="false">Finding your room…</section>');
  else if (name === "disabled-action") await page.setContent(fixturePanel(scope, "", '<button disabled>Join as player</button>'));
  else if (name === "hidden-action") await page.setContent(fixturePanel(scope, "", '<button style="display:none">Join as player</button>'));
  else await page.setContent(readyHtml);
  let settled = false;
  const work = observed(binding.entry(page, scope, control)).then(value => { settled = true; return value; });
  // A browser round trip gives the started operation an event turn; release is
  // explicit DOM mutation, never a wall-clock sleep or an application API poll.
  await page.evaluate(() => document.documentElement.dataset.fixtureCheckpoint = "observed");
  const early = settled;
  if (name !== "game-input-entry") await page.setContent(readyHtml);
  const final = await work;
  if (name !== "game-input-entry") expect(early).toBe(false);
  expect(final.ok).toBe(true);
}
