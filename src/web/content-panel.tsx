"use client";
import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ContentAction, ContentService } from "../application/content";
import type { OwnProfile } from "../application/identity";
import {
  BACKGROUND_IDS,
  type CuratedPackage,
  type Proposal,
} from "../domain/content";
import { IdentityPanel } from "./identity-panel";
import { DraftForm } from "./private-draft";
import {
  invalidatePrivateState,
  privateIdentityRevision,
} from "./private-state";
import { usePrivateIntent } from "./use-private-intent";

type View = Extract<
  Awaited<ReturnType<ContentService["view"]>>,
  { ok: true }
>["value"];
type Case = View["cases"][number];
export function ContentScreen({
  oidcEnabled,
  administration = false,
}: {
  oidcEnabled: boolean;
  administration?: boolean;
}) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  return (
    <>
      <IdentityPanel oidcEnabled={oidcEnabled} onProfile={setProfile} />
      {profile && (
        <ContentPanel
          key={`${profile.id}:${privateIdentityRevision()}`}
          profileId={profile.id}
          administration={administration}
        />
      )}
    </>
  );
}
function ContentPanel({
  profileId,
  administration,
}: {
  profileId: string;
  administration: boolean;
}) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const wasModerator = useRef(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const sequence = ++generation.current;
    setReading(true);
    try {
      const response = await fetch("/api/content", {
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
      const result = await response.json();
      if (sequence !== generation.current) return;
      if (!response.ok || result.actorId !== profileId) {
        if (
          [401, 403, 404].includes(response.status) ||
          (result.actorId && result.actorId !== profileId)
        ) {
          invalidatePrivateState();
          setView(null);
        }
        throw new Error(
          "Submission updates are unavailable. Refresh to recover.",
        );
      }
      if (wasModerator.current && !result.canModerate) invalidatePrivateState();
      wasModerator.current = result.canModerate;
      setView((previous) =>
        previous && previous.version > result.version ? previous : result,
      );
      setError("");
    } catch {
      if (sequence === generation.current)
        setError("Submission updates are unavailable. Refresh to recover.");
    } finally {
      if (sequence === generation.current) setReading(false);
    }
  }, [profileId]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      generation.current++;
      clearInterval(timer);
    };
  }, [refresh]);
  const intent = usePrivateIntent(profileId, refresh, () => {
    generation.current++;
    setView(null);
    setError("Access required. Your role or session changed.");
  });
  const send = (
    action: ContentAction,
    draftKey = "caseId" in action
      ? `${action.type}-${action.caseId}`
      : action.type === "disable"
        ? `disable-${action.pairId}`
        : action.type,
  ) =>
    view
      ? intent.send(
          "/api/content",
          {
            ...action,
            action: action.type,
            type: undefined,
            expectedVersion: view.version,
          },
          draftKey,
        )
      : Promise.resolve();
  const suggest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const proposal: Proposal = {
      category: String(form.get("category") ?? ""),
      pairs: [1, 2, 3].map((i) => ({
        prompt: String(form.get(`prompt-${i}`) ?? ""),
        target: String(form.get(`target-${i}`) ?? ""),
      })),
    };
    void send({ type: "suggest", proposal }, "suggestion");
  };
  const visibleCases =
    view?.cases.filter(
      (item) =>
        !administration ||
        ((filter === "all" ||
          (filter === "active"
            ? item.playable
            : (item.status === filter ||
                (filter === "pending" && item.status === "pending_review")) &&
              !item.playable)) &&
          `${item.word ?? ""} ${item.proposal?.category ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    ) ?? [];
  if (administration && view && !view.canModerate)
    return (
      <section className="panel admin-surface">
        <h1>Moderation access required</h1>
        <p>
          Your profile does not have moderation rights. Ask an administrator to
          grant access.
        </p>
      </section>
    );
  return (
    <section
      className="panel content-panel"
      aria-labelledby="content-title"
      aria-busy={intent.busy}
    >
      <div className="panel-heading">
        <h1 id="content-title">
          {administration ? "Moderation queue" : "Community content"}
        </h1>
        <button type="button" onClick={() => void refresh()}>
          Refresh submissions
        </button>
      </div>
      <div className="content-surface">
        {error && <p role="alert">{error}</p>}
        {intent.error && <p role="alert">{intent.error}</p>}
        {intent.notice && <p role="status">{intent.notice}</p>}
        {intent.busy && <p role="status">Saving your request…</p>}
        {reading && <p role="status">Loading your submissions…</p>}
        {view && (
          <>
            {!administration && (
              <>
                <p>
                  Suggestions unlock at ten lifetime wins. Your profile has{" "}
                  {view.wins}. Approval permits curation; complete curated
                  records are required before future play.
                </p>
                {view.canSuggest ? (
                  <DraftForm
                    profileId={profileId}
                    draftKey="suggestion"
                    onSubmit={suggest}
                  >
                    <fieldset disabled={intent.locked}>
                      <legend>Suggest one category and three pairs</legend>
                      <label>
                        Proposed category
                        <input name="category" required maxLength={80} />
                      </label>
                      {[1, 2, 3].map((i) => (
                        <div className="pair-fields" key={`proposal-${i}`}>
                          <label>
                            Pair {i} prompt
                            <input
                              name={`prompt-${i}`}
                              required
                              maxLength={200}
                            />
                          </label>
                          <label>
                            Pair {i} target
                            <input
                              name={`target-${i}`}
                              required
                              maxLength={200}
                            />
                          </label>
                        </div>
                      ))}
                      <button className="button" type="submit">
                        Submit suggestion
                      </button>
                      <button type="reset">Discard suggestion</button>
                    </fieldset>
                  </DraftForm>
                ) : (
                  <p role="status">
                    {view.wins < 10
                      ? "Keep playing to unlock category suggestions."
                      : "Your open suggestion is under review. You can submit another after it closes."}
                  </p>
                )}
              </>
            )}
            {view.canModerate && !administration && (
              <p>
                <Link href="/admin">Open administration</Link>
              </p>
            )}
            {administration && (
              <div className="admin-toolbar">
                <label>
                  Search submissions
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label>
                  Submission status
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="all">All submissions</option>
                    <option value="pending">Pending review</option>
                    <option value="changes_requested">Changes requested</option>
                    <option value="on_hold">On hold</option>
                    <option value="appealed">Appeals</option>
                    <option value="approved">Approved for curation</option>
                    <option value="rejected">Rejected</option>
                    <option value="active">Active content</option>
                  </select>
                </label>
              </div>
            )}
            <h2>
              {view.canModerate
                ? "Review queue and your submissions"
                : "Your submissions"}
            </h2>
            {!visibleCases.length && (
              <p role="status">
                {view.cases.length
                  ? "No submissions match these filters. Change the search or status."
                  : "No submissions yet. Refresh submissions or return to play to earn suggestion access."}
              </p>
            )}
            {visibleCases.map((item) => (
              <article className="content-case" key={item.id}>
                <h3>
                  {item.kind === "nomination"
                    ? String(item.word)
                    : item.proposal?.category}
                </h3>
                <p>
                  <strong>{item.status}</strong> ·{" "}
                  {item.kind === "nomination"
                    ? `${item.nominationCount} unique nominations`
                    : "Category and three pairs"}
                </p>
                <p>
                  {item.playable
                    ? "Playable in future rounds"
                    : item.futureEligible
                      ? "Approved for curation; not playable"
                      : "Not playable"}
                </p>
                {item.reason && <p>Reason: {item.reason}</p>}
                {item.proposal && (
                  <ul>
                    {item.proposal.pairs.map((p) => (
                      <li key={`${p.prompt}:${p.target}`}>
                        {p.prompt} → {p.target}
                      </li>
                    ))}
                  </ul>
                )}
                {item.canReview && (
                  <DraftForm
                    profileId={profileId}
                    draftKey={`review-${item.id}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const decision = (
                        event.nativeEvent as SubmitEvent
                      ).submitter?.getAttribute("value");
                      const reason = String(form.get("reason") ?? "");
                      void send(
                        decision === "request-changes" || decision === "hold"
                          ? { type: decision, caseId: item.id, reason }
                          : {
                              type: "review",
                              caseId: item.id,
                              decision:
                                decision === "reject" ? "reject" : "approve",
                              reason,
                            },
                        `review-${item.id}`,
                      );
                    }}
                  >
                    <fieldset disabled={intent.locked}>
                      <label>
                        Decision reason
                        <textarea name="reason" required maxLength={1000} />
                      </label>
                      <button type="submit" name="decision" value="approve">
                        Approve for curation
                      </button>
                      <button type="submit" name="decision" value="reject">
                        Reject
                      </button>
                      {item.canRequestChanges && (
                        <button type="submit" value="request-changes">
                          Request changes
                        </button>
                      )}
                      {item.canHold && (
                        <button type="submit" value="hold">
                          Hold candidate
                        </button>
                      )}
                      <button type="reset">Discard decision</button>
                    </fieldset>
                  </DraftForm>
                )}
                {item.canResume && (
                  <DraftForm
                    profileId={profileId}
                    draftKey={`resume-${item.id}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void send(
                        {
                          type: "resume",
                          caseId: item.id,
                          reason: String(
                            new FormData(event.currentTarget).get("reason") ??
                              "",
                          ),
                        },
                        `resume-${item.id}`,
                      );
                    }}
                  >
                    <fieldset disabled={intent.locked}>
                      <label>
                        Resume reason
                        <textarea name="reason" required maxLength={1000} />
                      </label>
                      <button type="submit">Resume review</button>
                      <button type="reset">Discard decision</button>
                    </fieldset>
                  </DraftForm>
                )}
                {item.canResubmit && item.proposal && (
                  <DraftForm
                    profileId={profileId}
                    draftKey={`resubmit-${item.id}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void send(
                        {
                          type: "resubmit",
                          caseId: item.id,
                          proposal: {
                            category: String(form.get("category") ?? ""),
                            pairs: [1, 2, 3].map((i) => ({
                              prompt: String(form.get(`prompt-${i}`) ?? ""),
                              target: String(form.get(`target-${i}`) ?? ""),
                            })),
                          },
                        },
                        `resubmit-${item.id}`,
                      );
                    }}
                  >
                    <fieldset disabled={intent.locked}>
                      <legend>Revise your suggestion</legend>
                      <label>
                        Revised category
                        <input
                          name="category"
                          required
                          maxLength={80}
                          defaultValue={item.proposal.category}
                        />
                      </label>
                      {item.proposal.pairs.map((pair, i) => (
                        <div
                          className="pair-fields"
                          key={`${pair.prompt}:${pair.target}`}
                        >
                          <label>
                            Revised pair {i + 1} prompt
                            <input
                              name={`prompt-${i + 1}`}
                              required
                              maxLength={200}
                              defaultValue={pair.prompt}
                            />
                          </label>
                          <label>
                            Revised pair {i + 1} target
                            <input
                              name={`target-${i + 1}`}
                              required
                              maxLength={200}
                              defaultValue={pair.target}
                            />
                          </label>
                        </div>
                      ))}
                      <button type="submit">Resubmit suggestion</button>
                      <button type="reset">Discard revision</button>
                    </fieldset>
                  </DraftForm>
                )}
                {item.canAppeal && (
                  <DraftForm
                    profileId={profileId}
                    draftKey={`appeal-${item.id}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void send({
                        type: "appeal",
                        caseId: item.id,
                        reason: String(
                          new FormData(event.currentTarget).get("reason") ?? "",
                        ),
                      });
                    }}
                  >
                    <fieldset disabled={intent.locked}>
                      <label>
                        Appeal reason
                        <textarea name="reason" required maxLength={1000} />
                      </label>
                      <button type="submit">Appeal once</button>
                      <button type="reset">Discard appeal</button>
                    </fieldset>
                  </DraftForm>
                )}
                {item.canResolve && (
                  <DraftForm
                    profileId={profileId}
                    draftKey={`resolve-${item.id}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void send({
                        type: "resolve",
                        caseId: item.id,
                        outcome:
                          (
                            event.nativeEvent as SubmitEvent
                          ).submitter?.getAttribute("value") === "uphold"
                            ? "uphold"
                            : "overturn",
                        reason: String(
                          new FormData(event.currentTarget).get("reason") ?? "",
                        ),
                      });
                    }}
                  >
                    <fieldset disabled={intent.locked}>
                      <label>
                        Appeal decision reason
                        <textarea name="reason" required maxLength={1000} />
                      </label>
                      <button type="submit" value="uphold">
                        Uphold rejection
                      </button>
                      <button type="submit" value="overturn">
                        Overturn rejection
                      </button>
                      <button type="reset">Discard appeal decision</button>
                    </fieldset>
                  </DraftForm>
                )}
                {item.canActivate && (
                  <details>
                    <summary>Prepare catalog records</summary>
                    <CurationForm
                      profileId={profileId}
                      item={item}
                      view={view}
                      disabled={intent.locked}
                      activate={(content) =>
                        void send({
                          type: "activate",
                          caseId: item.id,
                          content,
                        })
                      }
                    />
                  </details>
                )}
                <details>
                  <summary>Decision history</summary>
                  <ol>
                    {view.audit
                      .filter((a) => a.caseId === item.id)
                      .map((a) => (
                        <li
                          key={`${a.at}:${a.action}:${a.nominationCount}:${a.status}`}
                        >
                          {a.action}
                          {a.caseVersion !== null
                            ? ` · revision ${String(a.caseVersion)}`
                            : ""}
                          {a.previousStatus
                            ? ` · ${String(a.previousStatus)} → ${String(a.status)}`
                            : ""}
                          {a.actorId ? ` · by ${a.actorId}` : ""}
                          {a.reason ? ` · ${String(a.reason)}` : ""}
                          {a.nominationCount !== null
                            ? ` · ${String(a.nominationCount)} nominations`
                            : ""}
                        </li>
                      ))}
                  </ol>
                </details>
              </article>
            ))}
            {view.canModerate && !administration && (
              <DraftForm
                profileId={profileId}
                draftKey="disable-pair"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const pair = view.catalogPairs.find(
                    (p) => `${p.id}@${p.version}` === data.get("pair"),
                  );
                  if (pair)
                    void send(
                      {
                        type: "disable",
                        pairId: pair.id,
                        pairVersion: pair.version,
                        reason: String(data.get("reason") ?? ""),
                      },
                      "disable-pair",
                    );
                }}
              >
                <fieldset disabled={intent.locked}>
                  <legend>Exclude a pair from future rounds</legend>
                  <p>
                    Historical rounds retain their content. Curate a replacement
                    before excluding the final pair in an initial category.
                  </p>
                  <label>
                    Pair to exclude
                    <select name="pair" required>
                      <option value="">Choose a pair</option>
                      {view.catalogPairs
                        .filter((p) => p.selectable)
                        .map((p) => (
                          <option
                            key={`${p.id}@${p.version}`}
                            value={`${p.id}@${p.version}`}
                          >
                            {p.prompt} · version {p.version}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Exclusion reason
                    <textarea name="reason" required maxLength={1000} />
                  </label>
                  <button type="submit">Exclude from future rounds</button>
                  <button type="reset">Discard exclusion</button>
                </fieldset>
              </DraftForm>
            )}
          </>
        )}
        {intent.pending && (
          <button
            type="button"
            disabled={intent.busy}
            onClick={() => void intent.send()}
          >
            Retry pending content request
          </button>
        )}
      </div>
    </section>
  );
}
function CurationForm({
  profileId,
  item,
  view,
  disabled,
  activate,
}: {
  profileId: string;
  item: Case;
  view: View;
  disabled: boolean;
  activate: (content: CuratedPackage) => void;
}) {
  const pairs = item.proposal?.pairs ?? [
    { prompt: "", target: String(item.word) },
  ];
  return (
    <DraftForm
      profileId={profileId}
      draftKey={`activate-${item.id}`}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const category =
          item.kind === "nomination"
            ? view.categories.find((c) => c.id === data.get("category"))
            : {
                id: `curated-${item.id}`,
                version: 0,
                name: item.proposal?.category ?? "",
                approved: true,
                backgroundId: String(data.get("background")),
              };
        if (!category) return;
        activate({
          category,
          pairs: pairs.map((p, i) => ({
            id: `curated-${item.id}-${i + 1}`,
            version: 0,
            categoryId: category.id,
            prompt: String(data.get(`prompt-${i + 1}`)),
            target: p.target,
            acceptedAnswers: String(data.get(`alternatives-${i + 1}`) ?? "")
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean),
            hints: [1, 2, 3].map((h) =>
              String(data.get(`hint-${i + 1}-${h}`)),
            ) as [string, string, string],
            backgroundId: category.backgroundId,
            approved: true,
          })),
        });
      }}
    >
      <fieldset disabled={disabled}>
        {item.kind === "nomination" ? (
          <label>
            Category
            <select name="category" required>
              {view.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Category background
            <select name="background">
              {BACKGROUND_IDS.map((id) => (
                <option value={id} key={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        )}
        {pairs.map((p, i) => (
          <div className="curated-pair" key={`${p.prompt}:${p.target}`}>
            <h4>
              Pair {i + 1}: {p.target}
            </h4>
            <label>
              Pair {i + 1} prompt
              <input
                name={`prompt-${i + 1}`}
                required
                maxLength={200}
                defaultValue={p.prompt}
              />
            </label>
            {[1, 2, 3].map((h) => (
              <label key={`hint-${h}`}>
                Pair {i + 1} hint {h}
                <input name={`hint-${i + 1}-${h}`} required maxLength={400} />
              </label>
            ))}
            <label>
              Pair {i + 1} accepted alternatives (one per line)
              <textarea name={`alternatives-${i + 1}`} />
            </label>
          </div>
        ))}
        <button type="submit">Activate complete content</button>
        <button type="reset">Discard curation</button>
      </fieldset>
    </DraftForm>
  );
}
