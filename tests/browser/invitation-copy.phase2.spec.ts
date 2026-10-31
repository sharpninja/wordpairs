import { expect, type Page, test } from "@playwright/test";

const roomId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const invitation = "https://wordpairs.example.test/rooms/ABCDEFGH?invite=synthetic";
const copiedMessage = "Invitation link copied.";
const manualMessage = "Could not copy automatically. Select the link to copy it.";
const player = {
  id: "p1", version: 0, kind: "guest", alias: "Guest Cedar", icon: "owl",
  publicLeaderboard: false, wins: 0, points: 0, earliestWinAt: null,
};
const room = {
  roomId, version: 1, capacity: 2, status: "waiting", discoverable: false,
  availableSlots: 1, code: "ABCDEFGH", role: "player", actorId: "p1",
  inviterId: null, followedPlayerId: null,
  players: [{ id: "p1", alias: "Guest Cedar", icon: "owl", position: 1, ready: false, connected: true }],
  observers: [], observerCount: 0, canJoinPlayer: false, canObserve: false,
};

async function installClipboard(page: Page, denied: boolean, textOnly = false) {
  await page.addInitScript(({ denied, textOnly }) => {
    const state = window as unknown as { copiedInvitation: string | null };
    state.copiedInvitation = null;
    if (textOnly) Object.defineProperty(window, "ClipboardItem", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async write(items: ClipboardItem[]) {
          if (denied) throw new DOMException("Denied", "NotAllowedError");
          state.copiedInvitation = await (await items[0].getType("text/plain")).text();
        },
        async writeText(text: string) {
          if (denied) throw new DOMException("Denied", "NotAllowedError");
          state.copiedInvitation = text;
        },
      },
    });
  }, { denied, textOnly });
}

async function installRoom(page: Page, invitationFails = false, missingUrl = false) {
  const invitations: unknown[] = [];
  await page.route("**/api/session", (route) => route.fulfill({ json: { profile: player } }));
  await page.route("**/api/realtime", (route) => route.fulfill({ status: 503, json: { error: { code: "TEMPORARY_UNAVAILABLE" } } }));
  await page.route("**/api/rooms/**", (route) => {
    if (route.request().method() === "POST") {
      invitations.push(route.request().postDataJSON());
      if (invitationFails) return route.fulfill({ status: 503, json: { error: { code: "TEMPORARY_UNAVAILABLE" } } });
      if (missingUrl) return route.fulfill({ json: {} });
      return route.fulfill({ json: { url: invitation } });
    }
    return route.fulfill({ json: room });
  });
  if (process.env.WORDPAIRS_INVITE_MOCK_GATE === "1") {
    const mutant = process.env.WORDPAIRS_INVITE_MUTANT ?? "";
    await page.route("**/rooms/**", (route) => route.request().isNavigationRequest() ? route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><button>Copy Invitation Link</button><div id="result"></div><p role="status"></p><div role="alert"></div><script>
        const mutant = ${JSON.stringify(mutant)};
        const button = document.querySelector('button');
        const status = document.querySelector('[role="status"]');
        const error = document.querySelector('[role="alert"]');
        button.onclick = async () => {
          button.disabled = true; status.textContent = ''; error.textContent = '';
          let provide, rejectData, copy;
          if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
            const data = new Promise((resolve, reject) => { provide = resolve; rejectData = reject; });
            data.catch(() => {});
            try { copy = navigator.clipboard.write([new ClipboardItem({'text/plain': data})]).then(() => true, () => false); } catch { rejectData(); }
          }
          try {
            const payload = mutant === 'bad-request' ? {action:'invite'} : {action:'invite',expectedProfileId:'p1'};
            const response = await fetch('/api/rooms/${roomId}', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            if (!response.ok) {
              if (mutant === 'false-success') status.textContent = ${JSON.stringify(copiedMessage)};
              throw new Error('unavailable');
            }
            const result = await response.json();
            if ((typeof result.url !== 'string' || !result.url) && mutant !== 'missing-url-success') throw new Error('missing invitation');
            document.querySelector('#result').innerHTML = '<label>Shareable invitation link<input readonly></label>';
            document.querySelector('input').value = result.url;
            const copiedValue = mutant === 'bad-clipboard' ? 'https://wrong.example.test/' : result.url;
            if (provide) provide(new Blob([copiedValue], {type:'text/plain'}));
            let copied = copy ? await copy : false;
            if (!copy && navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(copiedValue); copied = true; } catch {} }
            status.textContent = copied || mutant === 'unavailable-success' ? ${JSON.stringify(copiedMessage)} : ${JSON.stringify(manualMessage)};
          } catch (failure) { error.textContent = failure.message === 'missing invitation' ? 'Room access is unavailable. Retry the same request.' : 'Your request was not confirmed. Retry the same request.'; }
          finally { if (rejectData) rejectData(new Error('no invitation')); button.disabled = false; }
        };
      </script></body></html>`,
    }) : route.fallback());
  }
  await page.goto(`/rooms/${roomId}`);
  return invitations;
}

async function observeCopied(page: Page) {
  await page.getByRole("button", { name: "Copy Invitation Link", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: copiedMessage })).toBeVisible();
  return {
    displayed: await page.getByLabel("Shareable invitation link").inputValue(),
    copied: await page.evaluate(() => (window as unknown as { copiedInvitation: string | null }).copiedInvitation),
  };
}

async function observeManual(page: Page) {
  await page.getByRole("button", { name: "Copy Invitation Link", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: manualMessage })).toBeVisible();
  return {
    displayed: await page.getByLabel("Shareable invitation link").inputValue(),
    copied: await page.evaluate(() => (window as unknown as { copiedInvitation: string | null }).copiedInvitation),
  };
}

test("INVITE-COPY mock gate accepts correct copy and fallback and rejects corrupted outcomes", async ({ page }) => {
  const expected = { displayed: invitation, copied: invitation };
  for (const copied of [invitation, "https://wrong.example.test/"]) {
    await page.setContent(`<button>Copy Invitation Link</button><label>Shareable invitation link<input value="${invitation}"></label><p role="status"></p><script>
      document.querySelector("button").onclick = () => {
        window.copiedInvitation = ${JSON.stringify(copied)};
        document.querySelector('[role="status"]').textContent = ${JSON.stringify(copiedMessage)};
      };
    </script>`);
    const observed = await observeCopied(page);
    if (copied === invitation) expect(observed).toEqual(expected);
    else expect(() => expect(observed).toEqual(expected)).toThrow();
  }
  for (const displayed of [invitation, "https://wrong.example.test/"]) {
    await page.setContent(`<button>Copy Invitation Link</button><label>Shareable invitation link<input value="${displayed}"></label><p role="status"></p><script>
      document.querySelector("button").onclick = () => {
        window.copiedInvitation = null;
        document.querySelector('[role="status"]').textContent = ${JSON.stringify(manualMessage)};
      };
    </script>`);
    const observed = await observeManual(page);
    if (displayed === invitation) expect(observed).toEqual({ displayed: invitation, copied: null });
    else expect(() => expect(observed).toEqual({ displayed: invitation, copied: null })).toThrow();
  }
});

test("INVITE-COPY-01 copies the generated invitation and confirms it", async ({ page }) => {
  await installClipboard(page, false);
  const invitations = await installRoom(page);
  expect(await observeCopied(page)).toEqual({ displayed: invitation, copied: invitation });
  expect(invitations).toHaveLength(1);
  expect(invitations[0]).toMatchObject({ action: "invite", expectedProfileId: "p1" });
});

test("INVITE-COPY-01 uses writeText when ClipboardItem is unavailable", async ({ page }) => {
  await installClipboard(page, false, true);
  await installRoom(page);
  expect(await observeCopied(page)).toEqual({ displayed: invitation, copied: invitation });
});

test("INVITE-COPY-02 preserves the link when clipboard access is denied", async ({ page }) => {
  await installClipboard(page, true);
  await installRoom(page);
  expect(await observeManual(page)).toEqual({ displayed: invitation, copied: null });
});

test("INVITE-COPY-02 preserves the link when the clipboard API is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { copiedInvitation: string | null }).copiedInvitation = null;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });
  await installRoom(page);
  expect(await observeManual(page)).toEqual({ displayed: invitation, copied: null });
});

test("INVITE-COPY creation failure does not claim or perform a copy", async ({ page }) => {
  await installClipboard(page, false);
  await installRoom(page, true);
  const button = page.getByRole("button", { name: "Copy Invitation Link", exact: true });
  await button.click();
  await expect(page.getByRole("alert").filter({ hasText: "Your request was not confirmed" })).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: copiedMessage })).toHaveCount(0);
  await expect(page.getByLabel("Shareable invitation link")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { copiedInvitation: string | null }).copiedInvitation)).toBeNull();
});

test("INVITE-COPY missing invitation URL does not claim or perform a copy", async ({ page }) => {
  await installClipboard(page, false);
  await installRoom(page, false, true);
  const button = page.getByRole("button", { name: "Copy Invitation Link", exact: true });
  await button.click();
  await expect(page.getByRole("alert").filter({ hasText: "Room access is unavailable" })).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(page.getByLabel("Shareable invitation link")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: copiedMessage })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { copiedInvitation: string | null }).copiedInvitation)).toBeNull();
});

test("INVITE-COPY-01 writes to the actual Chromium clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:3200" });
  await installRoom(page);
  await page.getByRole("button", { name: "Copy Invitation Link", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: copiedMessage })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(invitation);
  await expect(page.getByLabel("Shareable invitation link")).toHaveValue(invitation);
});
