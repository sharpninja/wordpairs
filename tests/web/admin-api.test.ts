import { beforeEach, expect, it, vi } from "vitest";
import { failure, success } from "../../src/domain/result";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  view: vi.fn(),
  act: vi.fn(),
}));
vi.mock("../../src/infrastructure/runtime", () => ({
  getIdentityService: () => ({ session: mocks.session }),
  getAccessService: () => ({ view: mocks.view, act: mocks.act }),
}));

import { GET, POST } from "../../src/app/api/admin/users/route";

const input = {
  expectedProfileId: "owner",
  expectedVersion: 0,
  commandId: "grant-1",
  profileId: "target",
  role: "moderator",
  grant: true,
  reason: "Trusted moderator",
};
const request = (
  body: unknown,
  origin = "https://wordpairs.test",
  site = "same-origin",
) =>
  new Request("https://wordpairs.test/api/admin/users", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "Sec-Fetch-Site": site,
    },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.stubEnv("WORDPAIRS_ORIGIN", "https://wordpairs.test");
  mocks.session.mockResolvedValue(
    success({ actor: { profileId: "owner", roles: ["player", "admin"] } }),
  );
  mocks.view.mockResolvedValue(
    success({ actorId: "owner", version: 0, users: [], audit: [], total: 0 }),
  );
  mocks.act.mockResolvedValue(success({ version: 1 }));
});
it("binds role changes to the authenticated administrator and uses private responses", async () => {
  const response = await POST(request(input));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.act).toHaveBeenCalledWith(
    expect.objectContaining({
      actorId: "owner",
      aggregateId: "access-control",
      requestDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    }),
    {
      profileId: "target",
      role: "moderator",
      grant: true,
      reason: "Trusted moderator",
    },
  );
  expect(
    (
      await GET(
        new Request("https://wordpairs.test/api/admin/users?search=Oak"),
      )
    ).status,
  ).toBe(200);
  expect(mocks.view).toHaveBeenCalledWith("owner", "Oak");
});
it("rejects player/moderator access, CSRF, identity and role forgery before storage", async () => {
  for (const roles of [["player"], ["player", "moderator"]]) {
    mocks.session.mockResolvedValue(
      success({ actor: { profileId: "owner", roles } }),
    );
    expect(
      (await GET(new Request("https://wordpairs.test/api/admin/users"))).status,
    ).toBe(403);
    expect((await POST(request(input))).status).toBe(403);
  }
  mocks.session.mockResolvedValue(
    success({ actor: { profileId: "owner", roles: ["admin"] } }),
  );
  expect((await POST(request(input, "https://evil.test"))).status).toBe(403);
  expect(
    (await POST(request(input, "https://wordpairs.test", "cross-site"))).status,
  ).toBe(403);
  expect(
    (await POST(request({ ...input, expectedProfileId: "another" }))).status,
  ).toBe(409);
  for (const body of [
    { ...input, roles: ["admin"] },
    { ...input, role: "player" },
    { ...input, grant: "true" },
    { ...input, administrators: ["owner"] },
  ])
    expect((await POST(request(body))).status).toBe(400);
  expect(mocks.act).not.toHaveBeenCalled();
  expect(mocks.view).not.toHaveBeenCalled();
});
it("propagates a freshly revoked administrator's database denial despite the earlier session", async () => {
  mocks.view.mockResolvedValue(failure("NOT_AUTHORIZED"));
  mocks.act.mockResolvedValue(failure("NOT_AUTHORIZED"));
  expect(
    (await GET(new Request("https://wordpairs.test/api/admin/users"))).status,
  ).toBe(403);
  expect((await POST(request(input))).status).toBe(403);
});
