# Public evidence privacy checks

Public reviewer exports use `scripts/Export-PublicReview.ps1`. It accepts an explicitly selected response JSONL, the actual repository root, the public output path and a private retention directory outside the repository. Preview with `-WhatIf` before writing. Retained originals are named with their SHA-256, verified byte for byte, and never overwritten. Public receipts contain hashes without publishing the retention location.

Only file reads inside the supplied repository root are eligible for publication. External reads, unknown Read results, dependency directories, Git internals, credential-like files, private cache/bootstrap paths, symlinks and hook bodies are redacted. Environment files require an explicit example, sample or template name. Echoed copies of identified private strings, including numbered Read wrappers and normalized paths, are redacted throughout the event stream. Home paths are normalized. This changes an export's bytes; it does not establish successful review, test execution or requirement satisfaction.

Activate the checked-in hook after cloning:

```powershell
git config core.hooksPath .githooks
```

The executable hook invokes `scripts/Invoke-PrivacyCheck.ps1 -Staged`. It inspects the staged index, including nested ZIP entries. The full check inspects historical Git blobs and a projection of tracked working files. It never traverses generated build caches or untracked credential files. Credential-like tracked or archived paths stop the check before their contents are opened.

```powershell
pwsh -NoProfile -NonInteractive -File scripts/Install-PrivacyTools.ps1
pwsh -NoProfile -NonInteractive -File scripts/Run-PrivacyTests.ps1
pwsh -NoProfile -NonInteractive -File scripts/Invoke-PrivacyCheck.ps1
pwsh -NoProfile -NonInteractive -File scripts/Test-PublishedEvidenceManifest.ps1
```

Run these checks locally before publishing. This repository has no GitHub Actions workflows. Deployments use the existing Vercel Git integration.

Gitleaks 8.30.1 or later and Pester 5.9.1 are required. The installer targets Linux x64 and verifies the pinned scanner archive against its published SHA-256 before extraction. It reports the installed binary path; pass that path with `-GitleaksPath` to the test runner and privacy check, or add its directory to your shell's PATH. The staged pre-commit check also requires Gitleaks on PATH. Other platforms should install the matching native release and Pester version before running the remaining commands.

The strict privacy guard reads the three privacy rules in `.gitleaks.toml` independently of inherited secret-scanner exclusions. It inspects raw text plus decoded JSON keys and strings, handles Unicode byte-order marks, and recurses into compressed evidence. Host, share, key-location and coordination markers are matched without depending on capitalization; private usernames require whole-name boundaries so unrelated legal and programming words remain valid. This ensures that private context in otherwise ignored extensions or encoded evidence still fails. Native Gitleaks also runs with its credential rules enabled. Verified historical hash exceptions require the exact file, field or line context, and known value; synthetic-value and CMS identifier exceptions remain scoped to their specific credential rule. None apply to privacy rules. Malformed archives and incomplete inspections fail closed.

`Test-PublishedEvidenceManifest.ps1` verifies current artifact hashes, byte counts and ZIP counterparts. Historical original hashes retain their historical meanings. A publication correction must qualify any new derivative and retain the prior bytes privately before current bindings are updated. Do not turn a stale privacy receipt into a new successful scan claim.
