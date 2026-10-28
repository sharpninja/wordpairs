import { afterEach, describe, expect, it, vi } from "vitest";
import { getRealtimeSettings } from "../../src/infrastructure/runtime";

afterEach(() => vi.unstubAllEnvs());
describe("managed integration secrets remain server-only", () => {
  it("uses write-only Vercel Supabase secret names without copying their values", () => {
    vi.stubEnv("WORDPAIRS_SUPABASE_URL", "https://fixture.supabase.co");
    vi.stubEnv("WORDPAIRS_SUPABASE_ANON_KEY", "sb_publishable_fixture");
    vi.stubEnv("WORDPAIRS_SUPABASE_SERVICE_KEY", undefined);
    vi.stubEnv("WORDPAIRS_SUPABASE_JWT_SECRET", undefined);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_fixture");
    vi.stubEnv("SUPABASE_JWT_SECRET", "s".repeat(40));
    expect(getRealtimeSettings()).toMatchObject({ serviceKey: "sb_secret_fixture", jwtSecret: "s".repeat(40) });
  });
  it("retains explicit configuration precedence and fails closed on absent secrets", () => {
    vi.stubEnv("WORDPAIRS_SUPABASE_URL", "https://fixture.supabase.co");
    vi.stubEnv("WORDPAIRS_SUPABASE_ANON_KEY", "sb_publishable_fixture");
    vi.stubEnv("WORDPAIRS_SUPABASE_SERVICE_KEY", "sb_secret_explicit");
    vi.stubEnv("WORDPAIRS_SUPABASE_JWT_SECRET", "e".repeat(40));
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_other");
    vi.stubEnv("SUPABASE_JWT_SECRET", "o".repeat(40));
    expect(getRealtimeSettings()?.serviceKey).toBe("sb_secret_explicit");
    vi.stubEnv("WORDPAIRS_SUPABASE_SERVICE_KEY", undefined);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    expect(getRealtimeSettings()).toBeNull();
  });
});
