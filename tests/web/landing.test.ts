// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LandingProjection } from "../../src/application/public-projections";
import { LandingBoard } from "../../src/web/landing-board";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const empty: LandingProjection = {
  leaderboard: [],
  lobbies: [],
  rules: { version: "2.6", updated: "2026-10-26" },
};
describe("AC-43 anonymous landing states", () => {
  it('retains cache bypass when conflict recovery fails, and does not relabel old rows while navigating', async () => {
    vi.useFakeTimers();
    let resolveContinuation!: (response:Response)=>void;
    const response = (revision:number) => new Response(JSON.stringify({...empty,leaderboard:[{alias:'First page player',wins:1,points:0}]}),{headers:{'X-Leaderboard-Revision':String(revision),'X-Lobby-Revision':String(revision),'X-Leaderboard-Next':`1:leaderboard:${revision}:25`}});
    const fetcher = vi.fn().mockResolvedValueOnce(response(1)).mockImplementationOnce(()=>new Promise(resolve=>{resolveContinuation=resolve;})).mockRejectedValueOnce(new Error('Network failed')).mockResolvedValueOnce(response(2));
    vi.stubGlobal('fetch',fetcher);
    await act(async()=>{ render(createElement(LandingBoard,{initialData:empty})); });
    await act(async()=>{ fireEvent.click(screen.getByRole('button',{name:'More rankings'})); });
    expect(screen.getAllByRole('row')[1].textContent).toBe('1First page player10');
    await act(async()=>{ resolveContinuation(new Response('{}',{status:409})); });
    expect(screen.queryByText('The board changed. Showing the latest first page.')).toBeNull();
    await act(async()=>{ await vi.advanceTimersByTimeAsync(15000); });
    expect(new URL(fetcher.mock.calls[3][0],'https://test.invalid').searchParams.get('fresh')).toBe('1');
    expect(screen.getByText('The board changed. Showing the latest first page.')).toBeDefined();
  });
  it("clears loading and exposes retry after a stalled network request, then recovers on the next poll", async () => {
    vi.useFakeTimers();
    const responses: ((value: unknown) => void)[] = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => responses.push(resolve))));
    render(createElement(LandingBoard, { initialData: empty }));
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getAllByText('Try again later')).toHaveLength(2);
    expect(screen.getByRole('button', { name:'Refresh public information' }).hasAttribute('disabled')).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(responses).toHaveLength(2);
    await act(async () => { responses[1]({ ok:true, json:async () => empty }); });
    expect(screen.getByText('No games yet')).toBeDefined();
  });
  it("renders duplicate aliases without retaining removed rows on a refresh", async () => {
    const rows = [{alias:'Twin',wins:1,points:1},{alias:'Twin',wins:2,points:2},{alias:'Other',wins:3,points:3}];
    const fetcher = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({...empty,leaderboard:rows})}).mockResolvedValueOnce({ok:true,json:async()=>({...empty,leaderboard:[rows[2],rows[1]]})});
    vi.stubGlobal('fetch', fetcher);
    render(createElement(LandingBoard,{initialData:empty}));
    await waitFor(()=>expect(screen.getAllByText('Twin')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button',{name:'Refresh public information'}));
    await waitFor(()=>expect(screen.getAllByRole('row')).toHaveLength(3));
    expect(screen.getAllByText('Twin')).toHaveLength(1);
  });
  it("recovers a changed continuation with a cache-bypassing first page and carries the new minimum across polls", async () => {
    vi.useFakeTimers();
    const response = (revision:number, continuation:string|null) => new Response(JSON.stringify({...empty,leaderboard:[{alias:`Revision ${revision}`,wins:revision,points:0}]}), {headers:{'X-Leaderboard-Revision':String(revision),'X-Lobby-Revision':String(revision),...(continuation ? {'X-Leaderboard-Next':continuation} : {})}});
    const fetcher = vi.fn().mockResolvedValueOnce(response(1,'1:leaderboard:1:25')).mockResolvedValueOnce(new Response('{}',{status:409})).mockImplementation(async()=>response(2,null));
    vi.stubGlobal('fetch',fetcher);
    await act(async()=>{ render(createElement(LandingBoard,{initialData:empty})); });
    await act(async()=>{ fireEvent.click(screen.getByRole('button',{name:'More rankings'})); });
    expect(fetcher).toHaveBeenCalledTimes(3);
    const recovery = new URL(fetcher.mock.calls[2][0], 'https://test.invalid');
    expect(recovery.searchParams.get('fresh')).toBe('1');
    expect(recovery.searchParams.has('leaderboardCursor')).toBe(false);
    expect(screen.getByText('Revision 2')).toBeDefined();
    expect(screen.getByRole('button',{name:'Previous rankings'}).hasAttribute('disabled')).toBe(true);
    await act(async()=>{ await vi.advanceTimersByTimeAsync(15000); });
    const poll = new URL(fetcher.mock.calls[3][0], 'https://test.invalid');
    expect(poll.searchParams.get('minLeaderboardRevision')).toBe('2');
  });
  it("does not allow a late older interval response to replace newer public information", async () => {
    vi.useFakeTimers();
    const responses: ((value: unknown)=>void)[] = [];
    vi.stubGlobal("fetch",vi.fn(()=>new Promise(resolve=>responses.push(resolve))));
    render(createElement(LandingBoard,{initialData:empty}));
    await act(async()=>{ await vi.advanceTimersByTimeAsync(15000); });
    expect(responses).toHaveLength(2);
    await act(async()=>{ responses[1]({ok:true,json:async()=>({...empty,leaderboard:[{alias:"Latest player",wins:3,points:20}]})}); });
    expect(screen.getByText("Latest player")).toBeDefined();
    await act(async()=>{ responses[0]({ok:true,json:async()=>({...empty,leaderboard:[{alias:"Old player",wins:1,points:5}]})}); });
    expect(screen.queryByText("Old player")).toBeNull();
    expect(screen.getByText("Latest player")).toBeDefined();
  });
  it("renders rules, ranking and rooms without sign-in and distinguishes a successful empty query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => empty })),
    );
    render(createElement(LandingBoard, { initialData: empty }));
    expect(screen.getByRole("heading", { name: "Leaderboard" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Open lobbies" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "How to play" })).toBeDefined();
    expect(screen.getByText("No games yet")).toBeDefined();
    expect(screen.getByText("No joinable rooms")).toBeDefined();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
  it("shows recoverable unavailable states rather than reporting empty rankings on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    render(createElement(LandingBoard, { initialData: null }));
    await waitFor(() =>
      expect(screen.getAllByText("Try again later")).toHaveLength(2),
    );
    expect(screen.queryByText("No games yet")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Refresh public information" }),
    ).toBeDefined();
  });
});
