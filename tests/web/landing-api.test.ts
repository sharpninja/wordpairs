import { beforeEach, expect, it, vi } from "vitest";
import { success } from "../../src/domain/result";
const mocks = vi.hoisted(()=>({ read:vi.fn() }));
vi.mock("../../src/infrastructure/runtime",()=>({ getPublicService:()=>({read:mocks.read}) }));
import { GET } from "../../src/app/api/landing/route";
beforeEach(()=>{mocks.read.mockReset();});
it("keeps freshness ownership in the bounded server cache without extending it through downstream caching", async () => {
  const projection = {leaderboard:[],lobbies:[],rules:{version:"2.6",updated:"2026-10-26"}};
  mocks.read.mockResolvedValue(success({projection,leaderboard:{revision:2,next:"1:leaderboard:2:25"},lobbies:{revision:3,next:null}}));
  const response = await GET(new Request("https://wordpairs.test/api/landing"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(response.headers.get("X-Leaderboard-Next")).toBe('1:leaderboard:2:25');
  expect(await response.json()).toEqual(projection);
});
