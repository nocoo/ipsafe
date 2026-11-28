# IPSafe

Node CLI that HTTP-checks a URL (status and optional body) before starting a command.
Profile: cli-library
Direction: [README.md](README.md). Frameworks must not rewrite this file.

## Sources of Truth

Maintain this root `AGENTS.md` as the only project handbook; do not create legacy aliases, imports or copies.

This file is the **contract**. Hooks, CI, and config are **enforcement**. If they disagree, that is a failure — raise enforcement to match this file; never lower the contract to a weaker hook.

| Fact | Where |
|---|---|
| Agent handbook | this root `AGENTS.md` |
| Human docs | README.md, `docs/*.md` |
| Version | `package.json` `"version"` as `1.2.3`, display `v1.2.3` |
| Enforcement | `.husky/pre-commit`, `.github/workflows/pipeline.yml`, `.github/workflows/quality-slots.yml`, `vitest.config.ts` |
| Machine rules | global `AGENTS.md`, `rules/git-commit.md` |
| Accidents | [Retrospective.md](Retrospective.md) |
| Env files | none |

## Project Invariants

- Check is a single request (status 2xx and optional body match) then exec. No continuous monitoring, no geo/proxy verification.
- Default probe is `https://www.google.com`. Do not bake production secrets into `ipsafe.config.json`.
- CommonJS. `bin/ipsafe.js` is the CLI; `lib/ipsafe.js` is the library.
- Vitest is the test runner, not Jest.

## Stack / Layout

| Component | Choice |
|---|---|
| Language | JavaScript (CommonJS + JSDoc `checkJs`) |
| Package manager | npm + bun.lock (CI uses bun install-policy blocked) |
| Runtime | Node.js CLI |
| Types | TypeScript `tsc --noEmit` (`allowJs` + `checkJs`) |
| Lint | Biome `--error-on-warnings` |
| Tests | Vitest `__tests__/**/*.test.js`, coverage 90% st/fn/ln, 85% br |
| Data | none |

```
bin/ipsafe.js  lib/ipsafe.js
__tests__/  ipsafe.config.json
```

## Commands

Run from the repository root. CI pins Bun 1.4.2 and Node 26.12.1; tests need no production probe or credentials. Use `npm ci` with the npm lockfile locally; CI uses the frozen Bun lockfile with dependency lifecycle scripts blocked.

```bash
npm ci
npm run typecheck           # tsc --noEmit (allowJs + checkJs)
npm run lint                # biome check --error-on-warnings bin/ lib/ __tests__/
npm run test:coverage       # vitest --coverage (thresholds 90/85)
npm test                    # vitest run
npm run verify              # typecheck + lint + test:coverage
node bin/ipsafe.js --help
```

## Verification

Status: `enforced` | `planned` | `manual` | `N/A`.
Required L1 bar is statements/functions/lines ≥90% and branches ≥85%; no skipped or focused tests.

| Change | Proof | Status | Evidence |
|---|---|---|---|
| Logic | L1 Vitest ≥ 90/85% | enforced | `vitest.config.ts` 90/85; pre-commit index snapshot `npm run test:coverage`; CI same |
| API / schema | L2 real HTTP against a local server, 100% CLI/library paths | planned | unit tests mock HTTP; no local listen harness |
| UI path | P1 packed-CLI process E2E | enforced | `npm run verify:packed-install` in P1 |
| Types | S1 `tsc --noEmit` (`allowJs` + `checkJs`) | enforced | `tsconfig.json`; pre-commit index snapshot `npm run typecheck`; CI `S1: Types` required by `Z1: Gate` |
| Complete L1 | 90/85% coverage, check-only static analysis with zero errors/warnings, no skipped/focused tests and installed index-snapshot rejection | enforced | Installed pre-commit exports `git checkout-index` to a temp dir and runs `npm run typecheck`, `npm run test:coverage`, and `npm run lint` (`--error-on-warnings`). Vitest sets `allowOnly: false`, `passWithNoTests: false`, and `RequireSelectedTests`. Target wall time <30s on ordinary code changes |
| Deps / secrets | G1 gitleaks + G2 osv-scanner | enforced | `pipeline.yml` -> `quality-slots.yml` (`base-ci` `v2026.24`, `quality / Z1: Gate` required on `main`); lockfiles `bun.lock,package-lock.json`. No pre-push hook |
| Test isolation | D1 no prod network as fixture | planned | mocks isolate unit tests; no dedicated loopback server or marker |
| Bundler output | n/a | N/A | no bundler |
| Docs | README if CLI flags change | manual | human review |
| Release | Local npm publish after verify | manual | Run `npm publish` locally after `npm run verify` (no CI publish workflow) |

Helper CLI: G2 applies (lockfiles + published package).

| Hook | Verifies | Budget | Runs |
|---|---|---|---|
| pre-commit | index-snapshot `npm run typecheck` + `npm run test:coverage` + `npm run lint` | target <30s | L1 unified (typecheck + coverage + Biome) |
| pre-push | none | — | missing |

Target: index-snapshot unified L1; stdin-ref L2+G2. Check-only; `--no-verify` forbidden.

## Resources / Isolation

Omit Cloudflare ports. Tests must not depend on production URLs as the only probe.

## Operations / Release

- Entry: Local `npm publish` (no GitHub Actions publish workflow)
- Auth: Local npm CLI session
- Before ship: `npm run verify`; `prepublishOnly` repeats it
- Runbook: README

## Retrospective

| Kind | Where |
|---|---|
| Accident narrative | [Retrospective.md](Retrospective.md) |
| Project-specific rule that will recur | one line here (cap ~10) |
| Cross-project lesson | nmem / global `AGENTS.md` / `rules/` |
| Deterministically checkable rule | hook or test, not prose |

- Preserve single-request probe semantics; test with mocks or an isolated loopback receiver.
