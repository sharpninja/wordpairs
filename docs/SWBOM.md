# Wordpairs Per-Deployment SWBOM

## Purpose

The game source is intended to use the GNU General Public License version 2 only (`GPL-2.0-only`); the repository root `LICENSE` file carries the full text.

The hosted build command generates one software bill of materials (SWBOM) for each successful Vercel deployment using `scripts/generate-sbom.mjs`. The report describes that deployment's committed npm lockfile. Generated reports are ignored by Git and bundled into the Next.js build after the test gate.

## Format and contents

Use CycloneDX JSON version 1.6, generated from the exact npm lockfile used by the deployment. Include all direct and transitive packages, including development/build dependencies, while identifying each component’s scope. Include declared license identifiers, package URLs (PURLs), and dependency relationships when available.

Each report must identify:

- Wordpairs application name and version, when assigned
- Git commit SHA and source branch
- Build timestamp and Vercel deployment environment
- Vercel deployment URL
- CycloneDX generator name and version
- Components and dependency relationships from the lockfile

The report must not contain secret values, credentials, or copied environment variables. Declared component licenses are included for attribution and review; the SWBOM does not determine whether a component can be redistributed with the GPL-2.0-only game.

## Build and publication

The configured Vercel build command is `npm run typecheck && npm test && node scripts/generate-sbom.mjs && npm run build`. The generator requires `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_ENV` and `VERCEL_URL`; it validates CycloneDX 1.6 and fails closed on missing/unsafe metadata. Store the report at `public/sbom/<git-commit-sha>.cdx.json`; it is reachable at `/sbom/<git-commit-sha>.cdx.json` from that deployment. The inventory includes lockfile paths as stable component references, declared licenses, package URLs, dependency edges, development/optional flags and the exact lockfile SHA-256. It copies no general environment values. `tests/integration/hosted-sbom.test.ts` uses isolated fixture files and validates metadata rejection and dependency coverage.

No GitHub Actions workflow is involved. The generator runs as part of Vercel’s build command. The report describes the packages in the lockfile and is not a vulnerability assessment or license approval.

## Release archive

Every production release has a downloadable source archive containing the release contents, the root `LICENSE` file, and the matching SWBOM at `sbom/<git-commit-sha>.cdx.json`. The release packaging step validates the CycloneDX document and compares its commit SHA with the release commit. It must stop publication if the report is missing, invalid, or mismatched. The archive is created and published by the manually invoked release process; it does not rely on GitHub Actions.

## Maintenance

Update this document and `ATTRIBUTIONS.md` if the generator, output format, report path, or component fields change. Validate each generated report against the selected CycloneDX schema and confirm its commit and deployment metadata match the deployment that serves it.
