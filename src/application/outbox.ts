import { type Result, success } from "../domain/result";
import type { EventOutbox, RealtimePublisher } from "./ports";
/** At-least-once notifications; a failed publication stays durable for the next delivery. */
export class OutboxRelay {
  constructor(
    private outbox: EventOutbox,
    private publisher: RealtimePublisher,
    private now: () => number,
  ) {}
  async drain(limit = 5): Promise<Result<number>> {
    const pending = await this.outbox.pending(limit);
    if (!pending.ok) return pending;
    let sent = 0;
    for (const event of pending.value) {
      const result = await this.publisher.publish(event);
      if (!result.ok) return result;
      const marked = await this.outbox.markPublished(event.id, this.now());
      if (!marked.ok) return marked;
      sent++;
    }
    return success(sent);
  }
}
