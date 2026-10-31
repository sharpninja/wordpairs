// @vitest-environment jsdom
import * as React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SocialPanel as actual } from "../../src/web/social-panel";
type Props = React.ComponentProps<typeof actual>;

function fake(ignoreRound: boolean): React.ComponentType<Props> {
  return function Fixture(props: Props) {
    const [emoji, setEmoji] = React.useState("");
    React.useEffect(() => { void fetch("/fixture-reactions").then((response) => response.json()).then((value) => setEmoji(value.reactions[0]?.emoji ?? "")); }, [ignoreRound ? null : props.roundId]);
    return React.createElement("div", null, emoji);
  };
}
const kind = process.env.WORDPAIRS_SOCIAL_TRANSITION_FIXTURE;
const SocialPanel = kind === "correct" ? fake(false) : kind === "wrong" ? fake(true) : actual;
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("a round ending refreshes and clears the observer reaction view", async () => {
  vi.stubGlobal("React", React); vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ actorId: "observer", version: 1, serverNow: 1000, reactions: [{ id: "r1", actorId: "p1", emoji: "👍", sentAt: 1000, expiresAt: 6000 }] })).mockResolvedValue(Response.json({ actorId: "observer", version: 2, serverNow: 1000, reactions: [] }));
  vi.stubGlobal("fetch", fetcher);
  const props: Props = { roomId: "r1", profileId: "observer", canReact: false, roundId: "round-1", canNominate: false, now: 1000, refreshKey: 0, labels: [{ id: "p1", alias: "Player" }] };
  const rendered = render(React.createElement(SocialPanel, props));
  await waitFor(() => expect(rendered.container.textContent).toContain("👍"));
  rendered.rerender(React.createElement(SocialPanel, { ...props, roundId: null }));
  await waitFor(() => expect(rendered.container.textContent).not.toContain("👍"));
  expect(fetcher).toHaveBeenCalledTimes(2);
});
