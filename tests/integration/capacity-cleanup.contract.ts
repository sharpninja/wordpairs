import { expect } from "vitest";

export interface CapacityCleanupObservation {
  ownedBefore: string[];
  ownedAfter: string[];
  unrelatedBefore: string[];
  unrelatedAfter: string[];
  closedPools: string[];
  errors: string[];
}

// One oracle for independent fixtures and the real PostgreSQL cleanup binding.
export function assertCapacityCleanup(
  observed: CapacityCleanupObservation,
  cleanupFailure = false,
) {
  expect(observed.ownedBefore.length).toBeGreaterThan(0);
  expect(observed.ownedAfter).toEqual(
    cleanupFailure ? observed.ownedBefore : [],
  );
  expect(observed.unrelatedBefore.length).toBeGreaterThan(0);
  expect(observed.unrelatedAfter).toEqual(observed.unrelatedBefore);
  expect([...observed.closedPools].sort()).toEqual(["admin", "service"]);
  expect(observed.errors).toEqual(cleanupFailure ? ["cleanup failed"] : []);
}
