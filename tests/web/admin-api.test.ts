import { expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ access: vi.fn() }));
vi.mock("../../src/infrastructure/runtime", () => ({ getAccessService: storage.access }));
import { GET, POST } from "../../src/app/api/admin/users/route";
it("fixed-owner release disables account delegation without reading or writing storage", async () => {
  const request = new Request("https://wordpairs.test/api/admin/users");
  expect((await GET(request)).status).toBe(404);
  expect((await POST(request)).status).toBe(404);
  expect((await GET(request)).headers.get("Cache-Control")).toBe("no-store");
  expect(storage.access).not.toHaveBeenCalled();
});
