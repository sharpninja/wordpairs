import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
vi.mock("pg", () => ({ Pool: class {
  on() {}
  async connect() { return database; }
} }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const guest = "g".repeat(43), admin = "a".repeat(43);
const profile = (kind: "guest" | "member") => ({ id: kind, version: 0, kind, providerSubject: kind === "member" ? "16146732" : null, alias: "Fixture", icon: "owl", publicLeaderboard: false, wins: 0, points: 0, earliestWinAt: null });

it("actual composition separates guest/admin token namespaces, strips guest roles and revokes admin independently", async () => {
  vi.stubEnv("WORDPAIRS_DATABASE_URL", "postgresql://fixture:fixture@localhost:5432/fixture");
  vi.stubEnv("WORDPAIRS_ORIGIN", "https://wordpairs.example.test");
  vi.stubEnv("WORDPAIRS_GITHUB_CLIENT_ID", "fixture-client");
  vi.stubEnv("WORDPAIRS_GITHUB_CLIENT_SECRET", "fixture-secret");
  vi.stubEnv("WORDPAIRS_ADMIN_PROFILE_IDS", "guest");
  const issued = new Map([[hash(guest), profile("guest")], [hash(`github-admin\u0000${admin}`), profile("member")]]);
  database.query.mockImplementation(async (sql: string, args: unknown[]) => {
    const digest = String(args[0]);
    if (sql.includes("identity_revoke")) return { rows: [{ response: issued.delete(digest) }] };
    if (!sql.includes("identity_session")) throw new Error("Unexpected fixture query");
    const current = issued.get(digest);
    return { rows: [{ response: current ? { profile: current, actor: { profileId: current.id, roles: ["admin"] } } : null }] };
  });
  const runtime = await import("../../src/infrastructure/runtime");
  const players = runtime.getIdentityService()!;
  const administrators = runtime.getAdminIdentityService()!;
  expect((await players.session(guest))).toMatchObject({ ok: true, value: { actor: { profileId: "guest", roles: ["player"] } } });
  expect((await administrators.session(guest)).ok).toBe(false);
  expect((await players.session(admin)).ok).toBe(false);
  expect((await administrators.session(admin))).toMatchObject({ ok: true, value: { profile: { kind: "member" } } });
  const { adminSession } = await import("../../src/web/admin-session");
  const request = (token: string) => new Request("https://wordpairs.example.test/api/admin/session", { headers: { Cookie: `wp_admin=${token}; wp_session=${guest}` } });
  expect((await adminSession(request(guest))).ok).toBe(false);
  expect(await adminSession(request(admin))).toMatchObject({ ok: true, value: { actor: { profileId: "member", roles: ["admin"] } } });
  // Even an incorrectly issued guest-shaped record cannot become administrator.
  issued.set(hash(`github-admin\u0000${guest}`), profile("guest"));
  expect((await adminSession(request(guest))).ok).toBe(false);
  // A formerly account-backed public game session is rejected in guest mode.
  issued.set(hash("m".repeat(43)), profile("member"));
  expect((await players.session("m".repeat(43))).ok).toBe(false);
  expect(runtime.oidcAvailable()).toBe(false);
  await administrators.logout(admin);
  expect((await administrators.session(admin)).ok).toBe(false);
  expect((await players.session(guest)).ok).toBe(true);
});
