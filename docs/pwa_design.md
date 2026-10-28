# Phone installation and PWA design

Status: implemented and independently approved 99/99. Requested 27 October 2026.

## Goal and scope

Make Wordpairs installable from supported phone browsers and launch it in a standalone window at `/play`. Preserve the ordinary website. Multiplayer remains online; offline launch displays an honest reconnect screen, never a stale game. Push notifications, app stores, background game actions and offline multiplayer are outside this request.

## Repository findings and interfaces

At feature start, `src/app/layout.tsx` supplied title/description only, `src/app/page.tsx` supplied the public landing page, `next.config.ts` was empty and there was no manifest, install icon, worker or guidance. The implementation now adds the interfaces below. The reviewed runtime is Next.js 16.4.3 with the App Router; no new dependency was added. The UI uses dark ink, warm paper and a lowercase `w` brand mark.

New public interfaces: `/manifest.webmanifest`, `/sw.js`, `/offline.html`, and `/icons/*.png`. A client `PwaSupport` component registers the worker and presents install guidance. Native installation remains controlled by the browser/OS; automated browser checks cannot prove an icon was installed on a physical phone.

## Research

Research provider: Perplexity unavailable — fallback process used. Neither a Perplexity tool nor the `pplx` CLI is available. Sources consulted: installed `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`, the adjacent manifest and viewport API guides, [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [MDN icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons), and [Apple iPhone installation instructions](https://support.apple.com/guide/iphone/iphea86e5236/ios).

Verified platform facts: Next supports `app/manifest.ts`; manifest identity, display, launch URL and suitable icons describe installation. Real phone installation requires an HTTPS origin; loopback is a development exception, and plain HTTP LAN addresses are insufficient. Safari uses Add to Home Screen; Chromium may expose `beforeinstallprompt`, but browser policy determines when. Recommendations below follow those facts rather than promising an automatic prompt on every browser.

## Design and alternatives

Use Next's native manifest with stable `id: /`, `scope: /`, `start_url: /play`, `display: standalone`, name/short name, ink theme and paper background. Provide original, opaque PNG icons at 192 and 512 pixels, a separate safe-zone 512 maskable icon and a 180 Apple touch icon. Metadata supplies Apple web-app capability/title and touch icon; viewport supplies theme color and safe-area support while preserving zoom. No install analytics or tracking parameter is needed.

Use a small root service worker rather than a cache framework. Precache only the static offline document and public icon allowlist under `wordpairs-pwa-v1`. Exclude API/authentication paths before navigation handling, including top-level navigations. Navigation is network first; only a network failure uses the static offline document, preserving actual HTTP errors. All API, authentication, realtime, assets and non-GET requests otherwise go directly to the network. Never cache navigation HTML, RSC, sessions, profiles, room projections, admin data or mutation responses. Activation removes only older Wordpairs PWA caches, preserving unrelated origin caches. Failed precaching does not activate the new worker or discard the previous cache. Updates wait for existing clients to close; do not force reload or skip waiting during a game. `/sw.js` uses a JavaScript content type and no-cache/no-store headers, with root scope and updateViaCache none.

The install panel registers only in a secure context, handles registration failures without breaking the game, and hides installation controls when standalone or after appinstalled. An available browser prompt is triggered only by a user click, consumed once, and restored only by a fresh event; cancellation/failure leaves manual instructions usable. Unsupported browsers get concise Android menu/iPhone Share instructions instead of a nonfunctional install button. Insecure origins explain the HTTPS requirement. Event handlers are cleaned up on unmount, including standalone media-query changes. Global mounting makes installation discoverable on the landing and play pages.

Rejected alternatives: a full cache framework adds dependency/update complexity for an online game; caching the application shell risks retaining private server-rendered data; a custom iOS prompt cannot invoke Apple's native home-screen sheet.

## Acceptance criteria and test contracts

Canonical records: FR-PHONEINSTALL-026; TR-PWA-INSTALLATION-036; TR-PWA-CACHEPRIVACY-037; TEST-PWAINSTALL-137; TEST-PWAPRIVACY-138. These extend the baseline and do not renumber existing ACs.

| Criterion | Required result | Verification |
|---|---|---|
| PWA-01 | Manifest has stable identity, standalone launch at `/play`, root scope, names, colors, same-origin 192/512 icons and separate maskable icon. | Unit manifest contract; production HTTP/Chromium parsed manifest and installability diagnostics; negative mutation controls. |
| PWA-02 | Referenced PNGs have the declared dimensions, opaque brand background and maskable artwork in the central safe area; Apple metadata/touch icon exist. | Decode actual PNGs; production metadata and icon requests; visual inspection. |
| PWA-03 | Secure-context registration succeeds at root scope, handles failures gracefully, and uses fresh worker script headers. | Client lifecycle tests and production real service-worker registration/control test. |
| PWA-04 | A captured install event is prompted once after a click; rejected/dismissed prompts preserve guidance; installed/standalone state hides installation UI; listeners clean up. | Client tests with accepted, dismissed and rejected event controls; Chromium synthetic prompt lifecycle clearly distinguished from a real OS install. |
| PWA-05 | iPhone/Android manual steps remain available when no native event exists; insecure contexts explain HTTPS. Phone UI fits a narrow screen and remains accessible. | Client/browser tests at phone viewport, iPhone UA, standalone emulation and overflow assertions; screenshot review. Physical home-screen install remains a separately unverified operational check. |
| PWA-06 | Offline controlled navigation returns a static reconnect screen; returning online restores the live website. | Production real-worker online/offline/reconnect browser journey. |
| PWA-07 | API/auth/realtime/private pages and mutations are never stored in service-worker caches; offline API/mutation requests fail without receiving offline HTML. | Worker negative controls and real CacheStorage inspection after live API/private navigation; offline API/mutation browser assertions. |
| PWA-08 | Only versioned Wordpairs static caches are cleaned up; no forced activation/reload interrupts a match. | Worker lifecycle tests with unrelated caches and source/runtime assertions; documented update policy. |

## Ordered implementation and validation

1. Obtain independent hostile approval of this plan; persist the criteria and planned tests in MCP with descriptive IDs and mappings.
2. Author manifest/icon/client/worker tests and production browser journeys before implementing their behavior. Confirm the new tests fail for missing PWA support; retain negative controls.
3. Add manifest, generated original icons, static offline document, worker, secure install component, metadata and worker headers. Record source edits through MCP code verification.
4. Run focused tests, type/lint and production build. Test the production server on a separate loopback port, including real worker control, Chromium manifest installability, phone layouts, offline navigation, uncached private traffic and reconnection. Broaden to the existing unit/browser suites because the root layout affects all pages.
5. Update README, architecture, local/testing/deployment guides, wiki manifest, MCP criteria/evidence and export. Get independent hostile validation of the final changes; repair findings and recheck affected behavior.

## Configuration, operations and rollback

No database migration, new package, permission or server secret is required. Deployment must serve the app over HTTPS and preserve worker/manifest/icon routes; no deployment or public tunnel is implied by this request. Installing on another origin can create a separate app/session; use a durable sign-in for cross-device identity. Icons use project-owned vector geometry and existing brand colors, with no third-party artwork/font. The worker version must change when its static offline assets change. Rolling back requires a replacement worker at the same `/sw.js` URL that clears only `wordpairs-pwa-*`, installs and takes control after clients close; simply deleting the file does not remove installed workers. Server authorization remains authoritative.

## Approval and evidence

Tests were authored before implementation: 13/13 failed for missing PWA support. Final focused tests pass 14/14, including a new complete-stylesheet safe-area regression. The full unit/contract regression passes 516/516 in 45 files. Lint has no warnings, TypeScript verification and the production build pass, and all 35 production browser journeys pass (31 existing plus 4 PWA). A regular disposable Chromium profile reports no parsed-manifest or installability errors. Real worker checks cover offline navigation, uncached API GET/POST and top-level API navigation, private CacheStorage isolation and online recovery. Phone screenshots and icons were visually inspected. Evidence is in `docs/evidence/pwa/`.

Final hostile review found and prompted correction of an initial safe-area/CSS cascade issue: the body now protects all four insets even when standalone hides installation UI; the installation panel's explicit selector retains its 24px padding after shell rules. The offline document also protects all four insets. The added regression evaluates the complete actual stylesheet with nonzero inset values, checks hidden-panel installed mode and verifies panel padding. Both full suites above were rerun after the repair.

Final independent review: GPT-6 Astra/high APPROVE, 99 accuracy / 99 completeness, no unresolved material findings; [review receipt](pwa_review_receipt.json). The reviewer independently ran all 14 focused tests and inspected source, actual icons, phone captures and final full-suite evidence. The local application was restarted using its existing intended launcher/configuration; `/manifest.webmanifest` and `/sw.js` respond successfully at `http://localhost:3000`. This local address is a development check, not a hosted HTTPS phone-installation claim.

Two retained initial browser failures improved the verification setup: Next16 emits `mobile-web-app-capable` from its Apple capability metadata, so the test checks that actual tag, Apple title/touch icon and manifest; Chromium rejects installability in Playwright's default incognito contexts, so that check now uses a temporary persistent regular profile rather than filtering the error. The final diagnostics are unfiltered.

Independent pre-implementation review: GPT-6 Astra/high, APPROVE 99 accuracy / 99 completeness, no material findings. Review checks incorporated: API/auth navigation exclusion, preserving HTTP errors, failed precache isolation, waiting updates, and current iPhone Open as Web App instructions. This is an agent review step under the existing hostile-validation request, not a human sign-off gate. The prior commit-sync remains uncommitted; this new feature request authorizes continuing implementation without treating it as commit acknowledgement. Actual OS home-screen installation on physical Android/iPhone hardware is not claimed by emulated tests.
