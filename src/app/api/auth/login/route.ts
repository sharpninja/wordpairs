import { failure } from "../../../../domain/result";
import { getIdentityService } from "../../../../infrastructure/runtime";
import {
  errorResponse,
  PRIVATE_HEADERS,
  sessionCookie,
} from "../../../../web/server-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const service = getIdentityService();
  if (!service) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const result = await service.beginLogin();
  return result.ok
    ? new Response(null, {
        status: 302,
        headers: {
          ...PRIVATE_HEADERS,
          Location: result.value.url,
          "Set-Cookie": sessionCookie(
            request,
            "wp_login",
            result.value.browserToken,
            600,
          ),
        },
      })
    : errorResponse(result);
}
