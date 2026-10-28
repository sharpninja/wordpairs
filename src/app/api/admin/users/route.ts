import {
  allowed,
  MANAGED_ROLES,
  type ManagedRole,
} from "../../../../domain/access";
import { failure } from "../../../../domain/result";
import {
  getAccessService,
  getIdentityService,
} from "../../../../infrastructure/runtime";
import { secrets } from "../../../../infrastructure/secrets";
import {
  cookie,
  errorResponse,
  jsonInput,
  PRIVATE_HEADERS,
  sameOrigin,
} from "../../../../web/server-http";
export const runtime = "nodejs";
async function context(request: Request) {
  const identity = getIdentityService();
  const service = getAccessService();
  if (!identity || !service) return failure("TEMPORARY_UNAVAILABLE");
  const session = await identity.session(cookie(request, "wp_session"));
  if (!session.ok) return session;
  if (!allowed(session.value.actor, "manage-users"))
    return failure("NOT_AUTHORIZED");
  return {
    ok: true as const,
    value: { service, actorId: session.value.actor.profileId },
  };
}
export async function GET(request: Request) {
  const current = await context(request);
  if (!current.ok) return errorResponse(current);
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((key) => key !== "search"))
    return errorResponse(failure("VALIDATION_ERROR"));
  const result = await current.value.service.view(
    current.value.actorId,
    query.get("search") ?? "",
  );
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
    Object.keys(input).some(
      (key) =>
        ![
          "expectedProfileId",
          "expectedVersion",
          "commandId",
          "profileId",
          "role",
          "grant",
          "reason",
        ].includes(key),
    ) ||
    typeof input.commandId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.commandId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    (input.expectedVersion as number) < 0 ||
    typeof input.profileId !== "string" ||
    typeof input.role !== "string" ||
    !MANAGED_ROLES.includes(input.role as ManagedRole) ||
    typeof input.grant !== "boolean" ||
    typeof input.reason !== "string"
  )
    return errorResponse(failure("VALIDATION_ERROR"));
  if (input.expectedProfileId !== current.value.actorId)
    return errorResponse(failure("CONFLICT"));
  const action = {
    profileId: input.profileId,
    role: input.role as ManagedRole,
    grant: input.grant,
    reason: input.reason,
  };
  const result = await current.value.service.act(
    {
      aggregateId: "access-control",
      actorId: current.value.actorId,
      commandId: input.commandId,
      expectedVersion: input.expectedVersion as number,
      requestDigest: secrets.hash(JSON.stringify(action)),
    },
    action,
  );
  return result.ok
    ? Response.json(result.value, { headers: PRIVATE_HEADERS })
    : errorResponse(result);
}
