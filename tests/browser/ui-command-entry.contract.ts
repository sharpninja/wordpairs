import { expect, type Locator, type Page } from "@playwright/test";
import type { Scope, UiCommandState } from "./ui-command-acknowledgement.contract";

export type RejectedProbe = (state: UiCommandState, error: unknown) => void;
export type EntryPhase = (phase: "waiting-action" | "guard-settled") => void;
export interface FailureUi {
  qualification: "post-failure observation before cleanup";
  uiStates: { player: number; closed: boolean; body: string | null; room: UiCommandState | null; game: UiCommandState | null }[];
  diagnosticFailures: { player: number; operation: string }[];
}
export interface EntryBinding {
  entry(page: Page, scope: Scope, control: Locator, rejected?: RejectedProbe, phase?: EntryPhase): Promise<void>;
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
    const fixtures = name === "malformed-projection" ? [
      '<section class="room-panel" aria-busy="false" data-room-version="NaN"></section>',
      '<section class="room-panel" aria-busy="false"></section>',
      '<section class="room-panel" aria-busy="invalid" data-room-version="12"></section>',
    ] : name === "unknown-pending" ? [
      fixturePanel("room", "", '<button disabled>Retry pending room request</button>'),
      fixturePanel("room", "", '<button>Retry pending room request</button>'),
      '<section class="room-panel" aria-busy="true" data-room-version="12"><button disabled>Retry pending room request</button></section>',
      '<section class="room-panel" aria-busy="true" data-room-version="12"><button>Retry pending room request</button></section>',
    ] : [name === "missing-perspective" ? "" : fixturePanel("room", "", "Room access is unavailable. Refresh your profile or find a room.")];
    for (const html of fixtures) {
    await page.setContent(html + join);
    const calls: { state: UiCommandState; error: unknown }[] = [];
    const observerFailure = new Error("original rejected-state observer failure");
    const rejected: RejectedProbe = (state, error) => {
      calls.push({ state: { ...state }, error });
      state.denied = false; // A copy cannot change the already-rejected decision.
      if (name === "rejected-probe-observer-error") throw observerFailure;
    };
    const final = await observed(name.startsWith("rejected-probe")
      ? binding.probe(page, "room", rejected)
      : binding.entry(page, "room", page.getByRole("button", { name: "Join as player", exact: true }), rejected));
    expect(final.ok).toBe(false);
    if (name.startsWith("rejected-probe")) {
      expect(calls).toHaveLength(1); expect(calls[0].state).toEqual({ scope: "room", present: true, visible: true, denied: true, busy: "false", version: "12", pending: "absent" });
      if (!final.ok && name === "rejected-probe-attribution") expect(final.error).toBe(calls[0].error);
      if (!final.ok && name === "rejected-probe-observer-error") { expect(final.error).toBeInstanceOf(AggregateError); expect((final.error as AggregateError).errors).toEqual([calls[0].error, observerFailure]); }
    }
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
  const control = scope === "game" ? page.getByLabel("Your answer", { exact: true }) : page.getByRole("button", { name: "Join as player", exact: true, includeHidden: name === "hidden-action" });
  if (name === "delayed-room-action") await page.setContent("<main>Identity mounting</main>");
  else if (name === "visible-loading-panel") await page.setContent('<section class="room-panel" aria-busy="false">Finding your room…</section>');
  else if (name === "disabled-action") await page.setContent(fixturePanel(scope, "", '<button disabled>Join as player</button>'));
  else if (name === "hidden-action") await page.setContent(fixturePanel(scope, "", '<button style="display:none">Join as player</button>'));
  else await page.setContent(readyHtml);
  let checkpoint!: (phase: "waiting-action" | "guard-settled" | "terminal") => void;
  const phase = new Promise<"waiting-action" | "guard-settled" | "terminal">((resolve) => { checkpoint = resolve; });
  const work = observed(binding.entry(page, scope, control, undefined, checkpoint));
  try {
    if (name !== "game-input-entry") {
      const first = await Promise.race([phase, work.then(() => "terminal" as const)]);
      expect(first, "Actual unmet action inspection must precede any settled fresh guard").toBe("waiting-action");
    }
  } finally {
    // Even when the ordering assertion/release fails, own and drain the entry.
    try { if (name !== "game-input-entry") await page.setContent(readyHtml); }
    finally { await work; }
  }
  expect((await work).ok).toBe(true);
}
