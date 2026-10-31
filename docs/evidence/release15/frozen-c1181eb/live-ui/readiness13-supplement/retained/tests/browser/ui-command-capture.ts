import assert from "node:assert/strict";
import type { CapturedCommand, CommandRequest, CommitOptions } from "./ui-command-capture.contract";
import type { AckCommitOptions } from "./ui-command-acknowledgement.contract";

/** Own the exact command response/body while its initiating UI action is pending. */
export async function captureUiCommand(
  wait: () => Promise<CommandRequest>,
  action: () => Promise<unknown>,
): Promise<CapturedCommand> {
  // Synchronous registration failure must prevent an unobserved UI mutation.
  const observed = wait();
  let bodyFailure: { error: unknown } | undefined;
  const capture = observed.then(async (request): Promise<CapturedCommand> => {
    const response = await request.response();
    const status = response?.status() ?? 0;
    const ok = response?.ok() ?? false;
    let body: { ok: true; value: unknown } | { ok: false; error: unknown } = { ok: true, value: null };
    if (response && ok) {
      try { body = { ok: true, value: await response.json() }; }
      catch (error) { body = { ok: false, error }; bodyFailure = { error }; }
    }
    return {
      request: () => request, status: () => status, ok: () => ok,
      json: async () => { if (!body.ok) throw body.error; return body.value; },
    };
  });
  // Both promises are observed together, including a synchronous action throw.
  const acted = (async () => action())();
  const [captured, finished] = await Promise.allSettled([capture, acted]);
  if (captured.status === "rejected" && finished.status === "rejected") throw new AggregateError([captured.reason, finished.reason]);
  if (captured.status === "rejected") throw captured.reason;
  if (finished.status === "rejected") {
    if (bodyFailure) throw new AggregateError([bodyFailure.error, finished.reason]);
    throw finished.reason;
  }
  return captured.value;
}

/** Existing matrix retry policy, with body loss gated by the actual pending UI. */
export async function commitUiCommand<Body = unknown>(action: string, options: CommitOptions & Partial<Pick<AckCommitOptions, "prepare" | "validate" | "acknowledge" | "retired">>): Promise<Body> {
  await options.prepare?.();
  let pendingPayload: unknown;
  let retryPending = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const result = await options.invoke(retryPending);
    const payload = result.request().postDataJSON();
    if (retryPending) options.assertPayload(payload, pendingPayload);
    options.validate?.(payload, result.request());
    if (result.ok()) {
      let body: Body;
      try { body = await result.json() as Body; }
      catch (error) {
        let pending = false;
        try { pending = await options.pendingReady(); }
        catch { /* An inaccessible control does not authorize a retry. */ }
        try { options.bodyError({ request: result.request(), status: result.status(), pending }); }
        catch (observerError) { throw new AggregateError([error, observerError]); }
        if (!pending) throw error;
        options.uncertain();
        pendingPayload ??= payload;
        retryPending = true;
        continue;
      }
      // Probe/denial failures are not driver JSON errors and cannot authorize
      // body-loss recovery. Keep the exact call until its sender retires it.
      if (await options.acknowledge?.(result, body) !== "pending") return body;
      options.uncertain();
      pendingPayload ??= payload;
      retryPending = true;
      continue;
    }
    if (result.status() === 0 || result.status() >= 500) {
      options.uncertain();
      pendingPayload ??= payload;
      retryPending = true;
    } else {
      assert.equal(result.status(), 409);
      await options.retired?.(result);
      retryPending = false;
      pendingPayload = undefined;
    }
  }
  throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
}
