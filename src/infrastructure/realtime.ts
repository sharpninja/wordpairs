import { createHmac } from "node:crypto";
import type { RealtimePublisher } from "../application/ports";
import type { DomainEvent } from "../domain/model";
import { failure, success } from "../domain/result";
export type RealtimeSettings = {
  url: string;
  anonKey: string;
  serviceKey: string;
  jwtSecret: string;
};
export type ChangeNotification = {
  eventId: string;
  aggregateType: DomainEvent["aggregateType"];
  aggregateId: string;
  version: number;
};
function keyRole(key: string) {
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
      .role;
  } catch {
    return null;
  }
}
export function realtimeSettings(settings: RealtimeSettings): RealtimeSettings {
  const url = new URL(settings.url);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname)
      )) ||
    settings.jwtSecret.length < 32 ||
    !(
      settings.anonKey.startsWith("sb_publishable_") ||
      keyRole(settings.anonKey) === "anon"
    ) ||
    !(
      settings.serviceKey.startsWith("sb_secret_") ||
      keyRole(settings.serviceKey) === "service_role"
    )
  )
    throw new Error("Invalid Realtime configuration");
  return { ...settings, url: url.href.replace(/\/$/, "") };
}
export function realtimeAccess(
  settings: RealtimeSettings,
  profileId: string,
  now: number,
) {
  const issued = Math.floor(now / 1000);
  const expires = issued + 120;
  const body = [
    { alg: "HS256", typ: "JWT" },
    {
      iss: "wordpairs",
      aud: "authenticated",
      sub: profileId,
      role: "authenticated",
      iat: issued,
      exp: expires,
    },
  ]
    .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
    .join(".");
  const token = `${body}.${createHmac("sha256", settings.jwtSecret).update(body).digest("base64url")}`;
  return {
    url: settings.url,
    anonKey: settings.anonKey,
    token,
    profileId,
    expiresAt: expires * 1000,
  };
}
/** Publish only invalidation metadata, never event payloads, room codes or hidden gameplay. */
export class SupabaseRealtimePublisher implements RealtimePublisher {
  constructor(
    private settings: RealtimeSettings,
    private fetcher: typeof fetch = fetch,
  ) {}
  async publish(event: DomainEvent) {
    if (!event.audience.length) return success(undefined);
    const notification: ChangeNotification = {
      eventId: event.id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      version: event.version,
    };
    try {
      const response = await this.fetcher(
        `${this.settings.url}/realtime/v1/api/broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.settings.serviceKey,
            Authorization: `Bearer ${this.settings.serviceKey}`,
          },
          body: JSON.stringify({
            messages: [...new Set(event.audience)].map((id) => ({
              topic: `wordpairs-profile:${id}`,
              event: "changed",
              private: true,
              payload: notification,
            })),
          }),
          signal: AbortSignal.timeout(3000),
        },
      );
      await response.body?.cancel();
      return response.ok
        ? success(undefined)
        : failure(
            response.status === 429 ? "SERVICE_LIMIT" : "TEMPORARY_UNAVAILABLE",
          );
    } catch {
      return failure("TEMPORARY_UNAVAILABLE");
    }
  }
}
