/** Independent scripted contract provider, authored before the browser cleanup implementation. */
export type CleanupCommand = { expectedVersion: number; commandId: string };
export type CleanupResponse = { status: number; body?: unknown };
export type CleanupActor = {
  profileId: string;
  read(): Promise<CleanupResponse>;
  leave(command: CleanupCommand): Promise<CleanupResponse>;
};
export type CleanupResult = { cleanupFailures: number; roomClosed: boolean; unresolvedPlayerIndices: number[] };
export type CleanupProvider = (actors: readonly CleanupActor[], nextId: () => string) => Promise<CleanupResult>;

export function fixtureProvider(kind: string): CleanupProvider {
  return async (actors, nextId) => {
    const unresolvedPlayerIndices: number[] = [];
    for (let index = actors.length - 1; index >= 0; index--) {
      const actor = actors[index];
      let command: CleanupCommand | undefined;
      let absent = false;
      for (let step = 0; step <= 4; step++) {
        try {
          const observation = await actor.read();
          if (observation.status === 404) { absent = true; break; }
          const state = observation.body as { actorId?: string; status?: string; role?: string | null; version?: number } | undefined;
          if (observation.status === 200 && state?.actorId === actor.profileId) {
            if (state.status === "closed") return { cleanupFailures: 0, roomClosed: true, unresolvedPlayerIndices: [] };
            if (["waiting", "countdown", "playing"].includes(state.status ?? "") && state.role === null) { absent = true; break; }
            if (step < 4 && ["player", "observer"].includes(state.role ?? "") && Number.isSafeInteger(state.version) && state.version! >= 0) {
              command ??= { expectedVersion: state.version!, commandId: nextId() };
              if (kind === "wrong-identity") command = { ...command, commandId: nextId() };
              const response = await actor.leave(command);
              if (kind === "wrong-no-readback" && response.status >= 200 && response.status < 300) { absent = true; break; }
              if ((response.status >= 200 && response.status < 300) || response.status === 409) command = undefined;
              else if (response.status > 0 && response.status < 500) break;
            }
          }
        } catch { /* Scripted transport failure remains unresolved unless read back. */ }
      }
      if (!absent) unresolvedPlayerIndices.push(index);
    }
    if (kind === "wrong-silent-failure") return { cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] };
    return { cleanupFailures: unresolvedPlayerIndices.length, roomClosed: false, unresolvedPlayerIndices };
  };
}
