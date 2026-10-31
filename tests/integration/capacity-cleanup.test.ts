import { expect, it } from "vitest";
import {
  assertCapacityCleanup,
  type CapacityCleanupObservation,
} from "./capacity-cleanup.contract";

function correct(): CapacityCleanupObservation {
  return {
    ownedBefore: ["match:owned-room", "outbox:owned-room", "profile:owned-user"],
    ownedAfter: [],
    unrelatedBefore: [
      "room:outside",
      "outbox:moderation:owned-room:unchanged-payload",
    ],
    unrelatedAfter: [
      "room:outside",
      "outbox:moderation:owned-room:unchanged-payload",
    ],
    closedPools: ["service", "admin"],
    errors: [],
  };
}

it("capacity cleanup oracle accepts independently specified owned-only cleanup", () => {
  assertCapacityCleanup(correct());
});
it("capacity cleanup oracle rejects absent cleanup", () => {
  const observed = correct();
  observed.ownedAfter = [...observed.ownedBefore];
  expect(() => assertCapacityCleanup(observed)).toThrow();
});
it("capacity cleanup oracle rejects deletion of an unrelated row", () => {
  const observed = correct();
  observed.unrelatedAfter = [];
  expect(() => assertCapacityCleanup(observed)).toThrow();
});
it("capacity cleanup oracle rejects changing unrelated event contents", () => {
  const observed = correct();
  observed.unrelatedAfter[1] = "outbox:moderation:owned-room:changed-payload";
  expect(() => assertCapacityCleanup(observed)).toThrow();
});
it("capacity cleanup oracle rejects leaving either pool open", () => {
  const observed = correct();
  observed.closedPools = ["admin"];
  expect(() => assertCapacityCleanup(observed)).toThrow();
});
it("capacity cleanup oracle requires explicit cleanup error reporting", () => {
  const observed = correct();
  observed.ownedAfter = [...observed.ownedBefore];
  expect(() => assertCapacityCleanup(observed, true)).toThrow();
});
it("capacity cleanup oracle accepts an observed failure only with both pools closed and its error retained", () => {
  const observed = correct();
  observed.ownedAfter = [...observed.ownedBefore];
  observed.errors = ["cleanup failed"];
  assertCapacityCleanup(observed, true);
});
it("capacity cleanup oracle rejects vacuous empty owned fixtures", () => {
  const observed = correct();
  observed.ownedBefore = [];
  expect(() => assertCapacityCleanup(observed)).toThrow();
});
