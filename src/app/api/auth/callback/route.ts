import { getIdentityService } from "../../../../infrastructure/runtime";
import {
  appOrigin,
  cookie,
  PRIVATE_HEADERS,
  sessionCookie,
} from "../../../../web/server-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const service = getIdentityService();
  const params = new URL(request.url).searchParams;
  const result = await service?.completeLogin(
    cookie(request, "wp_login"),
    params.getAll("code").length === 1 ? params.get("code") : null,
    params.getAll("state").length === 1 ? params.get("state") : null,
  );
  const origin = appOrigin(request);
  if (!origin)
    return Response.json(
      { error: { code: "TEMPORARY_UNAVAILABLE" } },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  const headers = new Headers({
    ...PRIVATE_HEADERS,
    Location: new URL(result?.ok ? "/play" : "/play?auth=failed", origin).href,
  });
  headers.append("Set-Cookie", sessionCookie(request, "wp_login", "", 0));
  if (result?.ok)
    headers.append(
      "Set-Cookie",
      sessionCookie(request, "wp_session", result.value.sessionToken, 86400),
    );
  return new Response(null, { status: 302, headers });
}
