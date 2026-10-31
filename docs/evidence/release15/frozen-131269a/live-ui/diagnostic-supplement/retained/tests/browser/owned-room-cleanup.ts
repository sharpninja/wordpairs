import type { CleanupActor, CleanupCommand, CleanupResponse, CleanupResult } from "../application/live-scale-cleanup-fixture";

function observedMembership(response: CleanupResponse, expectedActor: string) {
  if (response.status === 404) return { kind: "absent" as const };
  if (response.status !== 200 || !response.body || typeof response.body !== "object") return null;
  const view = response.body as Record<string, unknown>;
  if (view.actorId !== expectedActor) return null;
  if (view.status === "closed") return { kind: "closed" as const };
  if (!["waiting", "countdown", "playing"].includes(String(view.status))) return null;
  if (view.role === null) return { kind: "absent" as const };
  return ["player", "observer"].includes(String(view.role)) && Number.isSafeInteger(view.version) && (view.version as number) >= 0
    ? { kind: "member" as const, version: view.version as number }
    : null;
}

/** Never turn an unconfirmed owned-room cleanup into a zero-failure receipt. */
export async function cleanupOwnedRoom(
  actors: readonly CleanupActor[],
  nextId: () => string,
): Promise<CleanupResult> {
  const unresolvedPlayerIndices: number[] = [];
  for (let index = actors.length - 1; index >= 0; index--) {
    const actor = actors[index];
    let pending: CleanupCommand | undefined;
    let verified = false;
    // Four bounded writes, with an additional read that can confirm the last one.
    for (let attempt = 0; attempt <= 4; attempt++) {
      try {
        const observation = observedMembership(await actor.read(), actor.profileId);
        if (observation?.kind === "closed") return { cleanupFailures: 0, roomClosed: true, unresolvedPlayerIndices: [] };
        if (observation?.kind === "absent") { verified = true; break; }
        if (!observation || observation.kind !== "member" || attempt === 4) continue;
        pending ??= { expectedVersion: observation.version, commandId: nextId() };
        const left = await actor.leave(pending);
        if ((left.status >= 200 && left.status < 300) || left.status === 409) pending = undefined;
        else if (left.status > 0 && left.status < 500) break;
      } catch {
        // Keep the same command after an uncertain write. Only a subsequent
        // authorized read or exact replay can resolve what the server committed.
      }
    }
    if (!verified) unresolvedPlayerIndices.push(index);
  }
  return { cleanupFailures: unresolvedPlayerIndices.length, roomClosed: false, unresolvedPlayerIndices };
}
