import { PRIVATE_HEADERS } from "../../../../web/server-http";
export const runtime = "nodejs";
// This release has one GitHub owner; browser role grants cannot add another.
export async function GET(_request: Request) {
  return Response.json(
    { error: { code: "NOT_FOUND" } },
    { status: 404, headers: PRIVATE_HEADERS },
  );
}
export async function POST(_request: Request) {
  return Response.json(
    { error: { code: "NOT_FOUND" } },
    { status: 404, headers: PRIVATE_HEADERS },
  );
}
