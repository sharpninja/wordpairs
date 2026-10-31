import { describe, expect, it } from "vitest";
import { assertHiddenMemberProfiles, assertPrivateMemberProfile } from "./admin-profile-privacy";

describe("GA-10 mock gate: independent member-privacy oracles", () => {
  it("accepts a private member draft and guest-only public rows", () => {
    assertPrivateMemberProfile({ kind: "member", publicLeaderboard: false });
    assertHiddenMemberProfiles([{ id: "guest-visible" }], ["github-owner", "legacy-member"]);
  });
  it("rejects a published member draft", () => {
    expect(() => assertPrivateMemberProfile({ kind: "member", publicLeaderboard: true })).toThrow();
  });
  it("rejects either owner or retired member leaking into the projection", () => {
    for (const id of ["github-owner", "legacy-member"])
      expect(() => assertHiddenMemberProfiles([{ id }], ["github-owner", "legacy-member"])).toThrow();
  });
});
