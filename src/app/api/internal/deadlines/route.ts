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
  const result = await advanceLobbyDeadlines();
  if (!result) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  if (!result.ok) return errorResponse(result);
  await deliverOutbox();
  return Response.json({ applied: result.value }, { headers: PRIVATE_HEADERS });
}
