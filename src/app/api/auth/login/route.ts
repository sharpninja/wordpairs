import { PRIVATE_HEADERS } from "../../../../web/server-http";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(
    { error: { code: "NOT_FOUND" } },
    { status: 404, headers: PRIVATE_HEADERS },
  );
}
