# Wordpairs Third-Party Attributions

Wordpairs is intended to be licensed under GNU GPL version 2 only (`GPL-2.0-only`). This inventory describes the planned direct dependencies for the initial implementation. Package versions shown are registry metadata reviewed on 26 October 2026; they are not an installed or compatibility-tested lockfile. Before implementation, resolve compatible versions, commit the package manager lockfile, and update this inventory to match it. Keep required upstream notices when distributing builds.

## Runtime dependencies

| Package | Planned use | Reviewed version | License | Upstream |
|---|---|---:|---|---|
| `next` | Vercel application framework and routing | 16.4.3 | MIT | [Next.js](https://nextjs.org/) |
| `react` | User interface components | 19.3.1 | MIT | [React](https://react.dev/) |
| `react-dom` | Browser rendering for React | 19.3.1 | MIT | [React](https://react.dev/) |
| `@supabase/supabase-js` | Supabase Postgres API, Auth, and Realtime client | 2.118.0 | MIT | [Supabase JS](https://github.com/supabase/supabase-js) |
| `@supabase/ssr` | Supabase session handling with server-rendered routes | 0.12.7 | MIT | [Supabase SSR](https://github.com/supabase/ssr) |
| `openid-client` | Server-side OpenID Connect client | 6.8.8 | MIT | [openid-client](https://github.com/panva/openid-client) |
| `zod` | Runtime validation of untrusted application input | 4.6.7 | MIT | [Zod](https://zod.dev/) |

## Development and test dependencies

| Package | Planned use | Reviewed version | License | Upstream |
|---|---|---:|---|---|
| `typescript` | Static type checking | 7.0.2 | Apache-2.0 | [TypeScript](https://www.typescriptlang.org/) |
| `@types/react` | React type declarations | 19.3.0 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react) |
| `@types/react-dom` | React DOM type declarations | 19.3.0 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom) |
| `@types/node` | Node.js type declarations | 26.6.5 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) |
| `vitest` | Unit and integration test runner | 5.0.5 | MIT | [Vitest](https://vitest.dev/) |
| `@testing-library/react` | Component behavior tests | 16.3.3 | MIT | [React Testing Library](https://github.com/testing-library/react-testing-library) |
| `@testing-library/user-event` | User interaction simulation | 14.6.8 | MIT | [user-event](https://github.com/testing-library/user-event) |
| `@testing-library/jest-dom` | DOM accessibility and state matchers | 7.0.1 | MIT | [jest-dom](https://github.com/testing-library/jest-dom) |
| `jsdom` | Browser-like DOM test environment | 30.1.3 | MIT | [jsdom](https://github.com/jsdom/jsdom) |
| `msw` | Mock HTTP and WebSocket service boundaries in tests | 3.0.3 | MIT | [Mock Service Worker](https://mswjs.io/) |
| `@playwright/test` | Browser-level acceptance tests | 1.64.1 | Apache-2.0 | [Playwright](https://playwright.dev/) |
| `@cyclonedx/cyclonedx-npm` | Generate a CycloneDX SWBOM from the npm lockfile for each deployment | 6.0.1 | Apache-2.0 | [CycloneDX npm generator](https://github.com/CycloneDX/cyclonedx-node-npm) |

## License compatibility policy

The Apache-2.0 entries above are development or build tools and are not bundled with the game. Do not copy, embed, or ship third-party code or assets in the GPL-2.0-only game until their license compatibility and required notices have been checked. The SWBOM records declared licenses; it does not make a compatibility decision.

## External assets and content

The Mermaid-rendered workflow SVGs embed the Recursive Variable font for diagram labels. The font includes its SIL Open Font License 1.1 notice in the SVG source.

| Asset | Use | License | Source / notice |
|---|---|---|---|
| Recursive Variable font (embedded in the Mermaid-generated workflow SVGs under `docs/word_association_*.svg`) | Diagram labels only; not an application runtime dependency | SIL Open Font License 1.1 | [Recursive project](https://github.com/arrowtype/recursive); copyright and license notice are embedded in each generated SVG. |

No third-party game artwork, sounds, or game content are included in the initial repository. Other architecture diagrams are authored as project SVGs. Add source, creator, license, and required credit wording here before introducing any external asset or content.
