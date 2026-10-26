import { failure } from "../../../domain/result";
import { realtimeAccess } from "../../../infrastructure/realtime";
import {
  deliverOutbox,
  getIdentityService,
  getRealtimeSettings,
} from "../../../infrastructure/runtime";
import {
  cookie,
  errorResponse,
  PRIVATE_HEADERS,
} from "../../../web/server-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const identity = getIdentityService();
  const settings = getRealtimeSettings();
  if (!identity || !settings)
    return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const session = await identity.session(cookie(request, "wp_session"));
  if (!session.ok) return errorResponse(session);
  await deliverOutbox();
  return Response.json(
    realtimeAccess(settings, session.value.actor.profileId, Date.now()),
    { headers: PRIVATE_HEADERS },
  );
}
