# Development & Testing Guide

This project follows a Tidy First → Tests workflow. This document collects the engineering notes that were previously embedded in the README and expands on validation, testing, scenarios, and performance behavior.

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
    - `error.code` must be an integer (strict). Non‑integer codes are rejected.
    - `error.message` must be a string.
    - `error.data` is allowed and may be any type (object/array/string/number/boolean/null).
    - Reserved ranges are permitted but produce warnings:
      - `-32099 .. -32000` (server error range) → warning: reserved range.
      - `-32768 .. -32000` (other reserved predefined codes) → warning: reserved code.
- Batches
  - A batch must be a non‑empty array.
  - Validation is applied per item; errors/warnings are aggregated with indexed context (e.g., `[Item 2] ...`).
  - Mixed notifications + requests (or result + error in response batches) are allowed, subject to each item’s validity.

### Batch Response Matching (UI linking)

When linking a received batch response back to its pending request in the UI, the matcher default is strict `all` mode:

- `all` mode (default): All request IDs of the pending batch must be present in the response for it to be linked.
- `any` mode (optional): Any overlap is sufficient for linking (not enabled by default to avoid accidental mis‑linking).

The matcher lives in `lib/batch-match.ts` and supports `{ mode: 'all' | 'any' }`. The `hooks/use-websocket-client.ts` currently passes `{ mode: 'all' }`.

## Boundary Behavior (Not Enforced Limits)

The validator does not enforce additional operational limits. In particular:

- Request `id` length: no explicit limit – very long string IDs are accepted.
- Params size: no explicit limit – large arrays/objects are accepted.
- Empty string `id`: accepted (string is allowed by the spec).

If you want to add configurable limits (e.g., maximum `id` length or maximum params size):

1. Add Red tests that encode the new policy (and document the reasoning).
2. Green by implementing warnings (soft) or errors (hard), guarded behind configuration to avoid breaking existing flows.
3. Document the policy and defaults in this document and the README summary.

## How We Test

- Unit tests: Vitest (`pnpm test:unit`).
- Small utilities: Node’s built‑in test runner via `npm test`.
- WebSocket/Dummy stream logic lives in `hooks/use-websocket-client.ts` and is tested with dependency injection (timers/WebSocket factory) for determinism.

### Scenario Tests (k6)

Use k6 for executable WebSocket scenarios (native WS support). Scenarios live under `tests/k6/`.

- Install k6 (one‑time):
  - macOS: `brew install k6`
  - Others: https://k6.io/docs/getting-started/installation/
- Target URL: set `K6_WS_URL` (defaults to `ws://localhost:9999/ws`).
  - Example: `export K6_WS_URL=ws://localhost:9999/ws`
- Timeout: set `K6_WS_TIMEOUT_MS` (defaults to `5000`).
  - Example: `export K6_WS_TIMEOUT_MS=8000`

Local run:

- Direct: `K6_WS_URL=ws://localhost:9999/ws k6 run ./tests/k6/basic-jsonrpc-ws.js`
- With just (all scenarios): `just k6 ws_url="ws://localhost:9999/ws"`
- With npm script (single scenario): `K6_WS_URL=ws://localhost:9999/ws npm run k6:ws`

Additional scenarios:

- Batch: `k6 run ./tests/k6/batch-jsonrpc-ws.js`
- Error response: `k6 run ./tests/k6/error-jsonrpc-ws.js`
- Notification stream: `k6 run ./tests/k6/notification-stream-ws.js`
- Large batch (config: `K6_BATCH_SIZE`, `K6_PAYLOAD_KB`, `K6_WS_TIMEOUT_MS`): `k6 run ./tests/k6/large-batch-jsonrpc-ws.js`
- Latency (records Trend `ws_resp_time_ms`; config: `K6_LATENCY_REQS`, `K6_LATENCY_GAP_MS`, `K6_P95_MS`, `K6_PAYLOAD_KB`, `K6_WS_TIMEOUT_MS`): `k6 run ./tests/k6/latency-jsonrpc-ws.js`

k6 Cloud (public WS only):

- Basics
  - Direct: `k6 cloud ./tests/k6/basic-jsonrpc-ws.js -e K6_WS_URL=wss://your-server/ws -e K6_WS_TIMEOUT_MS=5000`
  - With npm: `K6_WS_URL=wss://your-server/ws npm run k6:cloud`
  - Archive: `npm run k6:archive` → `k6 cloud -e K6_WS_URL=wss://your-server/ws script.tar`
  - Note: Use `-e NAME=VALUE` to pass env to k6 Cloud, or export env before invoking.
- Other scenarios (examples)
  - Batch: `k6 cloud ./tests/k6/batch-jsonrpc-ws.js -e K6_WS_URL=wss://your-server/ws -e K6_WS_TIMEOUT_MS=5000`
  - Error: `k6 cloud ./tests/k6/error-jsonrpc-ws.js -e K6_WS_URL=wss://your-server/ws -e K6_WS_TIMEOUT_MS=5000`
  - Notification: `k6 cloud ./tests/k6/notification-stream-ws.js -e K6_WS_URL=wss://your-server/ws -e K6_WS_TIMEOUT_MS=5000`
  - Large batch: `k6 cloud ./tests/k6/large-batch-jsonrpc-ws.js -e K6_WS_URL=wss://your-server/ws -e K6_BATCH_SIZE=200 -e K6_PAYLOAD_KB=2 -e K6_WS_TIMEOUT_MS=20000`
  - Latency: `k6 cloud ./tests/k6/latency-jsonrpc-ws.js -e K6_WS_URL=wss://your-server/ws -e K6_LATENCY_REQS=50 -e K6_LATENCY_GAP_MS=100 -e K6_P95_MS=1500 -e K6_PAYLOAD_KB=1 -e K6_WS_TIMEOUT_MS=10000`

Tip: k6 Cloud requires your WS endpoint to be reachable over the internet (e.g., `wss://`). Self‑signed or private endpoints will fail TLS/handshake.

Local server helper (optional):

- Start local Go server and run all k6 scenarios: `just k6-local`
  - Starts `scripts/ws-jsonrpc-server` on `:9999` (path `/ws`), waits for readiness, runs scenarios with `K6_WS_URL=ws://localhost:9999/ws`. Stop is automatic on exit.

### E2E Tests (Playwright)

- One‑time setup: `pnpm install && pnpm playwright:install`
- Run: `pnpm test:e2e` (or `just e2e`)

Configuration:

- `playwright.config.ts` auto‑starts Next dev via `webServer.command: pnpm dev`.
- Example: `e2e/basic.spec.ts` covers top page → Dummy Mode → Connect → Connected (no backend required).
- Example: `e2e/devtools-analog.spec.ts` covers inputs, clicks, dialogs, file upload, and title checks on a single page.

Real WebSocket (optional):

- Enable by setting `E2E_REAL_WS_URL` to your WS URL.
  - macOS/Linux: `export E2E_REAL_WS_URL="wss://your-server.example/ws"`
  - Windows PowerShell: `$env:E2E_REAL_WS_URL="wss://your-server.example/ws"`
- Run: `pnpm test:e2e` (or local server: `pnpm test:e2e:real` / `just e2e-real`)
- Target: `e2e/fast-ping-realws.spec.ts` verifies Fast Ping ON/OFF behavior under a real WS.

Note: Fast JSONRPC Ping (100ms) only sends on a real WS connection. The UI toggle operates in Dummy Mode but does not transmit to keep local runs deterministic.

#### Local real WS server (Go)

For local development, a minimal Go WS server is bundled.

- Location: `scripts/ws-jsonrpc-server` (uses `github.com/gorilla/websocket`)
- Start:
  - `cd scripts/ws-jsonrpc-server`
  - `go run . --addr :9999 --path /ws`
- Connect URL: `ws://localhost:9999/ws`
- E2E tips:
  - Start Next dev in another terminal: `pnpm dev`
  - Export `E2E_REAL_WS_URL=ws://localhost:9999/ws`
  - Run `pnpm test:e2e` or `pnpm test:e2e:real` (or `just e2e-real`)

Supported methods:

- `ping` → returns `{ "jsonrpc":"2.0", "result": {"pong": true}, "id": <same> }`
- Batch is supported (notifications are not responded to)

Security note: the local server accepts any origin (development only). Do not expose it as‑is to the internet.

## Reconnect Policy

`hooks/use-websocket-client.ts` supports dependency‑injected policy. Defaults are backward‑compatible exponential backoff (base=500ms, cap=4000ms, no jitter).

- Defaults
  - Backoff: `delay = baseMs * 2^attempt` (first attempt=0)
  - Clamp by `maxMs`
  - Jitter: none (inject a function if needed)
  - Success resets attempt; `disconnect()` cancels scheduled reconnect
  - Dummy Mode does not schedule reconnects

- Options (DI)
  - `baseMs?: number` (default 500)
  - `maxMs?: number` (default 4000)
  - `jitter?: (delayMs: number, attempt: number) => number`

Usage (test/embedded):

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

Unit tests: see `tests/use-websocket-reconnect-policy.test.tsx`.

## Buffer Strategy & Virtualization

- Strategy presets are documented in `docs/strategy-presets.md`.
- Message list uses `@tanstack/react-virtual` to render only visible rows.
- Size estimation (`lib/virtual-estimate.ts`):
  - Base heights: 28px (header), 88px (message)
  - Heuristics: increases for large payloads, large batches, and validation issues
- Runtime control: In Performance → Settings, set Row Height Estimate to Heuristic or Fixed (88px). Measurement (`measureElement`) refines sizes during interaction.

## Quick Filter Presets

- Method:user — filter by method substring (case‑insensitive contains)
- ID:1 — exact match against any JSONRPC id (including batch items and `Message.requestId`)
- Text:error — filter by payload substring (case‑insensitive contains over the JSON string)
- Reset Preset — clears the preset

Notes:

- Presets combine with any `quickFilter` prop supplied to `MessageList` (merged semantics).
- The top counts (All/Sent/Recv/Notif/Err) reflect the filtered set, not the raw message buffer.
- Logic: `lib/message-search.ts` (UI in `components/message-list.tsx`).
- Unit tests: `tests/message-list.presets.test.tsx`.

## Export (Filtered View)

The “Export” button in the Message list header exports only the currently filtered rows (not the entire buffer).

- Serialization: `lib/export.ts` (ISO timestamps, reversible round‑trip)
- Filename scheme:
  - Unfiltered: `messages-<timestamp>.json`
  - Filtered: `messages-filtered-(method|id|text)-<value>-<timestamp>.json`
    - Value sanitized: lowercased; non‑alphanumeric collapsed to `-`; repeated dashes trimmed
    - When multiple quick filter fields exist, precedence is `method > id > text`
- Unit tests: `tests/export-filtered-view.test.tsx`

## Security: Content Security Policy (CSP)

When embedding this app or deploying under strict CSP, ensure:

- Only allow WebSocket endpoints you trust, e.g.: `connect-src 'self' wss://your-rpc.example.com ws://localhost:8080`.
- Disallow `unsafe-inline` for scripts and styles; Next.js provides hashed styles/scripts by default. Example baseline:
  - `default-src 'self'`
  - `script-src 'self' 'strict-dynamic'`
  - `style-src 'self'` (or `'self' 'unsafe-inline'` for dev only)
  - `img-src 'self' data:`
  - `connect-src 'self' ws: wss:`

## Ping / Fast Ping and Counters

- Single Ping: The Connection tab “Ping” button sends a single `method: "ping"` JSON‑RPC request.
- Fast Ping: When “Fast JSONRPC Ping (100ms)” is ON, the app sends `method: "ping"` every 100ms while connected to a real WS (no sends in Dummy Mode).

Counters (`lib/ping-stats.ts`):

- `Pings` (totalPings): count of sent `method:"ping"` with a `requestId`
- `Matched` (matched): count of received responses with the same `id`
- `Missing` (missing): `Pings - Matched`

Where shown:

- Connection panel badges/headers and the Performance tab “Ping / Pong” card
- E2E tests: `e2e/ping-stats.spec.ts`, `e2e/fast-ping-badge.spec.ts`, `e2e/fast-ping-realws.spec.ts` (requires `E2E_REAL_WS_URL`)

