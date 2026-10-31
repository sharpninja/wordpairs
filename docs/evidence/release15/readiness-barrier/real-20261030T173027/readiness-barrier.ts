/** Test setup only: all actual UI preparations precede any readiness command. */
export async function readyAfterBarrier<T>(
  players: readonly T[],
  prepare: (player: T, index: number) => Promise<void>,
  ready: (player: T, index: number) => Promise<void>,
): Promise<void> {
  await Promise.all(players.map(prepare));
  for (const [index, player] of players.entries()) await ready(player, index);
}
