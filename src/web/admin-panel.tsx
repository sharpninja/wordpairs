"use client";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AccessView } from "../application/access";
import type { ContentService } from "../application/content";
import type { OwnProfile } from "../application/identity";
import { MANAGED_ROLES, type ManagedRole } from "../domain/access";
import { categoryPool } from "../domain/catalog";
import type { Pair } from "../domain/model";
import { IdentityPanel } from "./identity-panel";
import { DraftForm, usePrivateDraftState } from "./private-draft";
import {
  clearDraft,
  invalidatePrivateState,
  privateIdentityRevision,
  privateScope,
} from "./private-state";
import { usePrivateIntent } from "./use-private-intent";

type CatalogView = Extract<
  Awaited<ReturnType<ContentService["view"]>>,
  { ok: true }
>["value"];
export function AdminScreen({
  page,
  oidcEnabled,
}: {
  page: "words" | "users";
  oidcEnabled: boolean;
}) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  return (
    <>
      <IdentityPanel oidcEnabled={oidcEnabled} onProfile={setProfile} />
      {profile &&
        (page === "words" ? (
          <WordManager
            key={`${profile.id}:${privateIdentityRevision()}`}
            profileId={profile.id}
          />
        ) : (
          <UserManager
            key={`${profile.id}:${privateIdentityRevision()}`}
            profileId={profile.id}
          />
        ))}
    </>
  );
}
/** Identity-bound requests discard stale responses and privileged data on denial. */
function useAdminView<T extends { actorId: string; version: number }>(
  profileId: string,
  url: string,
  authorize: (value: T) => boolean,
  saved?: (draftKey?: string) => void,
) {
  const [view, setView] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const generation = useRef(0);
  const authorizeRef = useRef(authorize);
  authorizeRef.current = authorize;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const refresh = useCallback(async () => {
    const sequence = ++generation.current;
    setReading(true);
    let explanation = "Administration is unavailable. Refresh to try again.";
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if ([401, 403, 404].includes(response.status)) {
        await response.text();
        if (sequence !== generation.current) return;
        invalidatePrivateState();
        setView(null);
        setError("Access required. Your role or session changed.");
        return;
      }
      const data = await response.json();
      if (sequence !== generation.current) return;
      if (
        !response.ok ||
        data.actorId !== profileId ||
        !authorizeRef.current(data)
      ) {
        if ([401, 403, 404].includes(response.status) || response.ok)
          invalidatePrivateState();
        setView(null);
        explanation =
          [401, 403].includes(response.status) || response.ok
            ? "Access required. Ask an administrator to grant the appropriate role."
            : "Administration is unavailable. Refresh to try again.";
        throw new Error("Unavailable");
      }
      setView(data);
      setError("");
    } catch {
      if (sequence === generation.current) setError(explanation);
    } finally {
      if (sequence === generation.current) setReading(false);
    }
  }, [profileId, url]);
  useEffect(() => {
    setView(null);
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      generation.current++;
      clearInterval(timer);
    };
  }, [refresh]);
  const intent = usePrivateIntent(
    profileId,
    async (result, draftKey) => {
      await refresh();
      if (result) savedRef.current?.(draftKey);
    },
    () => {
      generation.current++;
      setView(null);
      setError("Access required. Your role or session changed.");
    },
    url.startsWith("/api/admin/users") ? "users" : "catalog",
  );
  return { view, error, refresh, intent, reading };
}
function Feedback({
  error,
  intent,
  onRecovered,
}: {
  error: string;
  intent: ReturnType<typeof usePrivateIntent>;
  onRecovered?: () => void;
}) {
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {intent.error && <p role="alert">{intent.error}</p>}
      {intent.notice && <p role="status">{intent.notice}</p>}
      {intent.busy && <p role="status">Saving your request…</p>}
      {intent.pending && (
        <button
          type="button"
          disabled={intent.busy}
          onClick={async () => {
            if (await intent.send()) onRecovered?.();
          }}
        >
          Retry pending admin request
        </button>
      )}
    </>
  );
}
function WordManager({ profileId }: { profileId: string }) {
  const { view, error, refresh, intent, reading } = useAdminView<CatalogView>(
    profileId,
    "/api/content",
    (data) => data.canModerate,
    (draftKey) => {
      if (draftKey?.startsWith("catalog-editor:")) clearEditing();
    },
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing, clearEditing] = usePrivateDraftState<
    Pair | "new" | null
  >(profileId, "catalog-selection", null);
  const editorKey = `catalog-editor:${editing === "new" ? "new" : editing?.id}`;
  const pairs = view
    ? categoryPool(
        {
          categories: view.categories,
          pairs: view.catalogPairs,
          initialCategoryIds: [],
        },
        category,
      )
    : [];
  // Include excluded latest versions so editors can revise them without reviving history.
  const latest = new Map<string, Pair>();
  for (const pair of view?.catalogPairs ?? [])
    if ((latest.get(pair.id)?.version ?? -1) < pair.version)
      latest.set(pair.id, pair);
  const filtered = [...latest.values()].filter(
    (pair) =>
      (!category || pair.categoryId === category) &&
      `${pair.prompt} ${pair.target} ${pair.hints.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!view || !editing) return;
    const data = new FormData(event.currentTarget);
    const categoryId =
      editing === "new" ? String(data.get("category")) : editing.categoryId;
    const selected = view.categories.find((item) => item.id === categoryId);
    if (!selected) return;
    const pair: Pair = {
      id: editing === "new" ? crypto.randomUUID() : editing.id,
      version: editing === "new" ? 0 : editing.version + 1,
      categoryId,
      backgroundId: selected.backgroundId,
      approved: true,
      prompt: String(data.get("prompt") ?? "").trim(),
      target: String(data.get("target") ?? "").trim(),
      hints: [1, 2, 3].map((n) =>
        String(data.get(`hint-${n}`) ?? "").trim(),
      ) as [string, string, string],
      acceptedAnswers: String(data.get("alternatives") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
    const result = await intent.send(
      "/api/content",
      {
        action: "save-pair",
        pair,
        reason: String(data.get("reason")),
        expectedVersion: view.version,
      },
      editorKey,
    );
    if (result) clearEditing();
  };
  return (
    <section className="panel admin-surface" aria-busy={intent.busy}>
      <div className="panel-heading">
        <h1>Word pairs and hints</h1>
        <button type="button" onClick={() => void refresh()}>
          Refresh word pairs
        </button>
      </div>
      <Feedback
        error={error}
        intent={intent}
        onRecovered={() => setEditing(null)}
      />
      {reading && <p role="status">Loading catalog…</p>}
      {view && (
        <>
          <p>
            Changes apply to future rounds. Games already in progress keep the
            words and hints they started with.
          </p>
          <div className="admin-toolbar">
            <label>
              Search word pairs
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Filter category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {view.categories.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={intent.locked}
              onClick={() => setEditing("new")}
            >
              Add word pair
            </button>
          </div>
          {editing && (
            <DraftForm
              profileId={profileId}
              draftKey={editorKey}
              className="admin-editor"
              key={
                editing === "new" ? "new" : `${editing.id}:${editing.version}`
              }
              onSubmit={(event) => void save(event)}
            >
              <fieldset disabled={intent.locked}>
                <legend>
                  {editing === "new"
                    ? "New word pair"
                    : `Edit ${editing.prompt}`}
                </legend>
                <label>
                  Pair category
                  <select
                    name="category"
                    required
                    defaultValue={
                      editing === "new" ? category : editing.categoryId
                    }
                    disabled={editing !== "new"}
                  >
                    <option value="">Choose a category</option>
                    {view.categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Prompt
                  <input
                    name="prompt"
                    required
                    maxLength={200}
                    defaultValue={editing === "new" ? "" : editing.prompt}
                  />
                </label>
                <label>
                  Target answer
                  <input
                    name="target"
                    required
                    maxLength={200}
                    defaultValue={editing === "new" ? "" : editing.target}
                  />
                </label>
                {[1, 2, 3].map((n) => (
                  <label key={n}>
                    Hint {n}
                    <textarea
                      name={`hint-${n}`}
                      required
                      maxLength={400}
                      defaultValue={
                        editing === "new" ? "" : editing.hints[n - 1]
                      }
                    />
                  </label>
                ))}
                <label>
                  Accepted alternatives (one per line)
                  <textarea
                    name="alternatives"
                    maxLength={4020}
                    defaultValue={
                      editing === "new"
                        ? ""
                        : editing.acceptedAnswers.join("\n")
                    }
                  />
                </label>
                <label>
                  Change reason
                  <textarea name="reason" required maxLength={1000} />
                </label>
                <div className="admin-actions">
                  <button type="submit" className="button">
                    Save word pair
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft(privateScope(profileId), editorKey);
                      clearEditing();
                    }}
                  >
                    Cancel editing
                  </button>
                </div>
              </fieldset>
            </DraftForm>
          )}
          <p role="status">
            {filtered.length} word pairs
            {category ? ` · ${pairs.length} available for future play` : ""}
          </p>
          <div className="admin-cards">
            {filtered.map((pair) => (
              <article
                className="content-case"
                key={`${pair.id}:${pair.version}`}
              >
                <h2>
                  {pair.prompt} → {pair.target}
                </h2>
                <p>
                  {
                    view.categories.find((item) => item.id === pair.categoryId)
                      ?.name
                  }{" "}
                  ·{" "}
                  {pair.selectable === false
                    ? "Excluded from future rounds"
                    : "Available for future rounds"}
                </p>
                <ol aria-label={`Hints for ${pair.prompt}`}>
                  {(["first", "second", "third"] as const).map(
                    (position, index) => (
                      <li key={position}>{pair.hints[index]}</li>
                    ),
                  )}
                </ol>
                <button
                  type="button"
                  disabled={intent.locked}
                  onClick={() => setEditing(pair)}
                >
                  Edit {pair.prompt}
                </button>
                {pair.selectable !== false && (
                  <details>
                    <summary>Exclude from future rounds</summary>
                    <DraftForm
                      profileId={profileId}
                      draftKey={`exclude-${pair.id}`}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        void intent.send(
                          "/api/content",
                          {
                            action: "disable",
                            pairId: pair.id,
                            pairVersion: pair.version,
                            reason: String(data.get("reason")),
                            expectedVersion: view.version,
                          },
                          `exclude-${pair.id}`,
                        );
                      }}
                    >
                      <fieldset disabled={intent.locked}>
                        <label>
                          Exclusion reason
                          <textarea name="reason" required maxLength={1000} />
                        </label>
                        <button type="submit">Exclude word pair</button>
                        <button type="reset">Discard exclusion</button>
                      </fieldset>
                    </DraftForm>
                  </details>
                )}
              </article>
            ))}
          </div>
          {!filtered.length && <p>No word pairs match these filters.</p>}
          <details>
            <summary>Catalog change history</summary>
            <ol>
              {view.audit
                .filter((item) => item.pairId)
                .map((item) => (
                  <li
                    key={`${item.at}:${item.action}:${item.pairId}:${item.pairVersion}`}
                  >
                    {String(item.pairId)} · {item.action} ·{" "}
                    {String(item.reason)}
                  </li>
                ))}
            </ol>
          </details>
        </>
      )}
    </section>
  );
}
function UserManager({ profileId }: { profileId: string }) {
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const { view, error, refresh, intent, reading } = useAdminView<AccessView>(
    profileId,
    `/api/admin/users?search=${encodeURIComponent(search)}`,
    () => true,
    (draftKey) => {
      if (draftKey?.startsWith("access-editor:")) clearSelected();
    },
  );
  const [selected, setSelected, clearSelected] = usePrivateDraftState<{
    id: string;
    alias: string;
    role: ManagedRole;
    grant: boolean;
  } | null>(profileId, "access-selection", null);
  const editorKey = `access-editor:${selected?.id}:${selected?.role}:${selected?.grant}`;
  return (
    <section className="panel admin-surface" aria-busy={intent.busy}>
      <div className="panel-heading">
        <h1>Users and access</h1>
        <button type="button" onClick={() => void refresh()}>
          Refresh user access
        </button>
      </div>
      <Feedback
        error={error}
        intent={intent}
        onRecovered={() => setSelected(null)}
      />
      {reading && <p role="status">Loading user access…</p>}
      {view && (
        <>
          <p>
            Moderators review content and manage word pairs. Senior moderators
            also resolve independent appeals. Administrators additionally manage
            user access.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSelected(null);
              setSearch(draftSearch);
            }}
          >
            <label>
              Search users by alias or profile ID
              <input
                type="search"
                maxLength={80}
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
              />
            </label>
            <button type="submit">Search users</button>
          </form>
          {selected && (
            <DraftForm
              profileId={profileId}
              draftKey={editorKey}
              className="admin-editor"
              onSubmit={async (event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const result = await intent.send(
                  "/api/admin/users",
                  {
                    profileId: selected.id,
                    role: selected.role,
                    grant: selected.grant,
                    reason: String(data.get("reason")),
                    expectedVersion: view.version,
                  },
                  editorKey,
                );
                if (result) clearSelected();
              }}
            >
              <fieldset disabled={intent.locked}>
                <legend>
                  {selected.grant ? "Grant" : "Revoke"} {selected.role} for{" "}
                  {selected.alias}
                </legend>
                <label>
                  Access change reason
                  <textarea name="reason" required maxLength={1000} />
                </label>
                <button type="submit">Confirm access change</button>
                <button
                  type="button"
                  onClick={() => {
                    clearDraft(privateScope(profileId), editorKey);
                    clearSelected();
                  }}
                >
                  Cancel access change
                </button>
              </fieldset>
            </DraftForm>
          )}
          <p role="status">
            Showing {view.users.length} of {view.total} matching users. Search
            to find a specific profile.
          </p>
          <div className="admin-cards">
            {view.users.map((user) => (
              <article key={user.id} className="content-case">
                <h2>{user.alias}</h2>
                <p className="admin-id">
                  Profile ID: <code>{user.id}</code>
                </p>
                <p>Roles: {user.roles.join(", ")}</p>
                {user.configuredAdmin && (
                  <p>
                    Administrator access is controlled by server configuration.
                  </p>
                )}
                <div className="admin-actions">
                  {MANAGED_ROLES.map((role) => {
                    const grant = !user.roles.includes(role);
                    return user.configuredAdmin && role === "admin" ? null : (
                      <button
                        key={role}
                        type="button"
                        disabled={intent.locked}
                        onClick={() =>
                          setSelected({
                            id: user.id,
                            alias: user.alias,
                            role,
                            grant,
                          })
                        }
                      >
                        {grant ? "Grant" : "Revoke"} {role} for {user.alias}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
          <h2>Access history</h2>
          <ol>
            {view.audit.map((item) => (
              <li key={item.id}>
                {item.granted ? "Granted" : "Revoked"} {item.role} ·{" "}
                {item.profileId} · by {item.actorId} · {item.reason}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
