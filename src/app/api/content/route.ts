import { CONTENT_ID } from "../../../domain/content";
import { failure } from "../../../domain/result";
import {
  advanceLobbyDeadlines,
  deliverOutbox,
  getContentService,
} from "../../../infrastructure/runtime";
import { secrets } from "../../../infrastructure/secrets";
import { adminSession } from "../../../web/admin-session";
import { contentAction } from "../../../web/content-input";
import {
  errorResponse,
  jsonInput,
  PRIVATE_HEADERS,
  sameOrigin,
} from "../../../web/server-http";
export const runtime = "nodejs";
async function context(request: Request) {
  const session = await adminSession(request);
  if (!session.ok) return session;
  const service = getContentService(session.value.actor.profileId);
  if (!service) return failure("TEMPORARY_UNAVAILABLE");
  return session.ok
    ? {
        ok: true as const,
        value: { service, actorId: session.value.actor.profileId },
      }
    : session;
}
export async function GET(request: Request) {
  const current = await context(request);
  if (!current.ok) return errorResponse(current);
  const result = await current.value.service.view(current.value.actorId);
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const current = await context(request);
  if (!current.ok) return errorResponse(current);
  const input = await jsonInput(request);
  if (
    !input ||
    typeof input.expectedProfileId !== "string" ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    (input.expectedVersion as number) < 0
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  if (input.expectedProfileId !== current.value.actorId)
    return errorResponse(failure("CONFLICT"));
  const action = contentAction(input);
  if (!action) return errorResponse(failure("VALIDATION_ERROR"));
  if (action.type === "nominate") await advanceLobbyDeadlines();
  const result = await current.value.service.act(
    {
      aggregateId: CONTENT_ID,
      actorId: current.value.actorId,
      commandId: input.commandId,
      requestDigest: secrets.hash(JSON.stringify(action)),
      expectedVersion: input.expectedVersion as number,
    },
    action,
  );
  await deliverOutbox();
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
