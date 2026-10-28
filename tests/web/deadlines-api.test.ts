import { afterEach, beforeEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ deadlines: vi.fn(), publish: vi.fn() }));
vi.mock("../../src/infrastructure/runtime", () => ({
  advanceLobbyDeadlines: calls.deadlines,
  deliverOutbox: calls.publish,
}));
import { POST } from "../../src/app/api/internal/deadlines/route";
const secret = "local-scheduler-contract-secret-long-enough";
const request = (authorized = true) =>
  new Request("https://game.test/api/internal/deadlines", {
    method: "POST",
    headers: {
      Authorization: authorized ? `Bearer ${secret}` : "Bearer wrong",
    },
  });
beforeEach(() => {
  vi.stubEnv("WORDPAIRS_SCHEDULER_SECRET", secret);
  calls.deadlines.mockResolvedValue({ ok: true, value: 2 });
  calls.publish.mockResolvedValue({ ok: true, value: 3 });
});
afterEach(() => vi.unstubAllEnvs());
it("LIVE-03 rejects unauthorized worker calls before work", async () => {
  expect((await POST(request(false))).status).toBe(403);
  expect(calls.deadlines).not.toHaveBeenCalled();
  expect(calls.publish).not.toHaveBeenCalled();
});
it("LIVE-03 independently reports deadline and bounded outbox outcomes", async () => {
  const r = await POST(request());
  expect(r.status).toBe(200);
  expect(calls.publish).toHaveBeenCalledWith(25);
  expect(await r.json()).toEqual({
    deadlines: { ok: true, applied: 2 },
    outbox: { ok: true, published: 3 },
  });
});
it("LIVE-03 publishes despite deadline failure and reports the partial failure", async () => {
  calls.deadlines.mockResolvedValue({
    ok: false,
    error: { code: "TEMPORARY_UNAVAILABLE" },
  });
  const r = await POST(request());
  expect(calls.publish).toHaveBeenCalledWith(25);
  expect(r.status).toBe(503);
  expect((await r.json()).outbox).toEqual({ ok: true, published: 3 });
});
it("LIVE-03 publication failure does not masquerade as healthy scheduler success", async () => {
  calls.publish.mockResolvedValue({
    ok: false,
    error: { code: "SERVICE_LIMIT" },
  });
  const r = await POST(request());
  expect(r.status).toBe(503);
  expect(await r.json()).toEqual({
    deadlines: { ok: true, applied: 2 },
    outbox: { ok: false, error: "SERVICE_LIMIT" },
  });
});
it("LIVE-03 missing Realtime configuration is a visible worker failure", async () => {
  calls.publish.mockResolvedValue(undefined);
  const r = await POST(request());
  expect(r.status).toBe(503);
  expect((await r.json()).outbox).toEqual({
    ok: false,
    error: "TEMPORARY_UNAVAILABLE",
  });
});
