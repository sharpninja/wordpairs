// @vitest-environment jsdom
import * as React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GamePanel as actual } from "../../src/web/game-panel";

vi.mock("../../src/web/identity-panel", () => ({ ProfileIcon: () => null }));
vi.mock("../../src/web/social-panel", () => ({ SocialPanel: ({ refreshKey, roundId }: { refreshKey: number; roundId: string | null }) => React.createElement("div", { "data-testid": "social-view", "data-key": refreshKey, "data-round": roundId ?? "none" }) }));
type Props = { roomId: string; profileId: string; refreshKey: number; socialRefreshKey?: number; onFinished: () => Promise<void> };

// These independently scripted adapters exercise the same assertions against
// correct and deliberately incorrect social-refresh contracts.
function fake(wrong: "none" | "key" | "round"): React.ComponentType<Props> {
  return function Fixture(props: Props) {
    const [view, setView] = React.useState<{ status: string; round: { roundId: string } } | null>(null);
    React.useEffect(() => { void fetch("/fixture-match").then((response) => response.json()).then(setView); }, [props.refreshKey]);
    return view ? React.createElement("div", { "data-testid": "social-view", "data-key": wrong === "key" ? props.refreshKey : props.socialRefreshKey, "data-round": wrong === "round" || view.status === "playing" ? view.round.roundId : "none" }) : null;
  };
}
const kind = process.env.WORDPAIRS_GAME_SOCIAL_FIXTURE;
const GamePanel = (kind === "correct" ? fake("none") : kind === "wrong-key" ? fake("key") : kind === "wrong-round" ? fake("round") : actual) as React.ComponentType<Props>;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setup() {
  vi.stubGlobal("React", React); vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  let status = "playing"; let version = 0;
  const fetcher = vi.fn(async () => Response.json({ actorId: "p1", role: "player", serverNow: Date.now(), version: ++version, status, roundNumber: 1, roundsTotal: 8, anchorId: "p1", chooserId: "p1", categories: [], labels: [], scorecard: [], standings: [], round: { roundId: "round-1", prompt: "Hot", stage: 0, stageDueAt: Date.now() + 20000, pointsAvailable: 5, hints: [], revealed: false, canAnswer: false, solved: false, submitted: false } }));
  vi.stubGlobal("fetch", fetcher);
  const props: Props = { roomId: "r1", profileId: "p1", refreshKey: 0, socialRefreshKey: 7, onFinished: async () => {} };
  const rendered = render(React.createElement(GamePanel, props));
  return { rendered, props, fetcher, summary: () => { status = "summary"; } };
}
it("match refreshes do not change the reaction refresh key", async () => {
  const { rendered, props, fetcher } = setup();
  await waitFor(() => expect(rendered.getByTestId("social-view").getAttribute("data-key")).toBe("7"));
  const before = fetcher.mock.calls.length;
  rendered.rerender(React.createElement(GamePanel, { ...props, refreshKey: 1 }));
  await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(before));
  expect(rendered.getByTestId("social-view").getAttribute("data-key")).toBe("7");
});
it("room or moderation refreshes advance the reaction refresh key", async () => {
  const { rendered, props } = setup();
  await waitFor(() => expect(rendered.getByTestId("social-view").getAttribute("data-key")).toBe("7"));
  rendered.rerender(React.createElement(GamePanel, { ...props, socialRefreshKey: 8 }));
  await waitFor(() => expect(rendered.getByTestId("social-view").getAttribute("data-key")).toBe("8"));
});
it("leaving an active round triggers a social refresh for the summary", async () => {
  const { rendered, props, summary } = setup();
  await waitFor(() => expect(rendered.getByTestId("social-view").getAttribute("data-round")).toBe("round-1"));
  summary(); rendered.rerender(React.createElement(GamePanel, { ...props, refreshKey: 1 }));
  await waitFor(() => expect(rendered.getByTestId("social-view").getAttribute("data-round")).toBe("none"));
});
