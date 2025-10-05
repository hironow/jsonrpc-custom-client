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
  - Scenario (k6): tests/k6/* に統一。通知（idなし）を無視し、応答のみを検証するロジックを実装。
    - 追加: `basic-jsonrpc-ws.js`（単発 ping）、`batch-jsonrpc-ws.js`（バッチ）、`error-jsonrpc-ws.js`（エラー応答）、`notification-stream-ws.js`（通知ストリーム）。
    - 追加（拡張）: `large-batch-jsonrpc-ws.js`（大規模バッチ; サイズ/ペイロード可変）, `latency-jsonrpc-ws.js`（遅延計測; Trend `ws_resp_time_ms` + p95 閾値）。
  - npm scripts: `k6:ws`, `k6:cloud`, `k6:archive` に加え、`k6:ws:large-batch`, `k6:ws:latency` を追加。
  - just recipes: `just k6`（引数 `ws_url` 必須・全シナリオ実行）、`just k6-local`（ローカルWS起動後に全シナリオ実行）。
  - E2E (Playwright): playwright.config.ts + e2e/basic.spec.ts（Dummy Mode connect flow）。
- CI
  - .github/workflows/ci.yaml: pnpm install → typecheck/unit → E2E → k6-local（Grafana k6 1.3.0）→ build。
  - k6 セットアップ: grafana/setup-k6-action@v1（version: 1.3.0）。
  - k6 ローカル実行: `just k6-local`（付属 Go WS サーバ起動→k6 実行→停止）。
  - justfile `test-ci` alias（型チェック＋ユニット）。
- Formatting/Lint
  - Biome formatter: .biome.json, `pnpm run format` / `just format`.
  - ESLint via Next: `pnpm run lint` / `just lint`.
- Docs
  - README: CSP guidance、k6/Playwright の実行手順、クラウド実行、タイムアウト設定を追記。
  - docs/strategy-presets.md: バッファ戦略プリセットを追加。
  - 付記: 拡張子を `.yaml` に統一（旧 `.yml` を排除）。

**Tidying/Removals**
- runn 関連（非実行ランブック、just レシピ）を撤去。シナリオは k6 のみ。
- サンプル `scripts/test.js`（HTTP 負荷サンプル）を削除。

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
- Scenario/E2E: `tests/k6/*`, `e2e/*`

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
  - Scenario (k6, local):
    - 直接: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/basic-jsonrpc-ws.js`
    - just: `just k6 ws_url="ws://localhost:9999/ws"`
    - npm: `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws`
    - タイムアウト: `K6_WS_TIMEOUT_MS`（既定 5000）。
  - E2E (local): `pnpm playwright:install` → `pnpm test:e2e`
- CI (local equivalent): `just test-ci`
- Format/Lint: `just format` / `just lint`

**Backlog (Prioritized, TDD‑first)**
（現時点なし）

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

以上。次の着手は「Scenario coverage（k6）をRedから追加」を推奨します。小さくシナリオを書き、必要に応じて補助的なユーティリティを整備（Tidy First）してください。
