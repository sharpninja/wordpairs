import { REACTIONS } from "../../../../../domain/reactions";
import { failure } from "../../../../../domain/result";
import { isRoomId } from "../../../../../domain/rooms";
import {
  advanceLobbyDeadlines,
  deliverOutbox,
  getIdentityService,
  getReactionService,
} from "../../../../../infrastructure/runtime";
import { secrets } from "../../../../../infrastructure/secrets";
import {
  cookie,
  errorResponse,
  jsonInput,
  PRIVATE_HEADERS,
  sameOrigin,
} from "../../../../../web/server-http";
export const runtime = "nodejs";
type Context = { params: Promise<{ reference: string }> };
async function context(request: Request, route: Context) {
  const identity = getIdentityService();
  const service = getReactionService();
  if (!identity || !service) return failure("TEMPORARY_UNAVAILABLE");
  const session = await identity.session(cookie(request, "wp_session"));
  if (!session.ok) return session;
  const { reference } = await route.params;
  if (!isRoomId(reference)) return failure("NOT_FOUND");
  await advanceLobbyDeadlines();
  return {
    ok: true as const,
    value: {
      service,
      roomId: reference,
      actorId: session.value.actor.profileId,
    },
  };
}
export async function GET(request: Request, route: Context) {
  const current = await context(request, route);
  if (!current.ok) return errorResponse(current);
  const { service, roomId, actorId } = current.value;
  const result = await service.view(roomId, actorId);
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
export async function POST(request: Request, route: Context) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const current = await context(request, route);
  if (!current.ok) return errorResponse(current);
  const input = await jsonInput(request);
  if (
    !input ||
    Object.keys(input).some(
      (k) =>
        ![
          "expectedProfileId",
          "expectedVersion",
          "commandId",
          "emoji",
        ].includes(k),
    ) ||
    typeof input.expectedProfileId !== "string" ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    (input.expectedVersion as number) < 0 ||
    !REACTIONS.some((e) => e === input.emoji)
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  if (input.expectedProfileId !== current.value.actorId)
    return errorResponse(failure("CONFLICT"));
  const result = await current.value.service.send(
    {
      aggregateId: current.value.roomId,
      actorId: current.value.actorId,
      commandId: input.commandId,
      expectedVersion: input.expectedVersion as number,
      requestDigest: secrets.hash(JSON.stringify(input.emoji)),
    },
    input.emoji as string,
  );
  await deliverOutbox();
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
