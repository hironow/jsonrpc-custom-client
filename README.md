# JSON-RPC WebSocket Client – Notes for Contributors

This project is a Next.js + React UI to explore JSON‑RPC over WebSocket. The codebase follows a Tidy First → Tests development style. This document captures validator strictness, current boundaries, and guidance for future work.

## Validator Strict Policy

The JSON‑RPC 2.0 validator (`lib/jsonrpc-validator.ts`) performs the following checks:

- Common
  - `jsonrpc` must be exactly `"2.0"`.
- Requests (`type: 'request'`)
  - `method` is required and must be a string.
  - `params` is optional; if present it must be an array or object.
  - `id` may be a string, number (integer or float), or `null`. Missing `id` is treated as a notification (warning).
- Responses (`type: 'response'`)
  - Must include either `result` or `error` (not both).
  - `id` is required.
  - `error` object (when present)
    - `error.code` must be an integer number (strict). Non‑integer codes are rejected.
    - `error.message` must be a string.
    - `error.data` is allowed and may be any type (object/array/string/number/boolean/null).
    - Reserved ranges are permitted but produce warnings:
      - `-32099 .. -32000` (server error range) → warning: reserved range.
      - `-32768 .. -32000` (other reserved pre‑defined codes) → warning: reserved code.
- Batches
  - A batch must be a non‑empty array.
  - Validation is applied per item; errors/warnings are aggregated with indexed context (e.g. `[Item 2] ...`).
  - Mixed notifications + requests (or result + error in response batches) are allowed, subject to each item’s validity.

### Batch Response Matching Policy (UI linking)

When linking a received batch response back to its pending request in the UI, the matcher default is strict `all` mode:

- `all` mode (default): All request IDs of the pending batch must be present in the response for it to be linked.
- `any` mode (optional): Any overlap is sufficient for linking (not enabled by default to avoid accidental mis‑linking).

The matcher lives in `lib/batch-match.ts` and supports `{ mode: 'all' | 'any' }`. The `hooks/use-websocket-client.ts` currently passes `{ mode: 'all' }`.

## Current Boundary Behavior (Not Enforced Limits)

The validator does not enforce additional operational limits. In particular:

- Request `id` length: no explicit limit – very long string IDs are accepted.
- Params size: no explicit limit – large arrays/objects are accepted.
- Empty string `id`: accepted (string is allowed by the spec).

These boundaries are intentionally left to the application/operator policy. If you want to add configurable limits (e.g., maximum `id` length or maximum params size), prefer:

1) Add Red tests that encode the new policy (and document the reasoning).
2) Green by implementing warnings (soft) or errors (hard), guarded behind configuration to avoid breaking existing flows.
3) Document the policy and defaults here.

## How We Test

- Vitest is used for unit tests: `pnpm test:unit`.
- Node’s built‑in test runner is used for small utilities: `npm test`.
- WebSocket/dummy‑stream logic lives in `hooks/use-websocket-client.ts` and is tested with DI (timers/WebSocket factory) for determinism.

### Scenario Tests (runn)

Scenario tests under `tests/runn/` describe realistic agent flows (A2A) using JSON‑RPC 2.0 over WebSocket from the agent perspective. They complement unit/integration tests and are not executed in CI by default. See `tests/runn/basic.jsonrpc.yml` for a starter.

### E2E Tests

Playwright を使ったE2Eテストを同梱し、CIでも実行しています。

- 依存関係のセットアップ（初回のみ）
  - `pnpm install`
  - `pnpm playwright:install`

- 実行: `pnpm test:e2e`（または `just e2e`）

構成:
- `playwright.config.ts` は Next 開発サーバを `webServer.command: pnpm dev` で自動起動します。
- サンプル: `e2e/basic.spec.ts` はトップページ表示→Dummy Mode→Connect→Connected表示までを検証します（バックエンド不要）。
- 追加: `e2e/devtools-analog.spec.ts` は DevTools 相当の操作（入力/クリック/ダイアログ/ファイルアップロード/タイトル）を単一ページ上で検証します。

## Reconnect Policy

`hooks/use-websocket-client.ts` は自動再接続のポリシーをDI可能です。既定値のままでも後方互換の指数バックオフで動作します（base=500ms、cap=4000ms、jitterなし）。

- 既定動作
  - バックオフ: `delay = baseMs * 2^attempt`（初回 attempt=0）
  - 上限: `maxMs` でクランプ
  - ジッタ: なし（必要なら関数を注入）
  - 成功で attempt リセット、`disconnect()` で予約済み再接続はキャンセル
  - Dummy Mode 時は再接続スケジュールを行いません

- オプション（DI）
  - `baseMs?: number` 初期ディレイ（既定 500）
  - `maxMs?: number` 遅延上限（既定 4000）
  - `jitter?: (delayMs: number, attempt: number) => number` ジッタ関数

- 使用例（テスト/埋め込み向け）

```ts
import { useWebSocketClient } from "@/hooks/use-websocket-client";

export function MyClient() {
  const { status, connect, disconnect } = useWebSocketClient({
    reconnect: {
      baseMs: 300,
      maxMs: 2000,
      jitter: (delay, attempt) => Math.min(delay + 100, 2000),
    },
  });
  /* ... */
}
```

- テスト
  - ポリシーの単体テストは `tests/use-websocket-reconnect-policy.test.tsx` を参照。
  - タイマー/WSはDIされ、偽タイマーで決定的に検証します。

## Development Style

- Tidy First → Tests: extract logic and add tests before modifying behavior.
- Keep PRs small and scoped (structural and behavioral changes in separate commits).
- Always escape JSON before highlighting when rendering (see `lib/html-escape.js` and `lib/json-highlight.ts`).

## Performance: Large Message Streams

To keep the UI responsive with large message volumes, a ring buffer is applied in the client hook:

- Implementation: `lib/message-buffer.ts` with `pushWithLimit(prev, message, limit)`.
- Default limit: `NEXT_PUBLIC_MESSAGE_BUFFER_LIMIT` (number, default 2000) — oldest non‑pending messages are dropped first; pending ones are preserved where possible.
- Hook integration: `hooks/use-websocket-client.ts` uses the buffer in `addMessage`.

You can adjust the limit at runtime by setting `NEXT_PUBLIC_MESSAGE_BUFFER_LIMIT` in your environment.

- Runtime control: In the UI, navigate to the Performance tab → Settings and change “Message Buffer Limit”. Lowering the value trims the current buffer immediately; raising it allows more messages to accumulate.

### Buffer Strategy Options

The buffer trimming policy is configurable to better fit your stream characteristics. Options are applied both when adding new messages and when trimming an existing array that exceeds the limit.

- preferPending (default true)
  - Treats messages with `isPending` as preferred. The first pass removes non‑preferred (oldest‑first) when exceeding the limit. If everything at the front is preferred and we still exceed the limit, a forced drop is applied from the front.
- preferBatches (default false)
  - Treats batch request/response entries (`isBatch`) as preferred using the same rule as above. Useful if batch visibility and linking are important during heavy load.
- dropChunkSize (default 1)
  - When a forced drop is necessary (e.g., too many preferred messages at the front), remove this many messages per iteration from the front. Never drops below the configured limit.

How trimming works (conceptually):
1) Compute how many items exceed `limit` (toDrop).
2) Walk from the front, skipping “preferred” items (based on the options) and remove the first non‑preferred until `toDrop` is satisfied or no non‑preferred remain.
3) If the buffer still exceeds `limit`, apply a forced front‑drop in chunks of `dropChunkSize` until length ≤ `limit`.

Runtime control (UI):
- Performance → Settings: toggle “Prefer Pending”, toggle “Prefer Batches”, and set “Drop Chunk Size”. Changes apply immediately; if the buffer is over limit when changing options, it is trimmed to comply.

Programmatic control (hook):
- `useWebSocketClient()` exposes and applies these options:
  - `bufferPreferPending`, `setBufferPreferPending`
  - `bufferPreferBatches`, `setBufferPreferBatches`
  - `bufferDropChunkSize`, `setBufferDropChunkSize`
  - The hook uses `pushWithLimitWithOptions` for inserts and `trimToLimitWithOptions` when the limit or options change.

Backwards compatibility:
- Defaults preserve the prior behavior (pending preferred, batches not preferred, forced drop of one at a time).

### List Virtualization

The message list uses `@tanstack/react-virtual` to render only visible rows.

- Row shaping: The list is flattened to header rows (time buckets) and message rows.
- Size estimation: `lib/virtual-estimate.ts` provides `estimateRowSize` and `estimateMessageHeight`.
  - Base heights: 28px (header), 88px (message)
  - Heuristics: increases for large payloads, large batches, and validation issues.
- Runtime control: In Performance → Settings, “Row Height Estimate” can be set to Heuristic or Fixed (88px). Measurement is still applied via `measureElement` to refine sizes during interaction.

## Quick Filter Presets

The Message list header provides simple, one-click presets to quickly narrow the view:

- Method:user — filters by method substring (case-insensitive contains)
- ID:1 — filters by an exact match against any JSON-RPC id (including batch items and `Message.requestId`)
- Text:error — filters by payload substring (case-insensitive contains over the JSON string)
- Reset Preset — clears the preset filter

Notes:
- Presets combine with any `quickFilter` prop supplied to `MessageList` (merged semantics).
- The top counts (All/Sent/Recv/Notif/Err) reflect the filtered set, not the raw message buffer.
- See logic in `lib/message-search.ts`; UI wiring in `components/message-list.tsx`.
- Unit tests: `tests/message-list.presets.test.tsx`.

## Export (Filtered View)

The “Export” button in the Message list header exports only the currently filtered rows (not the entire buffer). This allows sharing exactly what you’re viewing.

- Serialization: via `lib/export.ts` (ISO timestamps, reversible round-trip)
- Filename scheme:
  - Unfiltered: `messages-<timestamp>.json`
  - Filtered: `messages-filtered-(method|id|text)-<value>-<timestamp>.json`
    - Value is sanitized: lowercased, non-alphanumeric collapsed to `-`, trim repeated dashes
    - When multiple quick filter fields exist, precedence is `method > id > text`
- Unit tests: `tests/export-filtered-view.test.tsx`


## Security: Content Security Policy (CSP)

When embedding this app or deploying under strict CSP, ensure:

- Only allow WebSocket endpoints you trust, e.g.: `connect-src 'self' wss://your-rpc.example.com ws://localhost:8080`.
- Disallow `unsafe-inline` for scripts and styles; Next.js provides hashed styles/scripts by default. Example baseline:

  - `default-src 'self'`
  - `script-src 'self' 'strict-dynamic'` (Next 14 generates nonces)
  - `style-src 'self'` (or `'self' 'unsafe-inline'` if unavoidable for dev)
  - `img-src 'self' data:`
  - `connect-src 'self' ws: wss:`

Local development often needs a permissive CSP; tighten in production and test thoroughly prior to rollout.
