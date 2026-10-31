import { createHash } from "node:crypto";
import type { LoginChallenge, OidcProvider } from "../application/identity";
import { failure, success } from "../domain/result";

// Verified public account identity, not a browser claim or a mutable display name.
export const GITHUB_ADMIN = { id: 16146732, login: "sharpninja" } as const;

/** Identity only: no repository/email scopes, persistent provider tokens, or linking. */
export class GithubAdminProvider implements OidcProvider {
  constructor(
    private settings: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    },
    private transport: typeof fetch = fetch,
  ) {
    const uri = new URL(settings.redirectUri);
    if (
      !settings.clientId ||
      !settings.clientSecret ||
      uri.protocol !== "https:" ||
      uri.username ||
      uri.password ||
      uri.search ||
      uri.hash
    )
      throw new Error("Invalid GitHub administration configuration");
  }
  async authorization(challenge: LoginChallenge) {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: this.settings.clientId,
      redirect_uri: this.settings.redirectUri,
      state: challenge.state,
      code_challenge: createHash("sha256")
        .update(challenge.pkceVerifier)
        .digest("base64url"),
      code_challenge_method: "S256",
      login: GITHUB_ADMIN.login,
      allow_signup: "false",
    }).toString();
    return success(url.href);
  }
  async verify(callback: Parameters<OidcProvider["verify"]>[0]) {
    if (
      !callback.code ||
      callback.state !== callback.expectedState ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(callback.pkceVerifier)
    )
      return failure("NOT_AUTHENTICATED");
    try {
      const token = await this.transport(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: this.settings.clientId,
            client_secret: this.settings.clientSecret,
            code: callback.code,
            code_verifier: callback.pkceVerifier,
            redirect_uri: this.settings.redirectUri,
          }),
        },
      );
      if (!token.ok) return failure("NOT_AUTHENTICATED");
      const credentials = await token.json();
      if (
        credentials.error ||
        typeof credentials.access_token !== "string" ||
        !credentials.access_token ||
        credentials.token_type?.toLowerCase() !== "bearer"
      )
        return failure("NOT_AUTHENTICATED");
      const response = await this.transport("https://api.github.com/user", {
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Wordpairs-Admin",
        },
      });
      if (!response.ok) return failure("NOT_AUTHENTICATED");
      const user = await response.json();
      if (
        user.id !== GITHUB_ADMIN.id ||
        typeof user.login !== "string" ||
        user.login.toLowerCase() !== GITHUB_ADMIN.login
      )
        return failure("NOT_AUTHORIZED");
      return success({
        issuer: "https://github.com",
        subject: String(GITHUB_ADMIN.id),
      });
    } catch {
      return failure("NOT_AUTHENTICATED");
    }
  }
}
