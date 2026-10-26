import type { MatchAction } from "../../../../../application/matches";
import { failure } from "../../../../../domain/result";
import { isRoomId, roomRole } from "../../../../../domain/rooms";
import {
  advanceLobbyDeadlines,
  deliverOutbox,
  getIdentityService,
  getMatchServices,
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
type Context = { params: Promise<{ reference: string }> };
async function context(request: Request, route: Context, allowReplay = false) {
  const identity = getIdentityService();
  const rooms = getRoomServices();
  const matches = getMatchServices();
  if (!identity || !rooms || !matches) return failure("TEMPORARY_UNAVAILABLE");
  const session = await identity.session(cookie(request, "wp_session"));
  if (!session.ok) return session;
  const { reference } = await route.params;
  if (!isRoomId(reference)) return failure("NOT_FOUND");
  await advanceLobbyDeadlines();
  const room = await rooms.repository.get(reference);
  if (!room.ok) return room;
  const role = roomRole(room.value, session.value.actor.profileId);
  if (!role && !allowReplay) return failure("NOT_AUTHORIZED");
  return {
    ok: true as const,
    value: {
      room: room.value,
      role,
      rooms,
      matches,
      actorId: session.value.actor.profileId,
    },
  };
}
export async function GET(request: Request, route: Context) {
  const current = await context(request, route);
  if (!current.ok) return errorResponse(current);
  const { room, actorId, rooms, matches, role } = current.value;
  const result = await matches.service.view(room, actorId);
  if (!result.ok) return errorResponse(result);
  const labels = await rooms.repository.labels(
    result.value.scorecard.map((p) => p.profileId),
  );
  if (!labels.ok) return errorResponse(labels);
  await deliverOutbox();
  return Response.json(
    {
      ...result.value,
      actorId,
      role,
      serverNow: Date.now(),
      labels: labels.value.map((p) => ({
        id: p.id,
        alias: p.alias,
        icon: p.icon,
      })),
    },
    { headers: PRIVATE_HEADERS },
  );
}
function action(input: Record<string, unknown>): MatchAction | null {
  if (
    input.action === "choose" &&
    typeof input.categoryId === "string" &&
    /^[a-z0-9-]{1,128}$/.test(input.categoryId) &&
    input.roundId === undefined &&
    input.stage === undefined &&
    input.answer === undefined
  )
    return { type: "choose", categoryId: input.categoryId };
  if (
    input.action === "continue" &&
    [input.categoryId, input.roundId, input.stage, input.answer].every(
      (v) => v === undefined,
    )
  )
    return { type: "continue" };
  if (
    input.action === "answer" &&
    input.categoryId === undefined &&
    typeof input.roundId === "string" &&
    /^[A-Za-z0-9_-]{1,128}$/.test(input.roundId) &&
    Number.isInteger(input.stage) &&
    (input.stage as number) >= 0 &&
    (input.stage as number) <= 3 &&
    typeof input.answer === "string" &&
    input.answer.length <= 2000
  )
    return {
      type: "answer",
      roundId: input.roundId,
      stage: input.stage as number,
      answer: input.answer,
    };
  return null;
}
export async function POST(request: Request, route: Context) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  // The transaction permits an exact authenticated replay before checking current
  // membership. New commands still require current player authority under its lock.
  const current = await context(request, route, true);
  if (!current.ok) return errorResponse(current);
  const input = await jsonInput(request);
  if (
    !input ||
    Object.keys(input).some(
      (key) =>
        ![
          "action",
          "categoryId",
          "roundId",
          "stage",
          "answer",
          "expectedProfileId",
          "expectedVersion",
          "commandId",
        ].includes(key),
    ) ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    (input.expectedVersion as number) < 0
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  if (input.expectedProfileId !== current.value.actorId)
    return errorResponse(failure("CONFLICT"));
  const intent = action(input);
  if (!intent) return errorResponse(failure("VALIDATION_ERROR"));
  const result = await current.value.matches.service.act(
    {
      aggregateId: current.value.room.id,
      actorId: current.value.actorId,
      commandId: input.commandId,
      expectedVersion: input.expectedVersion as number,
      requestDigest: secrets.hash(JSON.stringify(intent)),
    },
    intent,
  );
  await deliverOutbox();
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
