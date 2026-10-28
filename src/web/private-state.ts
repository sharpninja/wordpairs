/** Tab-local private state. Never persist this module to browser storage. */
type Intent = {
  url: string;
  body: string;
  method: "POST" | "PATCH";
  draftKey?: string;
};
type Entry = {
  pending: Intent | null;
  busy: boolean;
  error: string;
  notice: string;
  resolution: number;
  settled: { result: Record<string, unknown>; draftKey?: string } | null;
};
let identity: string | null | undefined;
let sessionGeneration: string | undefined;
let identityRevision = 0;
export const privateIdentityRevision = () => identityRevision;
let generation = 0;
let revision = 0;
const drafts = new Map<string, unknown>();
const intents = new Map<string, Entry>();
const listeners = new Set<() => void>();
export const subscribePrivateState = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const privateRevision = () => revision;
const emit = () => {
  revision++;
  for (const listener of listeners) listener();
};
export function invalidatePrivateState() {
  generation++;
  drafts.clear();
  intents.clear();
  emit();
}
export function bindPrivateIdentity(
  profileId: string | null,
  session?: string,
) {
  if (identity !== profileId || sessionGeneration !== session) {
    identity = profileId;
    sessionGeneration = session;
    identityRevision++;
    invalidatePrivateState();
  }
}
export function privateScope(profileId: string) {
  if (identity === undefined) bindPrivateIdentity(profileId);
  return `${generation}:${profileId}`;
}
export const currentPrivateScope = (scope: string) =>
  identity != null && scope === `${generation}:${identity}`;
const key = (scope: string, name: string) => `${scope}\u0000${name}`;
export const draftValue = <T>(scope: string, name: string): T | undefined =>
  currentPrivateScope(scope)
    ? (drafts.get(key(scope, name)) as T | undefined)
    : undefined;
export function setDraftValue(scope: string, name: string, value: unknown) {
  if (!currentPrivateScope(scope)) return;
  drafts.set(key(scope, name), value);
  emit();
}
export function clearDraft(scope: string, name: string) {
  if (drafts.delete(key(scope, name))) emit();
}
export function intentFor(scope: string, resource: string): Entry {
  const name = key(scope, resource);
  let entry = intents.get(name);
  if (!entry) {
    entry = {
      pending: null,
      busy: false,
      error: "",
      notice: "",
      resolution: 0,
      settled: null,
    };
    if (currentPrivateScope(scope)) intents.set(name, entry);
  }
  return entry;
}
export function acknowledgePrivateResult(
  scope: string,
  resource: string,
  settled: Entry["settled"],
) {
  if (!currentPrivateScope(scope) || !settled) return;
  const entry = intentFor(scope, resource);
  if (entry.settled === settled) {
    entry.settled = null;
    emit();
  }
}
export async function submitPrivateIntent(
  scope: string,
  resource: string,
  url?: string,
  input?: Record<string, unknown>,
  draftKey?: string,
  transport: typeof fetch = fetch,
  method: "POST" | "PATCH" = "POST",
): Promise<{ result?: Record<string, unknown>; denied?: boolean }> {
  if (!currentPrivateScope(scope)) return {};
  const entry = intentFor(scope, resource);
  if (entry.busy || entry.settled) return {};
  const intent =
    entry.pending ??
    (url && input
      ? {
          url,
          method,
          body: JSON.stringify({
            ...input,
            expectedProfileId: identity,
            commandId: crypto.randomUUID(),
          }),
          draftKey,
        }
      : null);
  if (!intent) return {};
  entry.pending = intent;
  entry.busy = true;
  entry.error = "";
  entry.notice = "";
  emit();
  const current = () =>
    currentPrivateScope(scope) && intents.get(key(scope, resource)) === entry;
  try {
    const response = await transport(intent.url, {
      method: intent.method,
      headers: { "Content-Type": "application/json" },
      body: intent.body,
      signal: AbortSignal.timeout(10000),
    });
    // Consume every body, but never expose raw server/network exceptions.
    const body = await response.text();
    if (!current()) return {};
    if (!response.ok) {
      if (response.status < 500) {
        entry.pending = null;
        entry.resolution++;
        if ([401, 403, 404].includes(response.status)) {
          invalidatePrivateState();
          return { denied: true };
        }
      }
      entry.error =
        response.status === 409
          ? resource === "room-menu"
            ? "The room or account changed. Try again, browse, or create a room."
            : "The content or round changed. Refresh and try again."
          : response.status === 429
            ? "Please wait before trying again."
            : "Your request was not confirmed. Retry the same request.";
      return {};
    }
    const result: unknown = JSON.parse(body);
    if (!result || typeof result !== "object" || Array.isArray(result))
      throw new Error("Invalid response");
    entry.pending = null;
    entry.settled = {
      result: result as Record<string, unknown>,
      draftKey: intent.draftKey,
    };
    if (intent.draftKey) clearDraft(scope, intent.draftKey);
    entry.notice = "Saved.";
    entry.resolution++;
    return { result: result as Record<string, unknown> };
  } catch {
    if (current()) entry.error = "Service unavailable. Retry the same request.";
    return {};
  } finally {
    if (current()) {
      entry.busy = false;
      emit();
    }
  }
}
