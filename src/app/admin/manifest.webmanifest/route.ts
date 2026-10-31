import adminManifest from "../../../web/admin-manifest";
export async function GET() {
  return Response.json(adminManifest(), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=60",
    },
  });
}
