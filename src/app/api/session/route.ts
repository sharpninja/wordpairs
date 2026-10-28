import { failure } from "../../../domain/result";
import {
  getIdentityService,
  oidcAvailable,
} from "../../../infrastructure/runtime";
import {
  cookie,
  errorResponse,
  jsonInput,
  PRIVATE_HEADERS,
  sameOrigin,
  sessionCookie,
  uiSessionGeneration,
} from "../../../web/server-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const service = getIdentityService();
  if (!service) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const result = await service.session(cookie(request, "wp_session"));
  return result.ok
    ? Response.json(
        {
          profile: result.value.profile,
          oidcAvailable: oidcAvailable(),
          sessionGeneration: uiSessionGeneration(cookie(request, "wp_session")),
        },
        { headers: PRIVATE_HEADERS },
      )
    : errorResponse(result);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const input = await jsonInput(request);
  if (!input || Object.keys(input).some((key) => key !== "guestCredential"))
    return errorResponse(failure("VALIDATION_ERROR"));
  const service = getIdentityService();
  if (!service) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const result = await service.guest(input.guestCredential);
  return result.ok
    ? Response.json(
        {
          profile: result.value.profile,
          guestCredential: result.value.guestCredential,
          sessionGeneration: uiSessionGeneration(result.value.sessionToken),
        },
        {
          headers: {
            ...PRIVATE_HEADERS,
            "Set-Cookie": sessionCookie(
              request,
              "wp_session",
              result.value.sessionToken,
              2592000,
            ),
          },
        },
      )
    : errorResponse(result);
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return errorResponse(failure("NOT_AUTHORIZED"));
  const service = getIdentityService();
  if (!service) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const result = await service.logout(cookie(request, "wp_session"));
  return result.ok
    ? new Response(null, {
        status: 204,
        headers: {
          ...PRIVATE_HEADERS,
          "Set-Cookie": sessionCookie(request, "wp_session", "", 0),
        },
      })
    : errorResponse(result);
}
