import { CONTENT_ID } from "../../../domain/content";
import { failure } from "../../../domain/result";
import {
  advanceLobbyDeadlines,
  deliverOutbox,
  getContentService,
  getIdentityService,
} from "../../../infrastructure/runtime";
import { secrets } from "../../../infrastructure/secrets";
import { contentAction } from "../../../web/content-input";
import {
  cookie,
  errorResponse,
  jsonInput,
  PRIVATE_HEADERS,
  sameOrigin,
} from "../../../web/server-http";
export const runtime = "nodejs";
async function context(request: Request) {
  const identity = getIdentityService();
  const service = getContentService();
  if (!identity || !service) return failure("TEMPORARY_UNAVAILABLE");
  const session = await identity.session(cookie(request, "wp_session"));
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
