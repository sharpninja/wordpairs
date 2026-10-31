/** Test setup only: all actual UI preparations precede any readiness command. */
export async function readyAfterBarrier<T>(
  players: readonly T[],
  prepare: (player: T, index: number) => Promise<void>,
  ready: (player: T, index: number) => Promise<void>,
): Promise<void> {
  // Capture synchronous callback failures and retain ownership until every
  // started page preparation settles, before the caller can close contexts.
  const prepared = await Promise.allSettled(players.map(async (player, index) => prepare(player, index)));
  const failure = prepared.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  for (const [index, player] of players.entries()) await ready(player, index);
}
