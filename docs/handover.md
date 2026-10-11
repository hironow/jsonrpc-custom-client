# Handover

**Last updated:** 2026-10-11 (JST)
**Updated by:** Codex

## Current State

The Flatt removal branch removes the last Go Takumi Guard action and the obsolete npm Guard comment.
The CI installer uses the SHA-pinned official setup-just action.
Draft PRs skip CI and ready_for_review starts it.
Go and application runtime dependency versions are unchanged.
Bun and jsdom type declarations support the new bun:test suite.

The local gate requires zero ESLint warnings.
Seventeen old warnings are resolved without disabling lint rules.
React renders consume clock state and external-store snapshots.
Fast ping reads the current buffer policy instead of the initial closure.
Biome configuration uses its installed schema and existing tab style.
The removed Next.js eslint option was no longer supported; ESLint remains an explicit gate.

## Verification

`just check` passed: lint has zero warnings, TypeScript passes, 88 existing tests and four shell tests pass, Go test succeeds, and production build succeeds.
The fast-ping test failed with four retained messages after setting the limit to one, then passed after the repair.
The virtual-row snapshot test failed before the adapter published updates, then passed.
A visible-row filtering test caught stale snapshot indices; missing rows are now skipped until the subscription updates.
CI browser files use runner.temp instead of an unexpanded tilde path inside the repository.
The setup-just composite dependency setup-crate is allowed.
CI still needs to verify browser tests, real WebSocket tests, and k6 scenarios.

## Next Actions

1. Create a ready PR from ci/remove-flatt.
2. Verify every CI check and squash merge.
3. Remove only the Flatt Actions allowlist patterns and verify main.

## Context

The root justfile is the task entry point.
Deployment tasks need separate production authorization.
Historical decision-queue entries are preserved.
