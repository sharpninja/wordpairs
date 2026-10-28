import { expect, it } from "vitest";
import { buildCatalog } from "../../src/domain/catalog";
import {
  activateCase,
  emptyContent,
  resolveAppeal,
  reviewCase,
  saveCatalogPair,
  suggestCategory,
} from "../../src/domain/content";
import type { Actor, Pair } from "../../src/domain/model";
import { failure, type Result } from "../../src/domain/result";
import seed from "../../src/infrastructure/catalog-seed.json";

const value = <T>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};
const catalog = value(buildCatalog(seed.categories, seed.pairs as Pair[]));
const owner: Actor = { profileId: "owner", roles: ["admin"] };
const player: Actor = { profileId: "player", roles: ["player"] };
it("editorial saves require authority, three clean hints, exact next version and a valid fixed category", () => {
  const original = catalog.pairs[0];
  const pair = { ...original, version: 1 };
  const state = emptyContent();
  expect(
    saveCatalogPair(
      state,
      player,
      pair,
      "Reason",
      1,
      catalog,
      () => "publication",
    ),
  ).toEqual(failure("NOT_AUTHORIZED"));
  for (const change of [
    { hints: ["one", "two"] },
    { hints: ["one", "two", "<script>"] },
    { acceptedAnswers: Array(21).fill("alternative") },
    { prompt: "" },
    { reason: "" },
  ]) {
    expect(
      saveCatalogPair(
        state,
        owner,
        { ...pair, ...change } as Pair,
        "reason" in change ? String(change.reason ?? "") : "Reason",
        1,
        catalog,
        () => "publication",
      ).ok,
    ).toBe(false);
  }
  expect(
    saveCatalogPair(
      state,
      owner,
      { ...pair, version: 0 },
      "Reason",
      1,
      catalog,
      () => "publication",
    ),
  ).toEqual(failure("CONFLICT"));
  const next = value(
    saveCatalogPair(
      state,
      owner,
      pair,
      "Reason",
      1,
      catalog,
      () => "publication",
    ),
  );
  expect(next.version).toBe(1);
  expect(next.cases).toEqual([]);
  expect(next.publications[0].content.pairs).toEqual([pair]);
  expect(state.publications).toEqual([]);
});
it("both editorial saves and community activation reject overflow before changing state", () => {
  const capped = {
    ...catalog,
    pairs: [
      ...catalog.pairs,
      ...Array.from({ length: 4096 - catalog.pairs.length }, (_, n) => ({
        ...catalog.pairs[0],
        id: `limit-${n}`,
      })),
    ],
  };
  expect(
    saveCatalogPair(
      emptyContent(),
      owner,
      { ...catalog.pairs[0], version: 1 },
      "Reason",
      1,
      capped,
      () => "publication",
    ),
  ).toEqual(failure("SERVICE_LIMIT"));
  const proposal = {
    category: "Weather pairs",
    pairs: [
      { prompt: "Rain", target: "Wet" },
      { prompt: "Sun", target: "Warm" },
      { prompt: "Snow", target: "Cold" },
    ],
  };
  let state = value(
    suggestCategory(
      emptyContent(),
      player,
      10,
      proposal,
      1,
      () => "case",
      catalog,
    ),
  );
  state = value(reviewCase(state, "case", owner, "approve", "Complete", 2));
  const category = {
    id: "weather",
    name: proposal.category,
    version: 0,
    approved: true,
    backgroundId: "opposites",
  };
  const content = {
    category,
    pairs: proposal.pairs.map((p, n) => ({
      ...catalog.pairs[0],
      ...p,
      id: `weather-${n}`,
      version: 0,
      categoryId: category.id,
      backgroundId: category.backgroundId,
    })),
  };
  for (const invalid of [
    {
      ...content,
      pairs: content.pairs.map((p, n) =>
        n ? p : { ...p, id: catalog.pairs[0].id, version: 0 },
      ),
    },
    {
      ...content,
      pairs: content.pairs.map((p, n) =>
        n ? p : { ...p, id: catalog.pairs[0].id, version: 1 },
      ),
    },
    {
      ...content,
      pairs: content.pairs.map((p, n) => (n ? p : { ...p, version: 99 })),
    },
  ])
    expect(activateCase(state, "case", owner, invalid, 3, catalog)).toEqual(
      failure("CONFLICT"),
    );
  expect(activateCase(state, "case", owner, content, 3, capped)).toEqual(
    failure("SERVICE_LIMIT"),
  );
  expect(state.publications).toEqual([]);
  expect(state.cases[0].playable).toBe(false);
});
it("administrator inheritance preserves proposer/original-reviewer independence for appeals", () => {
  const proposal = {
    category: "Weather pairs",
    pairs: [
      { prompt: "Rain", target: "Wet" },
      { prompt: "Sun", target: "Warm" },
      { prompt: "Snow", target: "Cold" },
    ],
  };
  let state = value(
    suggestCategory(
      emptyContent(),
      player,
      10,
      proposal,
      1,
      () => "case",
      catalog,
    ),
  );
  state = value(reviewCase(state, "case", owner, "reject", "Needs changes", 2));
  state = {
    ...state,
    cases: state.cases.map((item) => ({
      ...item,
      status: "appealed" as const,
      appealed: true,
    })),
  };
  expect(resolveAppeal(state, "case", owner, "overturn", "Reason", 3)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  expect(
    resolveAppeal(
      state,
      "case",
      { ...player, roles: ["admin"] },
      "overturn",
      "Reason",
      3,
    ),
  ).toEqual(failure("NOT_AUTHORIZED"));
  expect(
    resolveAppeal(
      state,
      "case",
      { profileId: "independent", roles: ["admin"] },
      "overturn",
      "Reason",
      3,
    ).ok,
  ).toBe(true);
});
