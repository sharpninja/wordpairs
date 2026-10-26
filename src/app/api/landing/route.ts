import { getPublicService } from "../../../infrastructure/runtime";

export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  const service = getPublicService();
  if (!service)
    return Response.json(
      { error: { code: "TEMPORARY_UNAVAILABLE" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const params = new URL(request.url).searchParams;
  const result = await service.read(
    params.get("leaderboardCursor"),
    params.get("lobbyCursor"),
    {
      minLeaderboardRevision: params.get("minLeaderboardRevision"),
      minLobbyRevision: params.get("minLobbyRevision"),
      fresh: params.get("fresh") === "1",
    },
  );
  if (!result.ok)
    return Response.json(
      { error: result.error },
      {
        status:
          result.error.code === "VALIDATION_ERROR"
            ? 400
            : result.error.code === "CONFLICT"
              ? 409
              : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  return Response.json(result.value.projection, {
    headers: {
      "Cache-Control": "no-store",
      "X-Leaderboard-Revision": String(result.value.leaderboard.revision),
      "X-Lobby-Revision": String(result.value.lobbies.revision),
      ...(result.value.leaderboard.next
        ? { "X-Leaderboard-Next": result.value.leaderboard.next }
        : {}),
      ...(result.value.lobbies.next
        ? { "X-Lobby-Next": result.value.lobbies.next }
        : {}),
    },
  });
}
