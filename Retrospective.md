# Retrospective

Accident narratives for this repo.

Routing: narrative stays here. A project-specific rule that will recur may become one line in `AGENTS.md`. Cross-project lessons go to nmem or a global rule. If it can be checked by a machine, add a hook or test instead of prose.

## 2026-10-03 — Keep both dependency locks and verification tooling current

The earlier Vitest 5.0.1 adoption updated the manifest and Bun lock but left the npm lock on 4.1.11. This duty synchronized npm with the already adopted version and repaired the supported ESLint dependency branches without taking the separate requested major migrations. Validate both frozen install paths and scan both lockfiles after dependency changes. The task-owned packed-CLI fixture initially assumed an array from npm pack --json; npm12 actually returns a map keyed by package name. It stopped at metadata parsing before unpacking or HTTP execution, preserving the owned fixture. The corrected fixture requires the explicit ipsafe entry, validates the reviewed clean HEAD and real owned paths, and waits for both process groups and HTTP handlers before cleanup. Keep failed evidence and do not treat a successful signal send as completed cleanup.

Final independent review also found eleven pre-existing advisory ignores. After supported-branch repairs, the scanner reported every ignore unused. The obsolete configuration and its explicit CI input were removed, so both locks are now checked without that allowlist. Existing test-runtime MaxListenersExceededWarning output remains visible; strict ESLint success does not claim warning-free runtime tests or complete L1 certification.
