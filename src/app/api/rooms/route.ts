import { failure } from "../../../domain/result";
import { isRoomId } from "../../../domain/rooms";
import {
  deliverOutbox,
  getIdentityService,
  getRoomServices,
} from "../../../infrastructure/runtime";
import { secrets } from "../../../infrastructure/secrets";
import {
  cookie,
  errorResponse,
  jsonInput,
  PRIVATE_HEADERS,
  sameOrigin,
} from "../../../web/server-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const identity = getIdentityService();
  const rooms = getRoomServices();
  if (!identity || !rooms)
    return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const session = await identity.session(cookie(request, "wp_session"));
  if (!session.ok) return errorResponse(session);
  const input = await jsonInput(request);
  if (
    !input ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    Object.keys(input).some(
      (key) =>
        ![
          "action",
          "commandId",
          "expectedProfileId",
          "roomId",
          "capacity",
          "discoverable",
        ].includes(key),
    )
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  if (input.expectedProfileId !== session.value.actor.profileId)
    return errorResponse(failure("CONFLICT"));
  if (input.action === "quick-match") {
    const result = await rooms.service.quickMatch(
      session.value.actor.profileId,
      input.commandId,
      secrets.hash("quick-match"),
    );
    if (result.ok) await deliverOutbox();
    return result.ok
      ? Response.json(result.value, { headers: PRIVATE_HEADERS })
      : errorResponse(result);
  }
  if (
    input.action !== "create" ||
    typeof input.roomId !== "string" ||
    !isRoomId(input.roomId)
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  const result = await rooms.service.create(
    {
      aggregateId: input.roomId,
      actorId: session.value.actor.profileId,
      commandId: input.commandId,
      expectedVersion: 0,
      requestDigest: secrets.hash(
        JSON.stringify([
          input.roomId,
          input.capacity,
          input.discoverable ?? false,
        ]),
      ),
    },
    input.capacity,
    input.discoverable ?? false,
  );
  if (result.ok) await deliverOutbox();
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
