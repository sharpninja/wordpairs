# Wordpairs Per-Deployment SWBOM

## Purpose

The game source is intended to use the GNU General Public License version 2 only (`GPL-2.0-only`); the repository root `LICENSE` file carries the full text.

Wordpairs produces one software bill of materials (SWBOM) for every successful Vercel Preview or Production deployment. The report identifies the dependency inventory used to create that specific deployment. The repository has no application lockfile or published application build yet, so no build-specific SWBOM can be generated at this stage.

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

The Vercel build sequence is: run the acceptance test suite; generate the SWBOM from the committed lockfile and Vercel build metadata; then run the framework production build so the report is bundled with that same deployment. Store it at `public/sbom/<git-commit-sha>.cdx.json`. It must be reachable at `/sbom/<git-commit-sha>.cdx.json` from that deployment’s URL. Preview and Production deployments each receive their own artifact, even when both use the same source commit; each artifact is served from its own immutable deployment URL.

No GitHub Actions workflow is involved. The generator runs as part of Vercel’s build command. The report describes the packages in the lockfile and is not a vulnerability assessment or license approval.

## Release archive

Every production release has a downloadable source archive containing the release contents, the root `LICENSE` file, and the matching SWBOM at `sbom/<git-commit-sha>.cdx.json`. The release packaging step validates the CycloneDX document and compares its commit SHA with the release commit. It must stop publication if the report is missing, invalid, or mismatched. The archive is created and published by the manually invoked release process; it does not rely on GitHub Actions.

## Maintenance

Update this document and `ATTRIBUTIONS.md` if the generator, output format, report path, or component fields change. Validate each generated report against the selected CycloneDX schema and confirm its commit and deployment metadata match the deployment that serves it.
