# Wordpairs Third-Party Attributions

Wordpairs is intended to be licensed under GNU GPL version 2 only (`GPL-2.0-only`). This inventory describes direct dependencies for the current implementation phase. Next.js, React, and React DOM are installed as exact runtime dependencies for the Phase 1A application skeleton. Supabase, OpenID Connect, and Zod remain planned runtime dependencies for later increments. Vitest, TypeScript, Biome, MSW, React Testing Library, jsdom, Playwright, and their listed type packages are installed as development/test dependencies. The CycloneDX npm generator is listed for Phase 7 but is not installed yet. `package-lock.json` is the resolved dependency tree for the installed packages. Update this inventory to match any lockfile change and keep required upstream notices when distributing builds.

## Runtime dependencies

| Package | Planned use | Reviewed version | Registry version record | License | Upstream |
|---|---|---:|---|---|---|
| `next` | Vercel application framework and routing | 16.4.3 | [npm registry](https://www.npmjs.com/package/next/v/16.4.3) | MIT | [Next.js](https://nextjs.org/) |
| `react` | User interface components | 19.3.1 | [npm registry](https://www.npmjs.com/package/react/v/19.3.1) | MIT | [React](https://react.dev/) |
| `react-dom` | Browser rendering for React | 19.3.1 | [npm registry](https://www.npmjs.com/package/react-dom/v/19.3.1) | MIT | [React](https://react.dev/) |
| `@supabase/supabase-js` | Supabase Postgres API, Auth, and Realtime client | 2.118.0 | [npm registry](https://www.npmjs.com/package/@supabase%2Fsupabase-js/v/2.118.0) | MIT | [Supabase JS](https://github.com/supabase/supabase-js) |
| `@supabase/ssr` | Supabase session handling with server-rendered routes | 0.12.7 | [npm registry](https://www.npmjs.com/package/@supabase%2Fssr/v/0.12.7) | MIT | [Supabase SSR](https://github.com/supabase/ssr) |
| `openid-client` | Server-side OpenID Connect client | 6.8.8 | [npm registry](https://www.npmjs.com/package/openid-client/v/6.8.8) | MIT | [openid-client](https://github.com/panva/openid-client) |
| `zod` | Runtime validation of untrusted application input | 4.6.7 | [npm registry](https://www.npmjs.com/package/zod/v/4.6.7) | MIT | [Zod](https://zod.dev/) |

## Development and test dependencies

| Package | Planned use | Reviewed version | Registry version record | License | Upstream |
|---|---|---:|---|---|---|
| `typescript` | Static type checking | 6.0.3 | [npm registry](https://www.npmjs.com/package/typescript/v/6.0.3) | Apache-2.0 | [TypeScript](https://www.typescriptlang.org/) |
| `@biomejs/biome` | Lint and formatting checks for application and test sources | 2.6.3 | [npm registry](https://www.npmjs.com/package/@biomejs%2Fbiome/v/2.6.3) | MIT OR Apache-2.0 | [Biome](https://github.com/biomejs/biome) |
| `@types/react` | React type declarations | 19.3.0 | [npm registry](https://www.npmjs.com/package/@types%2Freact/v/19.3.0) | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react) |
| `@types/react-dom` | React DOM type declarations | 19.3.0 | [npm registry](https://www.npmjs.com/package/@types%2Freact-dom/v/19.3.0) | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom) |
| `@types/node` | Node.js type declarations | 26.6.5 | [npm registry](https://www.npmjs.com/package/@types%2Fnode/v/26.6.5) | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) |
| `vitest` | Unit and integration test runner | 5.0.5 | [npm registry](https://www.npmjs.com/package/vitest/v/5.0.5) | MIT | [Vitest](https://vitest.dev/) |
| `@testing-library/react` | Component behavior tests | 16.3.3 | [npm registry](https://www.npmjs.com/package/@testing-library%2Freact/v/16.3.3) | MIT | [React Testing Library](https://github.com/testing-library/react-testing-library) |
| `@testing-library/user-event` | User interaction simulation | 14.6.8 | [npm registry](https://www.npmjs.com/package/@testing-library%2Fuser-event/v/14.6.8) | MIT | [user-event](https://github.com/testing-library/user-event) |
| `@testing-library/jest-dom` | DOM accessibility and state matchers | 7.0.1 | [npm registry](https://www.npmjs.com/package/@testing-library%2Fjest-dom/v/7.0.1) | MIT | [jest-dom](https://github.com/testing-library/jest-dom) |
| `jsdom` | Browser-like DOM test environment | 30.1.3 | [npm registry](https://www.npmjs.com/package/jsdom/v/30.1.3) | MIT | [jsdom](https://github.com/jsdom/jsdom) |
| `msw` | Mock HTTP and WebSocket service boundaries in tests | 3.0.3 | [npm registry](https://www.npmjs.com/package/msw/v/3.0.3) | MIT | [Mock Service Worker](https://mswjs.io/) |
| `@playwright/test` | Browser-level acceptance tests | 1.64.1 | [npm registry](https://www.npmjs.com/package/@playwright%2Ftest/v/1.64.1) | Apache-2.0 | [Playwright](https://playwright.dev/) |
| `@cyclonedx/cyclonedx-npm` | Generate a CycloneDX SWBOM from the npm lockfile for each deployment | 6.0.1 | [npm registry](https://www.npmjs.com/package/@cyclonedx%2Fcyclonedx-npm/v/6.0.1) | Apache-2.0 | [CycloneDX npm generator](https://github.com/CycloneDX/cyclonedx-node-npm) |
| `@cyclonedx/cyclonedx-library` | Validate test archive fixtures against the bundled official CycloneDX 1.6 schema | 10.3.0 | [npm registry](https://www.npmjs.com/package/@cyclonedx%2Fcyclonedx-library/v/10.3.0) | Apache-2.0 | [CycloneDX JavaScript library](https://github.com/CycloneDX/cyclonedx-javascript-library) |
| `ajv` | JSON Schema engine used by the CycloneDX fixture validator | 8.20.0 | [npm registry](https://www.npmjs.com/package/ajv/v/8.20.0) | MIT | [Ajv](https://ajv.js.org/) |
| `ajv-formats` | Standard format validators required by the CycloneDX schema engine | 3.0.1 | [npm registry](https://www.npmjs.com/package/ajv-formats/v/3.0.1) | MIT | [ajv-formats](https://github.com/ajv-validator/ajv-formats) |
| `ajv-formats-draft2019` | Draft 2019 format validators required by the CycloneDX schema engine | 1.6.1 | [npm registry](https://www.npmjs.com/package/ajv-formats-draft2019/v/1.6.1) | MIT | [ajv-formats-draft2019](https://github.com/luzlab/ajv-formats-draft2019) |
| `yauzl` | Inspect and extract temporary ZIP release fixtures in tests | 3.4.0 | [npm registry](https://www.npmjs.com/package/yauzl/v/3.4.0) | MIT | [yauzl](https://github.com/thejoshwolfe/yauzl) |
| `yazl` | Construct temporary ZIP release fixtures in tests | 3.3.1 | [npm registry](https://www.npmjs.com/package/yazl/v/3.3.1) | MIT | [yazl](https://github.com/thejoshwolfe/yazl) |
| `@types/yauzl` | Type declarations for ZIP fixture inspection | 2.10.3 | [npm registry](https://www.npmjs.com/package/@types%2Fyauzl/v/2.10.3) | MIT | [DefinitelyTyped yauzl](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/yauzl) |
| `@types/yazl` | Type declarations for ZIP fixture construction | 3.3.0 | [npm registry](https://www.npmjs.com/package/@types%2Fyazl/v/3.3.0) | MIT | [DefinitelyTyped yazl](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/yazl) |

## License compatibility policy

The Apache-2.0 entries above are development or build tools and are not bundled with the game. Do not copy, embed, or ship third-party code or assets in the GPL-2.0-only game until their license compatibility and required notices have been checked. The SWBOM records declared licenses; it does not make a compatibility decision.

## External assets and content

The Mermaid-rendered workflow SVGs embed the Recursive Variable font for diagram labels. The font includes its SIL Open Font License 1.1 notice in the SVG source.

| Asset | Use | License | Source / notice |
|---|---|---|---|
| Recursive Variable font (embedded in the Mermaid-generated workflow SVGs under `docs/word_association_*.svg`) | Diagram labels only; not an application runtime dependency | SIL Open Font License 1.1 | [Recursive project](https://github.com/arrowtype/recursive); copyright and license notice are embedded in each generated SVG. |

No third-party game artwork, sounds, or game content are included in the initial repository. Other architecture diagrams are authored as project SVGs. Add source, creator, license, and required credit wording here before introducing any external asset or content.
