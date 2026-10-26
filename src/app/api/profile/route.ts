import { failure } from "../../../domain/result";
import {
  deliverOutbox,
  getIdentityService,
  getProfileStore,
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
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const service = getIdentityService();
  const store = getProfileStore();
  if (!service || !store)
    return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const session = await service.session(cookie(request, "wp_session"));
  if (!session.ok) return errorResponse(session);
  const input = await jsonInput(request);
  if (
    !input ||
    Object.keys(input).some(
      (key) =>
        ![
          "commandId",
          "expectedVersion",
          "expectedProfileId",
          "icon",
          "publicLeaderboard",
          "regenerateAlias",
        ].includes(key),
    ) ||
    typeof input.expectedProfileId !== "string" ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    (input.expectedVersion as number) < 0
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  if (input.expectedProfileId !== session.value.actor.profileId)
    return errorResponse(failure("CONFLICT"));
  const preferences = {
    icon: input.icon,
    publicLeaderboard: input.publicLeaderboard,
    regenerateAlias: input.regenerateAlias,
  };
  const profileId = session.value.actor.profileId;
  const result = await service.preferences(
    {
      aggregateId: profileId,
      actorId: profileId,
      commandId: input.commandId,
      expectedVersion: input.expectedVersion as number,
      requestDigest: secrets.hash(
        JSON.stringify([
          input.icon ?? null,
          input.publicLeaderboard ?? null,
          input.regenerateAlias ?? null,
        ]),
      ),
    },
    session.value.actor,
    preferences,
    store,
  );
  if (result.ok) await deliverOutbox();
  return result.ok
    ? Response.json({ profile: result.value }, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
