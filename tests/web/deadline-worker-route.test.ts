import { afterEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ deadlines: vi.fn(), publish: vi.fn() }));
vi.mock("../../src/infrastructure/runtime", () => ({ advanceLobbyDeadlines: calls.deadlines, deliverOutbox: calls.publish }));
import { POST as actual } from "../../src/app/api/internal/deadlines/route";

// A fake endpoint makes the assertion independently demonstrable before the
// production endpoint is changed; the real route is used without the fixture.
function fixture(waitForActive: boolean) {
  return async () => {
    const deadlines = await calls.deadlines(waitForActive);
    const outbox = await calls.publish(25);
    return Response.json({ deadlines: { ok: true, applied: deadlines.value }, outbox: { ok: true, published: outbox.value } });
  };
}
const handler = process.env.WORDPAIRS_DEADLINE_ROUTE_FIXTURE === "correct"
  ? fixture(true)
  : process.env.WORDPAIRS_DEADLINE_ROUTE_FIXTURE === "wrong"
    ? fixture(false)
    : actual;
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("LIVE-03 protected worker waits for the actual deadline batch outcome", async () => {
  const secret = "deadline-worker-fixture-secret-long-enough";
  vi.stubEnv("WORDPAIRS_SCHEDULER_SECRET", secret);
  calls.deadlines.mockResolvedValue({ ok: true, value: 2 });
  calls.publish.mockResolvedValue({ ok: true, value: 3 });
  const response = await handler(new Request("https://game.test/api/internal/deadlines", { method: "POST", headers: { Authorization: `Bearer ${secret}` } }));
  expect(calls.deadlines).toHaveBeenCalledExactlyOnceWith(true);
  expect(calls.publish).toHaveBeenCalledExactlyOnceWith(25);
  expect(await response.json()).toEqual({ deadlines: { ok: true, applied: 2 }, outbox: { ok: true, published: 3 } });
});
