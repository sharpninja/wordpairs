import { strict as assert } from "node:assert";

/** GA-10 oracle: expected values come from the confirmed privacy requirement. */
export function assertPrivateMemberProfile(profile: {
  kind: string;
  publicLeaderboard: boolean;
}) {
  assert.equal(profile.kind, "member");
  assert.equal(profile.publicLeaderboard, false);
}

export function assertHiddenMemberProfiles(
  rows: readonly { id: string }[],
  hiddenIds: readonly string[],
) {
  for (const id of hiddenIds)
    assert.equal(rows.some((row) => row.id === id), false, `Published member ${id}`);
}
