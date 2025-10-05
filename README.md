# JSONRPC WebSocket Client – Notes for Contributors

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

### Scenario Tests (k6)

For JSON‑RPC over WebSocket scenarios, use k6 (native WS support). Scenarios live under `tests/k6/`.

- Install k6 (one-time):
  - macOS: `brew install k6`
  - Others: <https://k6.io/docs/getting-started/installation/>
- Target URL: set `K6_WS_URL` (defaults to `ws://localhost:9999/ws`).
  - Example: `export K6_WS_URL=ws://localhost:9999/ws`
- Timeout: set `K6_WS_TIMEOUT_MS` (defaults to `5000`).
  - Example: `export K6_WS_TIMEOUT_MS=8000`

Local run:

- Direct: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/basic-jsonrpc-ws.js`
- With just: `just k6 ws_url="ws://localhost:9999/ws"`
- With npm script: `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws`

Additional scenarios:

- Batch
  - Direct: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/batch-jsonrpc-ws.js`
  - just: `just k6-batch ws_url="ws://localhost:9999/ws"`
  - npm: `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws:batch`
- Error response
  - Direct: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/error-jsonrpc-ws.js`
  - just: `just k6-error ws_url="ws://localhost:9999/ws"`
  - npm: `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws:error`
- Notification stream
  - Direct: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/notification-stream-ws.js`
  - just: `just k6-notify ws_url="ws://localhost:9999/ws"`
  - npm: `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws:notify`
- Large batch (config: `K6_BATCH_SIZE`, `K6_PAYLOAD_KB`, `K6_WS_TIMEOUT_MS`)
  - Direct: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/large-batch-jsonrpc-ws.js`
  - just: `just k6-large-batch ws_url="ws://localhost:9999/ws"`
  - npm: `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws:large-batch`
- Latency (records Trend metric `ws_resp_time_ms`; config: `K6_LATENCY_REQS`, `K6_LATENCY_GAP_MS`, `K6_PAYLOAD_KB`, `K6_P95_MS`, `K6_WS_TIMEOUT_MS`)
  - Direct: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/latency-jsonrpc-ws.js`
  - just: `just k6-latency ws_url="ws://localhost:9999/ws"`
  - npm: `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws:latency`

Cloud run (public WS only):

- Direct: `K6_WS_URL=wss://your-server/ws k6 cloud ./tests/k6/basic-jsonrpc-ws.js`
- With npm script: `K6_WS_URL=wss://your-server/ws npm run k6:cloud`
- Archive alternative: `npm run k6:archive` → `k6 cloud -e K6_WS_URL=wss://your-server/ws script.tar`

Local server helper (optional):

- Start local Go server and run k6 in one go: `just k6-local`
  - Starts `scripts/ws-jsonrpc-server` on `:9999` (path `/ws`), waits for readiness, then runs the k6 scenario with `K6_WS_URL=ws://localhost:9999/ws`.
  - Stop is automatic on exit (idempotent).

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

#### Real WebSocket (optional)

実WebSocketでの Fast Ping のON/OFF を検証するテストを用意しています（既定は skip）。

- 環境変数: `E2E_REAL_WS_URL` に接続先WS URLを設定すると有効化されます。
  - 例（macOS/Linux）: `export E2E_REAL_WS_URL="wss://your-server.example/ws"`
  - 例（Windows PowerShell）: `$env:E2E_REAL_WS_URL="wss://your-server.example/ws"`
- 実行: `pnpm test:e2e`（またはローカルサーバの場合 `pnpm test:e2e:real` / `just e2e-real`）
- 対象: `e2e/fast-ping-realws.spec.ts`
- 振る舞い: 接続後に「Fast JSONRPC Ping (100ms)」をON→`Ping`総数が増えることを確認→OFF→一定時間後も総数が増えないことを確認

注: Dummy ModeのままでもUI上はトグル可能ですが、100ms送信は実WS接続時のみ動作します（E2Eのため）。

##### Local real WS server (Go)

ローカルで簡単に実WSを用意するため、Go製の最小サーバを同梱しています。

- 配置: `scripts/ws-jsonrpc-server`（`go.mod` 同梱、依存: `github.com/gorilla/websocket`）
- 起動例:
  - `cd scripts/ws-jsonrpc-server`
  - `go run . --addr :9999 --path /ws`
- 接続URL: `ws://localhost:9999/ws`
- 使い方（E2E）:
  - 別ターミナルで Next dev を起動: `pnpm dev`
  - 本READMEの上記URLを環境変数に: `export E2E_REAL_WS_URL=ws://localhost:9999/ws`
  - E2E実行: `pnpm test:e2e` もしくは `pnpm test:e2e:real`（または `just e2e-real`）

対応メソッド:

- `ping` → `{"jsonrpc":"2.0","result":{"pong":true},"id":<same>}` を返却
- Batch も処理します（通知はレスポンス無し）

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

## Dummy Mode DI

Dummy Mode（バックエンド不要の擬似ストリーム）は、テストやデモ用途で挙動を決定的にするための DI ポイントを提供します。

- オプション（`useWebSocketClient` に渡す）
  - `rng?: () => number`
    - 既定: `Math.random`
    - 分岐に使う乱数ソースを差し替えます（例: `rng: () => 0.55` なら一定確率で通知分岐に必ず入る）。
  - `dummy?: { autoRequestIntervalMs?: number; notificationIntervalMs?: number }`
    - `autoRequestIntervalMs` 既定 2500 — ダミーの自動リクエスト/バッチ発火の間隔
    - `notificationIntervalMs` 既定 1500 — ダミーの通知（stream.*）発火の間隔

- 実装（参照）
  - フック: `hooks/use-websocket-client.ts`
    - Dummy Mode の分岐 `Math.random()` を `rng()` に置換
    - 送信・通知の `setInterval` 間隔を `dummy.*` で上書き
  - 単体テスト: `tests/use-websocket-dummy-di.test.tsx`

- 使用例

```ts
import { useWebSocketClient } from "@/hooks/use-websocket-client";

export function DemoClient() {
  const { status, connect, setDummyMode } = useWebSocketClient({
    rng: () => 0.55, // 通知分岐に入りやすい固定値
    dummy: {
      notificationIntervalMs: 100,   // 通知を高速化
      autoRequestIntervalMs: 10_000, // 自動リクエストは抑制
    },
  });
  // ...
}
```

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
- ID:1 — filters by an exact match against any JSONRPC id (including batch items and `Message.requestId`)
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

## Ping / Fast Ping and Counters

- 一回だけのPing: Connectionタブの「Ping」ボタンは `method: "ping"` のJSON‑RPCリクエストを1回送信します。
- 高頻度Ping: 「Fast JSON‑RPC Ping (100ms)」をONにすると、実WS接続中に100ms毎で `method: "ping"` を送信します（Dummy Mode時はUI上ON可能ですが送信は行いません）。

### カウンタの意味と表示場所

- 定義（`lib/ping-stats.ts`）
  - `Pings`（totalPings）: 送信した `method:"ping"` の件数（`requestId` を持つ sent メッセージをカウント）
  - `Matched`（matched）: 同じ `id` を持つ受信メッセージが存在した件数（レスポンス＝pong とみなす）
  - `Missing`（missing）: `Pings - Matched`（未返答のPing数）

- 表示場所
  - Connectionパネル（折りたたみ時）: バッジ `Ping matched/total`（ツールチップで説明表示）
  - Connectionパネル（展開時）: 見出し行の右側に `matched/total` と `missing`（行全体にツールチップ）
  - Performanceタブ: 「Ping / Pong」カード（同じ定義の数値を表示、タイトルにツールチップ）

- E2E
  - `e2e/ping-stats.spec.ts`: 「Ping」ボタンで `matched/total` が `1/1` になり `missing=0` になること、折りたたみ時のバッジ表示を検証
  - `e2e/fast-ping-badge.spec.ts`: Fast PingをONにして折りたたみバッジとツールチップ表示を検証
  - `e2e/fast-ping-realws.spec.ts`（任意）: 実WSでFast PingのON/OFFによる `Pings` の増減（停止）を検証（`E2E_REAL_WS_URL` 必須）
