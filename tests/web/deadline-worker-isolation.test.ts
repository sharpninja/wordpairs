import { afterEach, expect, it, vi } from "vitest";
import { LobbyDispatcher } from "../../src/application/lobby";
import { PostgresMatchRepository } from "../../src/infrastructure/match-repository";
import { advanceLobbyDeadlines } from "../../src/infrastructure/runtime";

vi.mock("../../src/infrastructure/postgres-pool", () => ({ createSupabasePool: () => ({}) }));
type Result = { ok: true; value: number } | { ok: false; error: { code: string } };
type Dispatch = (waitForActive?: boolean) => Promise<Result | null>;

// Independent behavioral fakes validate that these assertions reject joining
// an active batch. They do not replace the production-bound run.
function fixture(joinForeground: boolean): Dispatch {
  let active: Promise<Result> | undefined;
  return async (waitForActive = false) => {
    if (active) return waitForActive || joinForeground ? active : { ok: true, value: 0 };
    active = (async () => {
      const first = await LobbyDispatcher.prototype.drain.call({} as LobbyDispatcher, 25);
      if (!first.ok) return first as Result;
      const second = await LobbyDispatcher.prototype.drain.call({} as LobbyDispatcher, 25);
      return second.ok ? { ok: true, value: first.value + second.value } : second as Result;
    })();
    try { return await active; } finally { active = undefined; }
  };
}
const dispatch: Dispatch = process.env.WORDPAIRS_DEADLINE_FIXTURE === "correct"
  ? fixture(false)
  : process.env.WORDPAIRS_DEADLINE_FIXTURE === "wrong"
    ? fixture(true)
    : advanceLobbyDeadlines as unknown as Dispatch;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  vi.stubEnv("WORDPAIRS_DATABASE_URL", "postgres://fixture");
  const pending = deferred<Result>();
  const drain = vi.spyOn(LobbyDispatcher.prototype, "drain")
    .mockReturnValueOnce(pending.promise as ReturnType<LobbyDispatcher["drain"]>)
    .mockResolvedValue({ ok: true, value: 1 });
  vi.spyOn(PostgresMatchRepository.prototype, "starts").mockResolvedValue({ ok: true, value: [] });
  return { pending, drain };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("LIVE-03 foreground does not join a pending deadline worker batch", async () => {
  const { pending, drain } = setup();
  const worker = dispatch(true);
  let completed = false;
  let foregroundResult: Result | null | undefined;
  const foreground = dispatch().then((result) => { foregroundResult = result; completed = true; });
  try {
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(completed).toBe(true);
    expect(foregroundResult).toEqual({ ok: true, value: 0 });
    expect(drain).toHaveBeenCalledTimes(1);
  } finally {
    pending.resolve({ ok: true, value: 1 });
    await Promise.all([worker, foreground]);
  }
  expect(await worker).toEqual({ ok: true, value: 2 });
  expect(drain).toHaveBeenCalledTimes(2);
});

it("LIVE-03 concurrent worker calls wait for and share the same batch", async () => {
  const { pending, drain } = setup();
  const first = dispatch(true); const second = dispatch(true);
  let completed = false;
  const waiting = second.then(() => { completed = true; });
  try {
    await Promise.resolve(); await Promise.resolve();
    expect(completed).toBe(false);
    expect(drain).toHaveBeenCalledTimes(1);
  } finally {
    pending.resolve({ ok: true, value: 1 });
    await Promise.all([first, second, waiting]);
  }
  expect(await first).toEqual({ ok: true, value: 2 });
  expect(await second).toEqual({ ok: true, value: 2 });
  expect(drain).toHaveBeenCalledTimes(2);
});

it("LIVE-03 a foreground request still starts catch-up when no batch is running", async () => {
  const { pending, drain } = setup();
  const first = dispatch();
  let completed = false;
  const waiting = first.then(() => { completed = true; });
  try {
    await Promise.resolve(); await Promise.resolve();
    expect(completed).toBe(false);
    expect(drain).toHaveBeenCalledTimes(1);
  } finally {
    pending.resolve({ ok: true, value: 1 });
    await Promise.all([first, waiting]);
  }
  expect(await first).toEqual({ ok: true, value: 2 });
});

it("LIVE-03 failed worker batches reach waiting workers and permit a later retry", async () => {
  const { pending, drain } = setup();
  const first = dispatch(true); const second = dispatch(true);
  pending.resolve({ ok: false, error: { code: "TEMPORARY_UNAVAILABLE" } });
  expect(await first).toEqual({ ok: false, error: { code: "TEMPORARY_UNAVAILABLE" } });
  expect(await second).toEqual({ ok: false, error: { code: "TEMPORARY_UNAVAILABLE" } });
  expect(drain).toHaveBeenCalledTimes(1);
  expect(await dispatch(true)).toEqual({ ok: true, value: 2 });
  expect(drain).toHaveBeenCalledTimes(3);
});
