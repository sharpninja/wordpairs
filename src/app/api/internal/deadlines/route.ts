import { timingSafeEqual } from "node:crypto";
import { failure } from "../../../../domain/result";
import {
  advanceLobbyDeadlines,
  deliverOutbox,
} from "../../../../infrastructure/runtime";
import { errorResponse, PRIVATE_HEADERS } from "../../../../web/server-http";
export const runtime = "nodejs";
/** Deployment wires a server-only scheduler credential in Phase 7. */
export async function POST(request: Request) {
  const secret = process.env.WORDPAIRS_SCHEDULER_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (
    !secret ||
    secret.length < 32 ||
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  )
    return errorResponse(failure("NOT_AUTHORIZED"));
  // A deadline failure must not starve independently committed notifications.
  const deadlines = await advanceLobbyDeadlines().catch(() => null);
  const published = await deliverOutbox(25).catch(() => undefined);
  const result = {
    deadlines: deadlines?.ok
      ? { ok: true, applied: deadlines.value }
      : { ok: false, error: deadlines?.error.code ?? "TEMPORARY_UNAVAILABLE" },
    outbox: published?.ok
      ? { ok: true, published: published.value }
      : { ok: false, error: published?.error.code ?? "TEMPORARY_UNAVAILABLE" },
  };
  return Response.json(result, {
    status: result.deadlines.ok && result.outbox.ok ? 200 : 503,
    headers: PRIVATE_HEADERS,
  });
}
