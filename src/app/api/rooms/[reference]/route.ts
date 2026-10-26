import { failure } from "../../../../domain/result";
import {
  advanceLobbyDeadlines,
  deliverOutbox,
  getIdentityService,
  getInvitationSigner,
  getRoomServices,
} from "../../../../infrastructure/runtime";
import { secrets } from "../../../../infrastructure/secrets";
import {
  appOrigin,
  cookie,
  errorResponse,
  jsonInput,
  PRIVATE_HEADERS,
  sameOrigin,
} from "../../../../web/server-http";
export const runtime = "nodejs";
type Context = { params: Promise<{ reference: string }> };
async function context(request: Request, route: Context) {
  const identity = getIdentityService();
  const rooms = getRoomServices();
  if (!identity || !rooms) return failure("TEMPORARY_UNAVAILABLE");
  const sessionToken = cookie(request, "wp_session");
  const session = await identity.session(sessionToken);
  if (!session.ok) return session;
  const { reference } = await route.params;
  await advanceLobbyDeadlines();
  const invite = new URL(request.url).searchParams.get("invite");
  if (invite && !getInvitationSigner()?.verify(invite))
    return failure("NOT_FOUND");
  const resolved = await rooms.service.resolve(
    reference,
    session.value.actor.profileId,
    secrets.hash(sessionToken as string),
    invite ? secrets.hash(invite) : null,
  );
  return resolved.ok
    ? {
        ok: true as const,
        value: { ...rooms, session: session.value, resolved: resolved.value },
      }
    : resolved;
}
export async function GET(request: Request, route: Context) {
  const current = await context(request, route);
  if (!current.ok) return errorResponse(current);
  const result = await current.value.service.view(
    current.value.resolved.room,
    current.value.session.actor.profileId,
  );
  if (result.ok) await deliverOutbox();
  return result.ok
    ? Response.json(
        {
          ...result.value,
          actorId: current.value.session.actor.profileId,
          inviterId: current.value.resolved.inviterId,
        },
        { headers: PRIVATE_HEADERS },
      )
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
      (key) =>
        ![
          "action",
          "commandId",
          "expectedVersion",
          "expectedProfileId",
          "mode",
          "inviterId",
        ].includes(key),
    )
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  const { session, resolved, service, repository } = current.value;
  if (input.expectedProfileId !== session.actor.profileId)
    return errorResponse(failure("CONFLICT"));
  if (input.action === "invite") {
    const origin = appOrigin(request);
    if (!origin) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
    const signer = getInvitationSigner();
    if (!signer) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
    const token = signer.mint();
    const result = await repository.invite(
      resolved.room.id,
      session.actor.profileId,
      secrets.hash(token),
    );
    if (result.ok) await deliverOutbox();
    return result.ok
      ? Response.json(
          {
            url: new URL(`/rooms/${resolved.room.code}?invite=${token}`, origin)
              .href,
          },
          { headers: PRIVATE_HEADERS },
        )
      : errorResponse(result);
  }
  if (
    input.action !== "join" ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    (input.expectedVersion as number) < 0 ||
    !["player", "observer"].includes(input.mode as string) ||
    (input.inviterId !== undefined && typeof input.inviterId !== "string")
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  const inviterId = resolved.inviterId ?? (input.inviterId as string) ?? null;
  const result = await service.join(
    {
      aggregateId: resolved.room.id,
      actorId: session.actor.profileId,
      commandId: input.commandId,
      expectedVersion: input.expectedVersion as number,
      requestDigest: secrets.hash(JSON.stringify([input.mode, inviterId])),
    },
    input.mode as "player" | "observer",
    inviterId,
  );
  if (result.ok) await deliverOutbox();
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
