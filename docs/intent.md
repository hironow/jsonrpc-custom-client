# Intent

**Last updated:** 2026-06-10
**Requester:** hironow
**Status:** DRAFT — AI が README / git 履歴から起草。requester 未確認
**Work unit:** jsonrpc-custom-client — Next.js + React UI to explore JSON-RPC over WebSocket

## Goal
Provide a Next.js + React UI for exploring JSON-RPC 2.0 over WebSocket: connect to a WS endpoint (or a built-in Dummy Mode), send requests, and inspect messages, backed by a configurable ring buffer with strategy presets (per README and `docs/`).

## Success Criteria
- GitHub Actions CI (`.github/workflows/ci.yaml`) is green (`just test-ci`).
- Unit tests pass (`bun run test:unit`, Vitest) and Playwright e2e passes (`just e2e`; `just e2e-real` against a real WS server).
- k6 WS load-test scripts under `tests/k6/` run against a target server (`just k6-local`).

## Scope
### In scope
- The WebSocket client UI (connection panel, dummy mode, message detail, buffer strategy presets — README, `docs/user-guide.md`, `docs/strategy-presets.md`).
- A deployable companion WS server (`just deploy-ws-server` targets Cloud Run in asia-northeast1; the README points the default env at a bundled Go server on `ws://localhost:9999/ws`).
- Testing assets: Vitest unit tests, Playwright e2e, k6 load scenarios.

### Out of scope (Non-goals)
- 未確認 — no explicit non-goals are documented in the repo.

## Constraints
- Package manager is bun (`bun.lock`).
- Recently upgraded to Next.js 16 (commit a6096fd, PR #30).
- MIT licensed (`LICENSE`).
- Contribution workflow follows Tidy First → Tests (README "Notes for Contributors", `docs/development.md`).

## Open Questions
- [ ] requester による本ドラフトのレビュー
- [ ] Hosting target for the UI itself (a `NEXT_PUBLIC_ENABLE_ANALYTICS` flag for Vercel Analytics exists, but a deployment target is not documented).
- [ ] Purpose and status of the top-level `agents/` directory (not covered by README or docs).
- [ ] Performance/latency goals for the k6 scenarios (scripts exist, but no thresholds are documented as acceptance criteria).
