**Project Handover Plan (Tidy First → Tests)**

This document is the up‑to‑date engineering plan and handover guide for the JSON‑RPC WebSocket client. It reflects what has been done, how to work in this repo (Tidy First → Tests), and what remains.

**Stack & Scope**
- App: Next.js + React (App Router)
- Domain: JSON‑RPC 2.0 over WebSocket (single + batch), dummy stream mode, validation, buffering, linking, and visualization.

**What’s New (since previous handover)**
- RequestForm validation (behavioral + tests)
  - Zod schema for single and batch; UI surfaces method/params errors.
  - Unit tests added: tests/request-form.test.tsx.
- Default URL from env (behavioral + tests)
  - `lib/config.ts:getDefaultWsUrl()` reads `NEXT_PUBLIC_WS_URL_DEFAULT` with fallback `ws://localhost:8080`.
  - Hook initial state uses this getter; tests in tests/use-websocket-default-url.test.tsx.
- Export Messages to JSON (behavioral + tests)
  - Pure helpers: `lib/export.ts` serialize/deserialize with ISO timestamps.
  - “Export” button added to Message list header; unit test for round‑trip: tests/export-json.test.ts.
- Auto‑reconnect (behavioral + tests)
  - Backoff/jitter ready reconnect in `hooks/use-websocket-client.ts` with timer/WebSocket DI.
  - Unit test: tests/use-websocket-reconnect.test.tsx.
- Virtualization (tests)
  - Extreme payload/batch tests ensure height heuristics are capped and step as designed: tests/virtual-estimate.test.ts.
- Scenario/E2E scaffolding
  - Scenario (runn): tests/runn/basic.jsonrpc.yml (agent perspective; not executed in CI).
  - E2E (Playwright): playwright.config.ts + e2e/basic.spec.ts (Dummy Mode connect flow). Local only.
- CI
  - .github/workflows/ci.yml runs: pnpm install, pnpm tsc --noEmit, pnpm test:unit. pnpm cache enabled.
  - justfile `test-ci` alias.
- Formatting/Lint
  - Biome formatter: .biome.json, `pnpm run format` / `just format`.
  - ESLint via Next: `pnpm run lint` / `just lint`.
- Docs
  - README: CSP guidance、Scenario/E2Eの実行手順を追記。
  - docs/strategy-presets.md: バッファ戦略プリセットを追加。

**Current Architecture (Key Files)**
- Types: `types/connection.ts` (ConnectionStatus), `types/message.ts` (Message)
- Validation: `lib/jsonrpc-validator.ts`
- Linking: `lib/message-link.ts` (request/response, batch linking)
- Buffer: `lib/message-buffer.ts` (+ strategy options) and `lib/batch-match.ts`
- Rendering helpers: `lib/html-escape.js`, `lib/json-highlight.ts`
- Export helpers: `lib/export.ts`
- Hook: `hooks/use-websocket-client.ts` (timers/WS DI, buffer, validation, reconnect)
- UI: `components/websocket-client.tsx`, `components/message-list.tsx`, `components/request-form.tsx`, etc.
- Tests: `tests/**/*.test.ts[x]` (Vitest)＋`tests/utils/timers.ts` (fake timers helper)
- Scenario/E2E: `tests/runn/*`, `e2e/*`

**How We Work (AGENTS.md aligned)**
- TDD: Red → Green → Refactor. Write the simplest failing test first.
- Tidy First: separate structural vs. behavioral commits; run tests before/after structural changes.
- Unit test conventions: flat tests, function‑based, no try/catch; share utilities only from `tests/utils/`.

**How to Run**
- Dev: `pnpm dev` → http://localhost:3000
  - Dummy Mode: Connection panel → Dummy Mode ON → Connect
  - Real WS: set URL (`NEXT_PUBLIC_WS_URL_DEFAULT` or UI) → Connect
- Tests
  - Unit: `pnpm test:unit`
  - Scenario (manual): edit/run under `tests/runn/`
  - E2E (local): `pnpm playwright:install` → `pnpm test:e2e`
- CI (local equivalent): `just test-ci`
- Format/Lint: `just format` / `just lint`

**Backlog (Prioritized, TDD‑first)**
1) Search/Filter presets in Message list (behavioral)
   - Red: unit tests for quick filters by method/id/text; ensure totals reflect filter.
   - Green: add lightweight client‑side filter presets to components/message-list.tsx (no heavy UI change required).

2) Message export enhancements (behavioral)
   - Red: tests for selective export (filtered view only) and safe filename generation.
   - Green: export current filtered rows; add filename including method or time range.

3) Reconnect policy tuning (behavioral)
   - Red: tests for jitter bounds and max backoff cap; disconnect should cancel scheduled reconnect.
   - Green: expose DI for jitter fn; config guardrails; add docs.

4) Validator edge cases (tests)
   - Red: add cases for duplicate ids in batch, extreme `error.code` ranges, empty/mixed items.
   - Green: align behavior (error vs warning) and document choices in README.

5) Scenario coverage (runn)
   - Add scenarios for: batch request end‑to‑end, error responses, notification streams.
   - Keep realistic; does not need full unit coverage.

6) E2E smoke expansion (local only)
   - Add basic batch send/receive visibility test in Dummy Mode.
   - Prefer data‑testids for stable locators.

7) Performance/Virtualization (optional)
   - Consider enabling strict measureElement for variable height if list content varies drastically; add perf note in docs.

**Quality Gates**
- `pnpm tsc --noEmit` should pass (CI enforced).
- `pnpm test:unit` must be green (CI enforced).
- Lint must be clean (`pnpm lint`).
- Format with Biome (`pnpm format` / `just format`).

**Risks & Mitigations**
- Timer/async flakiness → withFakeTimers + DI timers; keep tests deterministic.
- WebSocket env variance → DI wsFactory; use Dummy Mode for local/e2e stability first.
- Large payload UI perf → keep buffer limit sane, consider presets (docs/strategy-presets.md).

**Troubleshooting**
- JSDOM lacks `crypto.randomUUID` → stub in tests (see use‑websocket tests).
- “Multiple elements found” in RTL queries → prefer role/name queries or `getAllBy*` where appropriate.
- Playwright “Connecting…” assertion flakiness → use partial text regex (/Connecting/).

**Commit & Review Checklist**
- Single logical change per commit; structural vs behavioral are separate.
- Tests added/updated; all tests pass locally.
- Lint/TS clean; Biome formatted.
- PR description states Red/Green/Refactor and scope.

**Quick Commands**
- Dev: `pnpm dev`
- Unit: `pnpm test:unit`
- E2E (local): `pnpm playwright:install && pnpm test:e2e`
- CI (local): `just test-ci`
- Format/Lint: `just format && just lint`

以上。次の着手は「Message list のクイック検索プリセット（Redから）」を推奨します。小さくテストを書き、Green後に必要なら構造の整理（Tidy First）を行ってください。
