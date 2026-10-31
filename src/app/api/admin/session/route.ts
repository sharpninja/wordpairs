import { permissions } from "../../../../domain/access";
import { failure } from "../../../../domain/result";
import { getAdminIdentityService } from "../../../../infrastructure/runtime";
import { adminSession } from "../../../../web/admin-session";
import {
  cookie,
  errorResponse,
  PRIVATE_HEADERS,
  sameOrigin,
  sessionCookie,
  uiSessionGeneration,
} from "../../../../web/server-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const current = await adminSession(request);
  return current.ok
    ? Response.json(
        {
          profile: current.value.profile,
          permissions: permissions(current.value.actor).filter(
            (permission) => permission !== "manage-users",
          ),
          sessionGeneration: uiSessionGeneration(cookie(request, "wp_admin")),
        },
        { headers: PRIVATE_HEADERS },
      )
    : errorResponse(current);
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const service = getAdminIdentityService();
  if (!service) return errorResponse(failure("NOT_AUTHENTICATED"));
  const result = await service.logout(cookie(request, "wp_admin"));
  return result.ok
    ? new Response(null, {
        status: 204,
        headers: {
          ...PRIVATE_HEADERS,
          "Set-Cookie": sessionCookie(request, "wp_admin", "", 0),
        },
      })
    : errorResponse(result);
}
