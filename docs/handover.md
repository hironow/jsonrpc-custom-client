# Handover

**Last updated:** 2026-06-10 (JST)
**Updated by:** claude (AI draft from git history — review before trusting)

## Current State
A working UI (screenshots in `assets/snapshots/`) with user/developer documentation under `docs/` (user-guide, development, strategy-presets). Recent work: visualization test added (#27), dependency consolidation and dead-code removal (#29), patch updates (#28), Next.js 15 → 16 upgrade (#30). The last meaningful commit is `b59de17` "docs: add decision queue for human-review items (#31)" on 2026-06-10.

## In Progress
不明 (git 履歴からは判別できず) — recent commits are docs and dependency maintenance.

## Next Actions
1. requester による docs/intent.md ドラフトのレビューと確定
2. Watch `docs/decision-queue.md` for human-review items (currently "(none yet)").

## Known Risks / Blockers
- The Next.js 16 upgrade (PR #30) is recent; regressions would surface via CI/e2e rather than docs.

## Context the Next Actor Needs
- Use bun (lockfile present); tasks are wrapped by the root `justfile`.
- `just e2e-real` and `bun run test:e2e:real` expect a real WS server at `ws://localhost:9999/ws`; default e2e runs without it.
- `just deploy-ws-server` deploys a WS server to Cloud Run (asia-northeast1) — coordinate before touching deployment defaults.
- Contribution workflow is Tidy First → Tests; see `docs/development.md`.

## Relevant Files and Commands
- `docs/development.md` — development and testing policies
- `docs/user-guide.md` / `docs/strategy-presets.md` — UI usage and buffer strategies
- `justfile` — `just test-ci` / `just e2e` / `just e2e-real` / `just k6-local` / `just deploy-ws-server`
- `bun run dev` — local dev server at http://localhost:3000
- `.env.example` — `NEXT_PUBLIC_WS_URL_DEFAULT` (bundled Go server: `ws://localhost:9999/ws`), buffer limit, analytics flag
