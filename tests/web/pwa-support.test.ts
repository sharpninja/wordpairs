// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

let media: EventTarget & { matches: boolean };
let register: ReturnType<typeof vi.fn>;
const savedWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
beforeEach(() => {
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal("isSecureContext", true);
  register = vi.fn().mockResolvedValue({});
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (savedWorker)
    Object.defineProperty(navigator, "serviceWorker", savedWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
  Reflect.deleteProperty(navigator, "standalone");
});
async function mount() {
  const path = resolve("src/web/pwa-support.tsx");
  const { PwaSupport } = await import(path);
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(React.createElement(PwaSupport));
  });
  return view;
}
function installEvent(outcome: "accepted" | "dismissed", reject = false) {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn(() =>
    reject ? Promise.reject(new Error("browser denied")) : Promise.resolve(),
  );
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
}
it("PWA-03 registers securely at root with fresh updates; errors preserve manual guidance", async () => {
  register.mockRejectedValueOnce(new Error("blocked"));
  await mount();
  expect(register).toHaveBeenCalledWith("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  expect(screen.getByRole("status").textContent).toMatch(/could not start/i);
  expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
});
it("PWA-04 prompts once on a click and hides after actual appinstalled", async () => {
  await mount();
  const { event, prompt } = installEvent("accepted");
  expect(event.defaultPrevented).toBe(true);
  expect(prompt).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Install Wordpairs" }));
  });
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "Install Wordpairs" }),
  ).toBeNull();
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  expect(screen.queryByLabelText("Install Wordpairs")).toBeNull();
});
it.each([false, true])(
  "PWA-04 dismissed/rejected prompt leaves guidance and accepts only a fresh event: %s",
  async (reject) => {
    await mount();
    const first = installEvent("dismissed", reject);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Install Wordpairs" }),
      );
    });
    expect(first.prompt).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Install Wordpairs" }),
    ).toBeNull();
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
    const fresh = installEvent("dismissed");
    expect(fresh.prompt).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Install Wordpairs" }),
    ).toBeTruthy();
  },
);
it("PWA-04 hides in display-mode standalone and responds to mode changes", async () => {
  media.matches = true;
  await mount();
  expect(screen.queryByLabelText("Install Wordpairs")).toBeNull();
  media.matches = false;
  act(() => {
    media.dispatchEvent(new Event("change"));
  });
  expect(screen.getByLabelText("Install Wordpairs")).toBeTruthy();
});
it("PWA-04 recognizes iPhone standalone and removes listeners on unmount", async () => {
  Object.defineProperty(navigator, "standalone", {
    configurable: true,
    value: true,
  });
  const remove = vi.spyOn(window, "removeEventListener");
  const mediaRemove = vi.spyOn(media, "removeEventListener");
  const view = await mount();
  expect(screen.queryByLabelText("Install Wordpairs")).toBeNull();
  view.unmount();
  expect(remove).toHaveBeenCalledWith(
    "beforeinstallprompt",
    expect.any(Function),
  );
  expect(remove).toHaveBeenCalledWith("appinstalled", expect.any(Function));
  expect(mediaRemove).toHaveBeenCalledWith("change", expect.any(Function));
});
it("PWA-05 insecure origins explain HTTPS and do not register a worker", async () => {
  vi.stubGlobal("isSecureContext", false);
  await mount();
  expect(register).not.toHaveBeenCalled();
  expect(screen.getByText(/HTTPS/)).toBeTruthy();
});

it("PWA-05 retains safe areas when installed UI is hidden and panel padding survives the actual cascade", async () => {
  // Emulate the browser's inset values while evaluating the complete real CSS cascade.
  const style = document.createElement("style");
  const insets: Record<string, string> = {
    top: "28px",
    bottom: "20px",
    left: "7px",
    right: "9px",
  };
  style.textContent = readFileSync("src/app/globals.css", "utf8").replace(
    /env\(safe-area-inset-(top|bottom|left|right), 0px\)/g,
    (_, side: string) => insets[side],
  );
  document.head.append(style);
  try {
    media.matches = true;
    await mount();
    expect(screen.queryByLabelText("Install Wordpairs")).toBeNull();
    const body = getComputedStyle(document.body);
    expect([
      body.paddingTop,
      body.paddingBottom,
      body.paddingLeft,
      body.paddingRight,
    ]).toEqual(["28px", "20px", "7px", "9px"]);
    media.matches = false;
    act(() => {
      media.dispatchEvent(new Event("change"));
    });
    const panel = getComputedStyle(screen.getByLabelText("Install Wordpairs"));
    expect([panel.paddingTop, panel.paddingBottom]).toEqual(["24px", "24px"]);
  } finally {
    style.remove();
  }
});
