import type { BrowserContext } from "@playwright/test";

export type AdminDecision = "approve" | "reject" | "uphold" | "overturn";
export type AdminDenial = "original-reviewer" | "proposer";
export type AdminDecisionScenario = AdminDecision | AdminDenial;
export type AdminDecisionFault = "correct" | "wrong-status" | "wrong-reason" | "missing-history" | "self-resolution";

// Independent HTTP contract snapshots for existing legacy cases. No production
// policy, projection, repository, or expected output is imported by this fixture.
export const decisionContracts = {
  approve: { action: "review", field: "decision", button: "Approve for curation", reasonLabel: "Decision reason", status: "approved", audit: "approved" },
  reject: { action: "review", field: "decision", button: "Reject", reasonLabel: "Decision reason", status: "rejected", audit: "rejected" },
  uphold: { action: "resolve", field: "outcome", button: "Uphold rejection", reasonLabel: "Appeal decision reason", status: "rejected", audit: "upheld" },
  overturn: { action: "resolve", field: "outcome", button: "Overturn rejection", reasonLabel: "Appeal decision reason", status: "approved", audit: "overturned" },
} as const;
export const legacyCaseId = "legacy-decision-case";
export const legacyWord = "Legacy Orbit";
export const decisionReason = "Reviewed the retained legacy evidence.";
export const oldReason = "Original legacy rejection.";

export async function adminDecisionFixture(context: BrowserContext, scenario: AdminDecisionScenario, fault: AdminDecisionFault = "correct") {
  const appeal = scenario !== "approve" && scenario !== "reject";
  const denied = scenario === "original-reviewer" || scenario === "proposer";
  const priorStatus = appeal ? "appealed" : "pending";
  const writes: Record<string, unknown>[] = [];
  let version = 7;
  let reads = 0;
  let item = {
    id: legacyCaseId, version: appeal ? 2 : 0, kind: "nomination", word: legacyWord,
    status: priorStatus, nominationCount: 10, futureEligible: false, playable: false,
    reason: appeal ? oldReason : null, createdAt: 1, canReview: !appeal,
    canAppeal: false, canResolve: appeal && (!denied || fault === "self-resolution"), canActivate: false,
  };
  const original = { caseId: legacyCaseId, caseVersion: 1, action: "rejected", actorId: scenario === "original-reviewer" ? "owner" : "legacy-reviewer", at: 1, previousStatus: "pending", status: "rejected", reason: oldReason, nominationCount: 10 };
  let audit = appeal ? [original, { ...original, caseVersion: 2, action: "appeal", actorId: scenario === "proposer" ? "owner" : "legacy-proposer", at: 2, previousStatus: "rejected", status: "appealed", reason: "Legacy proposer requested an independent review." }] : [];
  await context.route("**/api/admin/session", route => route.fulfill({ json: {
    profile: { id: "owner", version: 0, kind: "member", alias: "sharpninja fixture", icon: "owl", publicLeaderboard: false, wins: 0, points: 0, earliestWinAt: null },
    permissions: ["moderate", "manage-content", "resolve-appeals"], sessionGeneration: "legacy-admin-fixture",
  } }));
  await context.route("**/api/content", async route => {
    if (route.request().method() === "GET") {
      reads++;
      return route.fulfill({ json: { actorId: "owner", version, canModerate: true, isSenior: true, wins: 0, canSuggest: false,
        cases: [item, { ...item, id: "unrelated-legacy", word: "Unrelated legacy case", canReview: false, canResolve: false }],
        categories: [], catalogPairs: [], audit } });
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    if (denied) return route.fulfill({ status: 403, json: { error: { code: "NOT_AUTHORIZED" } } });
    const contract = decisionContracts[scenario];
    const status = fault === "wrong-status" ? (contract.status === "approved" ? "rejected" : "approved") : contract.status;
    const reason = fault === "wrong-reason" ? "An unrelated reason." : decisionReason;
    item = { ...item, version: item.version + 1, status, reason, futureEligible: status === "approved", canReview: false, canResolve: false };
    audit = fault === "missing-history" ? [] : [...audit, { caseId: legacyCaseId, caseVersion: item.version, action: contract.audit, actorId: "owner", at: 3, previousStatus: priorStatus, status, reason, nominationCount: 10 }];
    version++;
    return route.fulfill({ json: { version, caseId: legacyCaseId, status, futureEligible: status === "approved", playable: false } });
  });
  return { writes, reads: () => reads };
}
