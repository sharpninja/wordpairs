import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { GithubAdminProvider } from "../../src/infrastructure/github-admin";

const settings = { clientId: "fixture-client", clientSecret: "fixture-secret", redirectUri: "https://wordpairs.example.test/api/auth/github/callback" };
const challenge = { state: "s".repeat(43), nonce: "n".repeat(43), pkceVerifier: "v".repeat(43) };
const callback = { code: "fixture-code", state: challenge.state, expectedState: challenge.state, nonce: challenge.nonce, pkceVerifier: challenge.pkceVerifier };
describe("private GitHub administrator identity, isolated provider fixtures", () => {
  it("requests identity with state/S256 and exact callback without repository/email scopes", async () => {
    const result = await new GithubAdminProvider(settings).authorization(challenge);
    if (!result.ok) throw new Error("Authorization failed");
    const url = new URL(result.value);
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ state: challenge.state, redirect_uri: settings.redirectUri,
      client_id: settings.clientId, login: "sharpninja", allow_signup: "false", code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(challenge.pkceVerifier).digest("base64url") });
    expect(url.searchParams.has("scope")).toBe(false);
    expect(url.href).not.toContain(settings.clientSecret);
  });
  it("accepts only server-verified owner ID/login and discards provider credentials", async () => {
    const transport = vi.fn().mockResolvedValueOnce(Response.json({ token_type: "bearer", access_token: "provider-secret", refresh_token: "refresh-secret" }))
      .mockResolvedValueOnce(Response.json({ id: 16146732, login: "sharpninja", email: "private@example.test" }));
    const result = await new GithubAdminProvider(settings, transport).verify(callback);
    expect(result).toEqual({ ok: true, value: { issuer: "https://github.com", subject: "16146732" } });
    const tokenRequest = transport.mock.calls[0];
    expect(tokenRequest[0]).toBe("https://github.com/login/oauth/access_token");
    expect(Object.fromEntries(tokenRequest[1].body)).toMatchObject({ code_verifier: challenge.pkceVerifier,
      client_secret: settings.clientSecret, redirect_uri: settings.redirectUri });
    expect(transport.mock.calls[1][0]).toBe("https://api.github.com/user");
    expect(transport.mock.calls[1][1].headers.Authorization).toBe("Bearer provider-secret");
    expect(transport.mock.calls.every(([, input]) => input.redirect === "error")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/provider-secret|refresh-secret|private@example/);
  });
  it.each([{ id: 1, login: "sharpninja" }, { id: 16146732, login: "another" }, { id: "16146732", login: "sharpninja" }, {}])("rejects unapproved identity %j", async user => {
    const transport = vi.fn().mockResolvedValueOnce(Response.json({ token_type: "bearer", access_token: "fixture" })).mockResolvedValueOnce(Response.json(user));
    expect((await new GithubAdminProvider(settings, transport).verify(callback)).ok).toBe(false);
  });
  it.each([{ ...callback, state: "forged" }, { ...callback, pkceVerifier: "short" }, { ...callback, code: "" }])("rejects malformed transaction before provider calls", async input => {
    const transport = vi.fn();
    expect((await new GithubAdminProvider(settings, transport).verify(input)).ok).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });
  it.each([Response.json({ error: "bad_verification_code" }), new Response(null, { status: 502 }), Response.json({ token_type: "other", access_token: "fixture" })])("fails closed on token endpoint errors", async response => {
    const transport = vi.fn().mockResolvedValue(response);
    expect((await new GithubAdminProvider(settings, transport).verify(callback)).ok).toBe(false);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("rejects network failures without returning provider details", async () => {
    const transport = vi.fn().mockRejectedValue(new Error("private-provider-detail"));
    expect(await new GithubAdminProvider(settings, transport).verify(callback)).toEqual({ ok: false, error: { code: "NOT_AUTHENTICATED" } });
  });
});
