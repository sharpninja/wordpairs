import { expect, it } from "vitest";
import { matchDeadlines } from "../../src/application/matches";
import { gameFixture, value } from "../acceptance/fixtures";

const summary = async () => {
  const h = gameFixture();
  value(await h.choose());
  value(await h.expire(80000));
  return h;
};
it("UI-NOSOLVER: exact server deadline, early rejection, replay and late worker preserve a full first stage", async () => {
  const h = await summary();
  const jobs = matchDeadlines(h.store.state, () => "automatic-next");
  expect(jobs).toHaveLength(1);
  const job = jobs[0];
  expect(job.dueAt).toBe(83000);
  h.time(82999);
  expect((await h.service.expire(job)).ok).toBe(false);
  expect(h.store.state.status).toBe("summary");
  h.time(90000);
  const first = value(await h.service.expire(job));
  expect(h.store.state.rounds).toHaveLength(2);
  expect(h.store.state.rounds[1]).toMatchObject({
    startedAt: 90000,
    stageDueAt: 110000,
  });
  expect(value(await h.service.expire(job))).toEqual(first);
  expect(h.store.state.rounds).toHaveLength(2);
});
it("manual Continue and the system deadline may win in either order without two next rounds", async () => {
  for (const first of ["manual", "deadline"]) {
    const h = await summary();
    const job = matchDeadlines(h.store.state, () => "automatic-next")[0];
    expect(job).toBeDefined();
    h.time(83000);
    if (first === "manual") {
      value(await h.act({ type: "continue" }));
      expect((await h.service.expire(job)).ok).toBe(false);
    } else {
      value(await h.service.expire(job));
      expect((await h.act({ type: "continue" })).ok).toBe(false);
    }
    expect(h.store.state.rounds).toHaveLength(2);
  }
});
it("eight no-solver rounds never schedule or create a ninth", async () => {
  const h = gameFixture();
  value(await h.choose());
  let now = 80000;
  for (let round = 1; round <= 8; round++) {
    value(await h.expire(now));
    const jobs = matchDeadlines(h.store.state, () => `automatic-${round}`);
    if (round === 8) {
      expect(jobs).toEqual([]);
      break;
    }
    expect(jobs).toHaveLength(1);
    now += 3000;
    h.time(now);
    value(await h.service.expire(jobs[0]));
    now += 80000;
  }
  expect(h.store.state.status).toBe("finished");
  expect(h.store.state.rounds).toHaveLength(8);
});
