import type { Versioned } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import type {
  Clock,
  Command,
  QuotaStatus,
  TransactionStore,
  Transition,
} from "./ports";

/** Executes once within the repository's serialized, idempotent transaction boundary. */
export async function executeCommand<S extends Versioned, T>(
  command: Command,
  ports: { store: TransactionStore<S>; clock: Clock; quota: QuotaStatus },
  decide: (state: S, now: number) => Result<Transition<S, T>>,
): Promise<Result<T>> {
  if (
    !command.aggregateId ||
    !command.actorId ||
    !command.commandId ||
    !command.requestDigest ||
    !Number.isSafeInteger(command.expectedVersion) ||
    command.expectedVersion < 0
  )
    return failure("VALIDATION_ERROR");

  try {
    const committed = await ports.store.transact(command, async (state) => {
      const available = await ports.quota.check();
      if (!available.ok)
        return available.error.code === "SERVICE_LIMIT"
          ? failure("SERVICE_LIMIT", command.commandId)
          : available;
      const transition = decide(state, ports.clock.now());
      if (!transition.ok) return transition;
      const { state: next, events, deadlines } = transition.value;
      if (
        next.id !== state.id ||
        next.version !== state.version + 1 ||
        events.length !== 1 ||
        events.some(
          (event) =>
            !event.id ||
            event.schemaVersion !== 1 ||
            event.aggregateId !== state.id ||
            event.version !== next.version,
        ) ||
        deadlines.some(
          (job) =>
            job.aggregateId !== state.id ||
            job.expectedVersion !== next.version,
        )
      )
        return failure("INTERNAL_ERROR");
      return transition;
    });
    return committed.ok ? success(committed.value.result) : committed;
  } catch {
    // Never return database/provider messages or automatically repeat a non-idempotent command.
    return failure("TEMPORARY_UNAVAILABLE");
  }
}
