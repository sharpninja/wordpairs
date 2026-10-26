import type { Failure } from "../domain/result";
export const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};
export function errorResponse(result: Failure) {
  const code = result.error.code;
  const status =
    code === "VALIDATION_ERROR"
      ? 400
      : code === "NOT_AUTHENTICATED"
        ? 401
        : code === "NOT_AUTHORIZED"
          ? 403
          : code === "NOT_FOUND"
            ? 404
            : code === "CONFLICT" ||
                code === "IDEMPOTENCY_CONFLICT" ||
                code === "ROOM_FULL" ||
                code === "ROOM_CLOSED"
              ? 409
              : code === "RATE_LIMITED"
                ? 429
                : 503;
  return Response.json(
    { error: result.error },
    { status, headers: PRIVATE_HEADERS },
  );
}
export function appOrigin(request: Request): string | null {
  try {
    const origin = new URL(
      process.env.WORDPAIRS_ORIGIN ??
        (process.env.NODE_ENV === "production" ? "" : request.url),
    );
    return origin.origin;
  } catch {
    return null;
  }
}
export function sameOrigin(request: Request) {
  const origin = appOrigin(request);
  return (
    origin !== null &&
    request.headers.get("Origin") === origin &&
    request.headers.get("Sec-Fetch-Site") !== "cross-site"
  );
}
export function cookie(request: Request, name: "wp_session" | "wp_login") {
  return (
    request.headers
      .get("Cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}
export function sessionCookie(
  request: Request,
  name: "wp_session" | "wp_login",
  value: string,
  maxAge: number,
) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${appOrigin(request)?.startsWith("https:") ? "; Secure" : ""}`;
}
export async function jsonInput(
  request: Request,
): Promise<Record<string, unknown> | null> {
  if (
    request.headers.get("Content-Type")?.split(";")[0].trim() !==
    "application/json"
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 16384) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const combined = new Uint8Array(length);
    let offset = 0;
    for (const value of chunks) {
      combined.set(value, offset);
      offset += value.length;
    }
    const input = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(combined),
    );
    return input && typeof input === "object" && !Array.isArray(input)
      ? input
      : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
