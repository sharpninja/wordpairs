import { type MatchAction, MatchService } from "../../src/application/matches";
import type {
  Command,
  TransactionStore,
  Transition,
} from "../../src/application/ports";
import { buildCatalog, type Catalog } from "../../src/domain/catalog";
import { createMatch } from "../../src/domain/match";
import type {
  Category,
  Match,
  Pair,
  Room,
  Round,
  Versioned,
} from "../../src/domain/model";
import { failure, type Result, success } from "../../src/domain/result";
import { joinRoom, newRoom } from "../../src/domain/rooms";
export const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
};
export const acceptanceTraces: { initial: unknown; commits: unknown[] }[] = [];
/** Serial fake of the documented port. This proves use-case behavior, not DB durability. */
export class TransactionFake<S extends Versioned>
  implements TransactionStore<S>
{
  private tail = Promise.resolve();
  private records = new Map<string, { digest: string; transition: unknown }>();
  readonly commits: { command: Command; transition: Transition<S, unknown> }[] =
    [];
  failNext = false;
  constructor(public state: S) {
    acceptanceTraces.push({
      initial: structuredClone(state),
      commits: this.commits,
    });
  }
  async transact<T>(
    command: Command,
    decide: (state: S) => Promise<Result<Transition<S, T>>>,
  ): Promise<Result<Transition<S, T>>> {
    let unlock = () => {};
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    await previous;
    try {
      const key = `${command.aggregateId}:${command.actorId}:${command.commandId}`;
      const prior = this.records.get(key);
      if (prior)
        return prior.digest === command.requestDigest
          ? success(structuredClone(prior.transition) as Transition<S, T>)
          : failure("IDEMPOTENCY_CONFLICT");
      if (command.expectedVersion !== this.state.version)
        return failure("CONFLICT");
      const result = await decide(structuredClone(this.state));
      if (!result.ok) return result;
      if (this.failNext) {
        this.failNext = false;
        return failure("TEMPORARY_UNAVAILABLE");
      }
      this.state = structuredClone(result.value.state);
      this.records.set(key, {
        digest: command.requestDigest,
        transition: structuredClone(result.value),
      });
      this.commits.push({ command, transition: structuredClone(result.value) });
      return result;
    } finally {
      unlock();
    }
  }
}
export function fixtureCatalog() {
  const categories: Category[] = [
    "animals",
    "space",
    "colors",
    "years",
    "directors",
    "singers",
  ].map((id) => ({
    id,
    version: 0,
    name: id,
    backgroundId:
      id === "animals"
        ? "forest.svg"
        : id === "space"
          ? "stars.svg"
          : `${id}.svg`,
    approved: true,
  }));
  const pairs: Pair[] = categories.flatMap((c) =>
    Array.from({ length: 10 }, (_, i) => ({
      id: `${c.id}-${i}`,
      version: 0,
      categoryId: c.id,
      prompt: "pet",
      target: "cat",
      acceptedAnswers: ["kitty"],
      hints: ["animal", "feline", "meows"] as [string, string, string],
      backgroundId: c.backgroundId,
      approved: true,
    })),
  );
  return value(buildCatalog(categories, pairs));
}
export function roomFixture(
  players = ["p1", "p2"],
  observers: { id: string; follows: string }[] = [],
  capacity = Math.max(2, players.length),
  now = 0,
) {
  let room = value(newRoom("r", players[0], capacity, "ABCDEFGH", now));
  for (const id of players.slice(1))
    room = value(joinRoom(room, id, "player", null, now));
  for (const observer of observers)
    room = value(
      joinRoom(room, observer.id, "observer", observer.follows, now),
    );
  return room;
}
export function roundFixture(
  id: string,
  solves: Round["solves"] = [],
  revealed = true,
): Round {
  return {
    id,
    pairId: "animals-0",
    pairVersion: 0,
    categoryId: "animals",
    startedAt: 0,
    stage: 3,
    stageDueAt: 80000,
    submittedPlayerIds: [],
    solves,
    revealed,
    endedAt: revealed ? 80000 : undefined,
    attempts: [],
  };
}
export function solve(
  profileId: string,
  points: number,
  elapsedMs: number,
  order = 0,
  stage = 0,
) {
  return { profileId, points, elapsedMs, acceptedAt: elapsedMs, order, stage };
}
export function gameFixture(
  roster = ["p1", "p2"],
  now = 0,
  initial?: Match,
  catalog: Catalog = fixtureCatalog(),
) {
  let time = now;
  let serial = 0;
  const store = new TransactionFake(
    initial ?? value(createMatch("m", "r", roster, { integer: (a) => a }, now)),
  );
  const repository = {
    transact: store.transact.bind(store),
    get: async () => success(store.state),
    ensure: async (_roomId: string, _factory: (room: Room) => Result<Match>) =>
      success(store.state),
  };
  const service = new MatchService(
    repository,
    { read: async () => success(catalog) },
    { now: () => time },
    { next: () => `real-${++serial}` },
    { integer: (a) => a },
  );
  const command = (actorId = "p1", commandId = `cmd-${++serial}`) => ({
    aggregateId: store.state.id,
    actorId,
    commandId,
    requestDigest: commandId,
    expectedVersion: store.state.version,
  });
  const act = (action: MatchAction, actorId = "p1", commandId?: string) =>
    service.act(command(actorId, commandId), action);
  const choose = () =>
    act(
      store.state.autoCategoryId
        ? { type: "continue" }
        : { type: "choose", categoryId: "animals" },
      store.state.chooserId ?? store.state.roster[0],
      `setup-${++serial}`,
    );
  const answer = (actorId: string, answer = "cat", commandId?: string) => {
    const round = store.state.rounds.at(-1);
    if (!round) throw new Error("No active round");
    return act(
      { type: "answer", roundId: round.id, stage: round.stage, answer },
      actorId,
      commandId,
    );
  };
  const expire = async (at: number) => {
    time = at;
    const round = store.state.rounds.at(-1);
    if (!round) throw new Error("No active round");
    return service.expire({
      id: `deadline-${++serial}`,
      aggregateId: store.state.id,
      kind: "stage",
      expectedVersion: store.state.version,
      dueAt: round.stageDueAt,
    });
  };
  return {
    store,
    service,
    catalog,
    command,
    act,
    choose,
    answer,
    expire,
    time: (at: number) => {
      time = at;
    },
  };
}
