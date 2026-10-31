# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-player-counts.integration.spec.ts >> LIVE-SCALE 13 real browser players complete eight UI rounds
- Location: tests/browser/live-player-counts.integration.spec.ts:20:29

# Error details

```
Error: UI ready did not converge through explicit conflict/uncertain retries
```

# Test source

```ts
  1  | import assert from "node:assert/strict";
  2  | import type { CapturedCommand, CommandRequest, CommitOptions } from "./ui-command-capture.contract";
  3  | import type { AckCommitOptions } from "./ui-command-acknowledgement.contract";
  4  | 
  5  | /** Own the exact command response/body while its initiating UI action is pending. */
  6  | export async function captureUiCommand(
  7  |   wait: () => Promise<CommandRequest>,
  8  |   action: () => Promise<unknown>,
  9  | ): Promise<CapturedCommand> {
  10 |   // Synchronous registration failure must prevent an unobserved UI mutation.
  11 |   const observed = wait();
  12 |   let bodyFailure: { error: unknown } | undefined;
  13 |   const capture = observed.then(async (request): Promise<CapturedCommand> => {
  14 |     const response = await request.response();
  15 |     const status = response?.status() ?? 0;
  16 |     const ok = response?.ok() ?? false;
  17 |     let body: { ok: true; value: unknown } | { ok: false; error: unknown } = { ok: true, value: null };
  18 |     if (response && ok) {
  19 |       try { body = { ok: true, value: await response.json() }; }
  20 |       catch (error) { body = { ok: false, error }; bodyFailure = { error }; }
  21 |     }
  22 |     return {
  23 |       request: () => request, status: () => status, ok: () => ok,
  24 |       json: async () => { if (!body.ok) throw body.error; return body.value; },
  25 |     };
  26 |   });
  27 |   // Both promises are observed together, including a synchronous action throw.
  28 |   const acted = (async () => action())();
  29 |   const [captured, finished] = await Promise.allSettled([capture, acted]);
  30 |   if (captured.status === "rejected" && finished.status === "rejected") throw new AggregateError([captured.reason, finished.reason]);
  31 |   if (captured.status === "rejected") throw captured.reason;
  32 |   if (finished.status === "rejected") {
  33 |     if (bodyFailure) throw new AggregateError([bodyFailure.error, finished.reason]);
  34 |     throw finished.reason;
  35 |   }
  36 |   return captured.value;
  37 | }
  38 | 
  39 | /** Existing matrix retry policy, with body loss gated by the actual pending UI. */
  40 | export async function commitUiCommand<Body = unknown>(action: string, options: CommitOptions & Partial<Pick<AckCommitOptions, "prepare" | "validate" | "acknowledge" | "retired">>): Promise<Body> {
  41 |   await options.prepare?.();
  42 |   let pendingPayload: unknown;
  43 |   let retryPending = false;
  44 |   for (let attempt = 0; attempt < 12; attempt++) {
  45 |     const result = await options.invoke(retryPending);
  46 |     const payload = result.request().postDataJSON();
  47 |     if (retryPending) options.assertPayload(payload, pendingPayload);
  48 |     options.validate?.(payload, result.request());
  49 |     if (result.ok()) {
  50 |       let body: Body;
  51 |       try { body = await result.json() as Body; }
  52 |       catch (error) {
  53 |         let pending = false;
  54 |         try { pending = await options.pendingReady(); }
  55 |         catch { /* An inaccessible control does not authorize a retry. */ }
  56 |         try { options.bodyError({ request: result.request(), status: result.status(), pending }); }
  57 |         catch (observerError) { throw new AggregateError([error, observerError]); }
  58 |         if (!pending) throw error;
  59 |         options.uncertain();
  60 |         pendingPayload ??= payload;
  61 |         retryPending = true;
  62 |         continue;
  63 |       }
  64 |       // Probe/denial failures are not driver JSON errors and cannot authorize
  65 |       // body-loss recovery. Keep the exact call until its sender retires it.
  66 |       if (await options.acknowledge?.(result, body) !== "pending") return body;
  67 |       options.uncertain();
  68 |       pendingPayload ??= payload;
  69 |       retryPending = true;
  70 |       continue;
  71 |     }
  72 |     if (result.status() === 0 || result.status() >= 500) {
  73 |       options.uncertain();
  74 |       pendingPayload ??= payload;
  75 |       retryPending = true;
  76 |     } else {
  77 |       assert.equal(result.status(), 409);
  78 |       await options.retired?.(result);
  79 |       retryPending = false;
  80 |       pendingPayload = undefined;
  81 |     }
  82 |   }
> 83 |   throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
     |         ^ Error: UI ready did not converge through explicit conflict/uncertain retries
  84 | }
  85 | 
```