import { expect, it } from "vitest";
import { buildCatalog } from "../../src/domain/catalog";
import * as content from "../../src/domain/content";
import type { Actor } from "../../src/domain/model";
import type { Result } from "../../src/domain/result";
import seed from "../../src/infrastructure/catalog-seed.json";

const value = <T>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};
const catalog = value(buildCatalog(seed.categories, seed.pairs as never));
const alice: Actor = { profileId: "alice", roles: ["player"] };
const bob: Actor = { profileId: "bob", roles: ["moderator"] };
const proposal = {
  category: "Space",
  pairs: [
    { prompt: "Earth", target: "Moon" },
    { prompt: "Sun", target: "Star" },
    { prompt: "Mars", target: "Planet" },
  ],
};
type Workflow = {
  changeReviewState: (
    state: content.ContentState,
    id: string,
    actor: Actor,
    action: "request-changes" | "hold" | "resume",
    reason: string,
    now: number,
  ) => Result<content.ContentState>;
  resubmitSuggestion: (
    state: content.ContentState,
    id: string,
    actor: Actor,
    proposal: content.Proposal,
    now: number,
    availableCatalog: typeof catalog,
  ) => Result<content.ContentState>;
};
const workflow = content as unknown as Workflow;
const suggestion = () =>
  value(
    content.suggestCategory(
      content.emptyContent(),
      alice,
      10,
      proposal,
      1,
      () => "suggestion",
      catalog,
    ),
  );
it("UI-CHANGES: independent reasoned change requests retain one-open slot, proposer-only resubmission and unused appeal", () => {
  expect(typeof workflow.changeReviewState).toBe("function");
  let state = suggestion();
  const original = structuredClone(state);
  expect(
    workflow.changeReviewState(
      state,
      "suggestion",
      alice,
      "request-changes",
      "Fix hints",
      2,
    ).ok,
  ).toBe(false);
  expect(
    workflow.changeReviewState(
      state,
      "suggestion",
      bob,
      "request-changes",
      " ",
      2,
    ).ok,
  ).toBe(false);
  expect(state).toEqual(original);
  state = value(
    workflow.changeReviewState(
      state,
      "suggestion",
      bob,
      "request-changes",
      "Clarify pairs",
      2,
    ),
  );
  expect(state.cases[0]).toMatchObject({
    status: "changes_requested",
    playable: false,
    appealed: false,
    version: 1,
  });
  expect(
    content.suggestCategory(
      state,
      alice,
      10,
      { ...proposal, category: "Ocean" },
      3,
      () => "other",
      catalog,
    ).ok,
  ).toBe(false);
  const before = structuredClone(state);
  expect(
    workflow.resubmitSuggestion(state, "suggestion", bob, proposal, 3, catalog)
      .ok,
  ).toBe(false);
  expect(
    workflow.resubmitSuggestion(
      state,
      "suggestion",
      { ...alice, profileId: "mallory" },
      proposal,
      3,
      catalog,
    ).ok,
  ).toBe(false);
  expect(
    workflow.resubmitSuggestion(
      state,
      "suggestion",
      alice,
      { ...proposal, pairs: proposal.pairs.slice(0, 2) },
      3,
      catalog,
    ).ok,
  ).toBe(false);
  expect(state).toEqual(before);
  state = value(
    workflow.resubmitSuggestion(
      state,
      "suggestion",
      alice,
      { ...proposal, category: "Space revised" },
      3,
      catalog,
    ),
  );
  expect(state.cases[0]).toMatchObject({
    status: "pending_review",
    version: 2,
    appealed: false,
    proposal: { category: "Space revised" },
  });
  expect(content.contentProjection(state, bob).cases[0].canReview).toBe(true);
  expect(content.futureEligible(state.cases[0])).toBe(false);
  state = value(
    content.reviewCase(state, "suggestion", bob, "reject", "Review again", 4),
  );
  expect(content.appealCase(state, "suggestion", alice, "Appeal", 5).ok).toBe(
    true,
  );
});
it("UI-HOLD: moderator-only nomination hold/resume preserves counts and prohibits approval/publication while held", () => {
  expect(typeof workflow.changeReviewState).toBe("function");
  let state = suggestion();
  state = {
    ...state,
    cases: [
      {
        ...state.cases[0],
        id: "candidate",
        kind: "nomination",
        normalizedWord: "moon",
        nominatorIds: Array.from({ length: 10 }, (_, i) => `p${i}`),
      },
    ],
  };
  expect(
    workflow.changeReviewState(state, "candidate", alice, "hold", "Wait", 2).ok,
  ).toBe(false);
  expect(
    workflow.changeReviewState(state, "candidate", bob, "hold", "", 2).ok,
  ).toBe(false);
  state = value(
    workflow.changeReviewState(
      state,
      "candidate",
      bob,
      "hold",
      "Check wording",
      2,
    ),
  );
  expect(state.cases[0]).toMatchObject({ status: "on_hold", playable: false });
  expect(state.cases[0].nominatorIds).toHaveLength(10);
  expect(
    content.reviewCase(state, "candidate", bob, "approve", "Approve", 3).ok,
  ).toBe(false);
  expect(content.futureEligible(state.cases[0])).toBe(false);
  expect(
    workflow.changeReviewState(
      state,
      "candidate",
      bob,
      "request-changes",
      "Wrong kind",
      3,
    ).ok,
  ).toBe(false);
  expect(
    workflow.changeReviewState(
      { ...state, cases: [{ ...state.cases[0], nominatorIds: ["p1"] }] },
      "candidate",
      bob,
      "resume",
      "Resume",
      3,
    ).ok,
  ).toBe(false);
  state = value(
    workflow.changeReviewState(
      state,
      "candidate",
      bob,
      "resume",
      "Continue review",
      3,
    ),
  );
  expect(state.cases[0]).toMatchObject({
    status: "pending_review",
    reason: "Continue review",
    version: 2,
  });
  expect(state.cases[0].nominatorIds).toHaveLength(10);
  expect(state.publications).toEqual([]);
});
