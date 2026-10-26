import type { LobbyAction } from "../../../../../application/lobby";
import { failure } from "../../../../../domain/result";
import { isRoomId } from "../../../../../domain/rooms";
import {
  advanceLobbyDeadlines,
  deliverOutbox,
  getIdentityService,
  getRoomServices,
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
export async function POST(
  request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const identity = getIdentityService();
  const rooms = getRoomServices();
  if (!identity || !rooms)
    return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const session = await identity.session(cookie(request, "wp_session"));
  if (!session.ok) return errorResponse(session);
  const { reference } = await context.params;
  const input = await jsonInput(request);
  if (
    !input ||
    !isRoomId(reference) ||
    Object.keys(input).some(
      (key) =>
        ![
          "action",
          "ready",
          "connected",
          "commandId",
          "expectedVersion",
          "expectedProfileId",
        ].includes(key),
    ) ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    (input.expectedVersion as number) < 0
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  if (input.expectedProfileId !== session.value.actor.profileId)
    return errorResponse(failure("CONFLICT"));
  let action: LobbyAction;
  if (
    input.action === "ready" &&
    typeof input.ready === "boolean" &&
    input.connected === undefined
  )
    action = { type: "ready", ready: input.ready };
  else if (
    input.action === "leave" &&
    input.ready === undefined &&
    input.connected === undefined
  )
    action = { type: "leave" };
  else if (
    input.action === "presence" &&
    typeof input.connected === "boolean" &&
    input.ready === undefined
  )
    action = { type: "presence", connected: input.connected };
  else return errorResponse(failure("VALIDATION_ERROR"));
  await advanceLobbyDeadlines();
  const result = await rooms.lobby.act(
    {
      aggregateId: reference,
      actorId: session.value.actor.profileId,
      commandId: input.commandId,
      expectedVersion: input.expectedVersion as number,
      requestDigest: secrets.hash(JSON.stringify(action)),
    },
    action,
  );
  // Catch-up deadlines may commit even when the requested late action is rejected.
  await deliverOutbox();
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
