import type { BrowserContext, Route } from "@playwright/test";
import {
  type ContentAction,
  type ContentContext,
  type ContentPort,
  ContentService,
} from "../../src/application/content";
import type {
  AuditRecord,
  Command,
  Transition,
} from "../../src/application/ports";
import { buildCatalog } from "../../src/domain/catalog";
import {
  type ContentCase,
  type ContentState,
  emptyContent,
} from "../../src/domain/content";
import type { Actor, Pair } from "../../src/domain/model";
import { failure, type Result, success } from "../../src/domain/result";
import seed from "../../src/infrastructure/catalog-seed.json" with {
  type: "json",
};
import { contentAction } from "../../src/web/content-input";
export const value = <T>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};

/** Disclosed seam: real React, strict parser, application/domain; HTTP and SQL port are fixtures. */
export function uiContentFixture() {
  let state = emptyContent();
  let serial = 0;
  let loseNext = false;
  let holdPost: Promise<void> | null = null;
  const audits: AuditRecord[] = [];
  const writes: Record<string, unknown>[] = [];
  const roles: Record<string, Actor["roles"]> = {
    alice: ["player"],
    bob: ["moderator"],
    mallory: ["player"],
    root: ["admin"],
  };
  let catalog = value(buildCatalog(seed.categories, seed.pairs as Pair[]));
  const records = new Map<string, { digest: string; result: unknown }>();
  const evidence = (id: string): ContentContext => ({
    actor: { profileId: id, roles: roles[id] ?? ["player"] },
    wins: 20,
    catalog,
    audits,
  });
  const port: ContentPort = {
    read: async (id) => success({ state, evidence: evidence(id) }),
    async transact<T>(
      command: Command,
      _action: ContentAction,
      decide: (
        s: ContentState,
        e: ContentContext,
      ) => Promise<Result<Transition<ContentState, T>>>,
    ) {
      const key = `${command.actorId}:${command.commandId}`;
      const prior = records.get(key);
      if (prior)
        return prior.digest === command.requestDigest
          ? (prior.result as Result<Transition<ContentState, T>>)
          : failure("IDEMPOTENCY_CONFLICT");
      if (command.expectedVersion !== state.version) return failure("CONFLICT");
      const result = await decide(
        structuredClone(state),
        evidence(command.actorId),
      );
      if (result.ok) {
        const previous = state.publications.length;
        state = result.value.state;
        audits.push(...result.value.audits);
        catalog = {
          ...catalog,
          pairs: [
            ...catalog.pairs,
            ...state.publications
              .slice(previous)
              .flatMap((p) => p.content.pairs),
          ],
        };
        records.set(key, { digest: command.requestDigest, result });
      }
      return result;
    },
  };
  const service = new ContentService(
    port,
    { now: () => ++serial },
    { next: () => `ui-${++serial}` },
  );
  async function connect(context: BrowserContext, initialId: string) {
    let id = initialId;
    let session = 1;
    let readHandler: ((route: Route, data: unknown) => Promise<void>) | null =
      null;
    await context.route("**/api/session", (r) =>
      r.fulfill({
        json: {
          sessionGeneration: `${id}-session-${session}`,
          profile: {
            id,
            version: 0,
            kind: "guest",
            alias: `Guest ${id}`,
            icon: "owl",
            publicLeaderboard: false,
            wins: 20,
            points: 0,
            earliestWinAt: null,
          },
        },
      }),
    );
    await context.route("**/api/content", async (r) => {
      if (r.request().method() === "GET") {
        const data = value(await service.view(id));
        return readHandler ? readHandler(r, data) : r.fulfill({ json: data });
      }
      const body = r.request().postDataJSON();
      const actorId = id;
      writes.push(body);
      if (holdPost) await holdPost;
      if (body.expectedProfileId !== actorId)
        return r.fulfill({ status: 409, json: {} });
      const action = contentAction(body);
      if (!action) return r.fulfill({ status: 400, json: {} });
      const result = await service.act(
        {
          aggregateId: state.id,
          actorId,
          commandId: body.commandId,
          expectedVersion: body.expectedVersion,
          requestDigest: JSON.stringify(action),
        },
        action,
      );
      if (loseNext && result.ok) {
        loseNext = false;
        return r.fulfill({
          status: 503,
          json: { privateError: "DO-NOT-DISPLAY-SECRET" },
        });
      }
      return r.fulfill({
        status: result.ok ? 200 : result.error.code === "CONFLICT" ? 409 : 403,
        json: result.ok ? result.value : result,
      });
    });
    return {
      replaceSession: () => {
        session++;
      },
      identity: (next: string) => {
        id = next;
      },
      reads: (handler: typeof readHandler) => {
        readHandler = handler;
      },
    };
  }
  return {
    connect,
    service,
    state: () => state,
    audits,
    writes,
    roles: (id: string, next: Actor["roles"]) => {
      roles[id] = next;
    },
    lose: () => {
      loseNext = true;
    },
    hold: (promise: Promise<void> | null) => {
      holdPost = promise;
    },
    seedCandidate: () => {
      const item: ContentCase = {
        id: "candidate",
        version: 0,
        sourceRoomId: null,
        proposerId: "alice",
        kind: "nomination",
        payload: { word: "Orbit" },
        normalizedWord: "orbit",
        nominatorIds: Array.from({ length: 10 }, (_, i) => `voter-${i}`),
        status: "pending",
        reviewerId: null,
        originalReviewerId: null,
        reason: null,
        appealed: false,
        appealResolved: false,
        playable: false,
        createdAt: 0,
        updatedAt: 0,
      };
      state = {
        ...state,
        version: state.version + 1,
        cases: [...state.cases, item],
      };
    },
  };
}
