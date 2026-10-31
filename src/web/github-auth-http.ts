import { failure } from "../domain/result";
import { getAdminIdentityService } from "../infrastructure/runtime";
import {
  appOrigin,
  cookie,
  errorResponse,
  PRIVATE_HEADERS,
  sessionCookie,
} from "./server-http";

export async function githubLogin(request: Request) {
  const service = getAdminIdentityService();
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
            "wp_admin_login",
            result.value.browserToken,
            600,
          ),
        },
      })
    : errorResponse(result);
}
export async function githubCallback(request: Request) {
  const origin = appOrigin(request);
  if (!origin) return errorResponse(failure("TEMPORARY_UNAVAILABLE"));
  const params = new URL(request.url).searchParams;
  const service = getAdminIdentityService();
  const result = await service?.completeLogin(
    cookie(request, "wp_admin_login"),
    !params.has("error") && params.getAll("code").length === 1
      ? params.get("code")
      : null,
    params.getAll("state").length === 1 ? params.get("state") : null,
  );
  const headers = new Headers({
    ...PRIVATE_HEADERS,
    Location: new URL(result?.ok ? "/admin" : "/admin?auth=failed", origin)
      .href,
  });
  headers.append("Set-Cookie", sessionCookie(request, "wp_admin_login", "", 0));
  if (result?.ok)
    headers.append(
      "Set-Cookie",
      sessionCookie(request, "wp_admin", result.value.sessionToken, 86400),
    );
  return new Response(null, { status: 302, headers });
}
