# IPSafe

Node CLI that HTTP-checks a URL (status and optional body) before starting a command.
Profile: cli-library
Direction: [README.md](README.md). Frameworks must not rewrite this file.

## Sources of Truth

This file is the **contract**. Hooks, CI, and config are **enforcement**. If they disagree, that is a failure — raise enforcement to match this file; never lower the contract to a weaker hook.

| Fact | Where |
|---|---|
| Agent handbook | this file (not `.claude/CLAUDE.md`) |
| Human docs | README.md, `docs/*.md` |
| Version | `package.json` `"version"` as `1.2.3`, display `v1.2.3` |
| Enforcement | `.husky/pre-commit`, `.github/workflows/ci.yml`, `vitest.config.ts` |
| Machine rules | global `AGENTS.md`, `rules/git-commit.md` |
| Accidents | [Retrospective.md](Retrospective.md) |
| Env files | none |

## Project Invariants

- Check is a single request (status 2xx and optional body match) then exec. No continuous monitoring, no geo/proxy verification.
- Default probe is `https://www.google.com`. Do not bake production secrets into `ipsafe.config.json`.
- CommonJS. `bin/ipsafe.js` is the CLI; `lib/ipsafe.js` is the library.
- Nested `.claude/CLAUDE.md` is a stale pointer only. Jest is not the test runner.

## Stack / Layout

| Component | Choice |
|---|---|
| Language | JavaScript (no TypeScript) |
| Package manager | npm + bun.lock (CI uses bun install-policy blocked) |
| Runtime | Node.js CLI |
| Lint | ESLint `--max-warnings=0` |
| Tests | Vitest `__tests__/**/*.test.js`, coverage 95% four metrics |
| Data | none |

```
bin/ipsafe.js  lib/ipsafe.js
__tests__/  ipsafe.config.json
```

## Commands

```bash
npm install
npm run lint                # eslint --max-warnings=0 bin/ lib/ __tests__/
npm run test:coverage       # vitest --coverage (thresholds 95)
npm test                    # vitest run
npm run verify              # lint + test:coverage
node bin/ipsafe.js --help
```

No `typecheck` script (plain JS).

## Verification

Status: `enforced` | `planned` | `manual` | `N/A`.
6DQ = L1/L2/L3 + G1/G2 + D1. Required L1 bar is four metrics each ≥ 95%.

| Change | Proof | Status | Evidence |
|---|---|---|---|
| Logic | L1 Vitest ≥ 95% four metrics | enforced | `vitest.config.ts` 95; pre-commit `npm run test:coverage`; CI same |
| API / schema | L2 real HTTP against a local server, 100% CLI/library paths | planned | unit tests mock HTTP; no local listen harness |
| UI path | L3 packed-CLI process E2E | planned | no browser; CLI process E2E against a loopback probe is still required, not N/A |
| Types / lint | G1 0 warning ESLint | enforced | CI `lint-command`; typecheck disabled with reason (plain JS) |
| Deps / secrets | G2 osv-scanner + gitleaks | enforced | quality.yml default security + `osv-scanner.toml`; lockfiles `bun.lock,package-lock.json`. No pre-push hook |
| Test isolation | D1 no prod network as fixture | planned | mocks isolate unit tests; no dedicated loopback server or marker |
| Bundler output | n/a | N/A | no bundler |
| Docs | README if CLI flags change | manual | human review |
| Release | npm publish from proven SHA | enforced | `npm-publish.yml` via release-source |

Helper CLI: G2 applies (lockfiles + published package).

| Hook | Verifies | Budget | Runs |
|---|---|---|---|
| pre-commit | working-tree `npm run test:coverage` (not index snapshot) | target <30s (unmeasured) | L1 only (lint not in hook) |
| pre-push | none | — | missing |

Target: index-snapshot G1+L1; stdin-ref L2+G2. Check-only; `--no-verify` forbidden.

## Resources / Isolation

Omit Cloudflare ports. Tests must not depend on production URLs as the only probe.

## Operations / Release

- Entry: GitHub Release / `npm-publish.yml`
- Auth: npm publish token (CI)
- Before ship: `npm run verify`; `prepublishOnly` repeats it
- Runbook: README

## Retrospective

| Kind | Where |
|---|---|
| Accident narrative | [Retrospective.md](Retrospective.md) |
| Project-specific rule that will recur | one line here (cap ~10) |
| Cross-project lesson | nmem / global `AGENTS.md` / `rules/` |
| Deterministically checkable rule | hook or test, not prose |

- Ignore `.claude/CLAUDE.md` architecture (Jest/11-case list is stale). This file is the contract.
