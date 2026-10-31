// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { IdentityPanel } from "../../src/web/identity-panel";
vi.mock("../../src/web/guest-credential", () => ({ guestCredential: async () => "g".repeat(43) }));
vi.mock("../../src/web/pwa-support", () => ({ PwaSupport: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const profile = { id: "identity-nav", version: 0, kind: "guest", alias: "Guest Navigation", icon: "owl", publicLeaderboard: false, wins: 0, points: 0, earliestWinAt: null };
for (const method of ["POST", "DELETE"] as const) {
  it(`focus during delayed ${method} cannot overtake the session mutation`, async () => {
    vi.stubGlobal("React", React);
    const administration = method === "DELETE";
    const current = { ...profile, kind: administration ? "member" : "guest" };
    let signedIn = administration;
    let reads = 0;
    let finish!: () => void;
    const fetcher = vi.fn(async (url: string, input?: RequestInit) => {
      expect(url).toBe(administration ? "/api/admin/session" : "/api/session");
      if (input?.method === method) return new Promise<Response>(resolve => {
        finish = () => { signedIn = method === "POST"; resolve(method === "POST" ? Response.json({ profile: current }) : new Response(null, { status: 204 })); };
      });
      reads++;
      return signedIn ? Response.json({ profile: current, permissions: ["moderate", "manage-content"] }) : new Response(null, { status: 401 });
    });
    vi.stubGlobal("fetch", fetcher);
    render(React.createElement(IdentityPanel, { oidcEnabled: false, administration }));
    const button = await screen.findByRole("button", { name: method === "POST" ? "Continue as guest" : "Sign out" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    const before = reads;
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(reads).toBe(before);
    expect(screen.queryByRole("navigation", { name: "Administration" })).toBeNull();
    await act(async () => { finish(); });
    if (method === "POST") {
      await screen.findByText(profile.alias, { exact: true });
      expect(reads).toBe(before + 1);
    } else {
      await screen.findByRole("button", { name: "Sign in with GitHub" });
      expect(screen.queryByText(profile.alias, { exact: true })).toBeNull();
    }
    expect(screen.queryByRole("navigation", { name: "Administration" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Users and access" })).toBeNull();
  });
}
it("only the admin page offers the configured GitHub login route", async () => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
  const view = render(React.createElement(IdentityPanel, { oidcEnabled: true, administration: true }));
  expect(screen.getByRole("link", { name: "Sign in with GitHub" }).getAttribute("href")).toBe("/api/auth/github/login");
  expect(screen.queryByRole("button", { name: "Continue as guest" })).toBeNull();
  view.unmount();
  render(React.createElement(IdentityPanel, { oidcEnabled: true }));
  await screen.findByRole("button", { name: "Continue as guest" });
  expect(screen.queryByRole("link", { name: /GitHub|ChatGPT/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /GitHub|ChatGPT/ })).toBeNull();
  await act(async () => {});
});
