import * as client from "openid-client";
import type { LoginChallenge, OidcProvider } from "../application/identity";
import type { IdentityVerifier } from "../application/ports";
import { failure, success } from "../domain/result";

/** Configured provider endpoints are server-only. Production discovery always requires HTTPS. */
export class OpenAiOidcProvider implements OidcProvider {
  private configuration: Promise<client.Configuration> | null = null;
  constructor(
    private settings: {
      issuer: string;
      clientId: string;
      redirectUri: string;
      clientSecret?: string;
    },
    private fetcher?: client.CustomFetch,
  ) {
    const issuer = new URL(settings.issuer);
    const redirect = new URL(settings.redirectUri);
    if (
      issuer.protocol !== "https:" ||
      issuer.username ||
      issuer.password ||
      issuer.search ||
      issuer.hash ||
      redirect.username ||
      redirect.password ||
      redirect.hash ||
      (redirect.protocol !== "https:" &&
        !(
          redirect.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(redirect.hostname)
        ))
    )
      throw new Error("Invalid OIDC configuration");
    if (!settings.clientId || settings.clientId.length > 512)
      throw new Error("Invalid OIDC configuration");
  }
  private config() {
    if (!this.configuration) {
      const options: client.DiscoveryRequestOptions = {
        timeout: 10,
        execute: [client.enableNonRepudiationChecks],
        ...(this.fetcher ? { [client.customFetch]: this.fetcher } : {}),
      };
      this.configuration = client
        .discovery(
          new URL(this.settings.issuer),
          this.settings.clientId,
          { id_token_signed_response_alg: "RS256", [client.clockTolerance]: 0 },
          this.settings.clientSecret
            ? client.ClientSecretPost(this.settings.clientSecret)
            : client.None(),
          options,
        )
        .catch((error) => {
          this.configuration = null;
          throw error;
        });
    }
    return this.configuration;
  }
  async authorization(challenge: LoginChallenge) {
    try {
      const config = await this.config();
      return success(
        client.buildAuthorizationUrl(config, {
          redirect_uri: this.settings.redirectUri,
          response_type: "code",
          scope: "openid",
          state: challenge.state,
          nonce: challenge.nonce,
          code_challenge: await client.calculatePKCECodeChallenge(
            challenge.pkceVerifier,
          ),
          code_challenge_method: "S256",
        }).href,
      );
    } catch {
      return failure("TEMPORARY_UNAVAILABLE");
    }
  }
  async verify(callback: Parameters<IdentityVerifier["verify"]>[0]) {
    try {
      if (
        !callback.code ||
        callback.state !== callback.expectedState ||
        !callback.nonce ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(callback.pkceVerifier)
      )
        return failure("NOT_AUTHENTICATED");
      const config = await this.config();
      const url = new URL(this.settings.redirectUri);
      url.searchParams.set("code", callback.code);
      url.searchParams.set("state", callback.state);
      const tokens = await client.authorizationCodeGrant(config, url, {
        pkceCodeVerifier: callback.pkceVerifier,
        expectedState: callback.expectedState,
        expectedNonce: callback.nonce,
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (
        !claims ||
        claims.iss !== this.settings.issuer ||
        typeof claims.sub !== "string" ||
        !claims.sub ||
        claims.sub.length > 512
      )
        return failure("NOT_AUTHENTICATED");
      return success({ issuer: claims.iss, subject: claims.sub });
    } catch {
      return failure("NOT_AUTHENTICATED");
    }
  }
}
