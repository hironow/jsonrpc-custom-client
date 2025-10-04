**Project Handover Plan (Tidy First → Tests)**

This document describes the current status, guiding principles, and the concrete next tasks to continue development in a Tidy First → Tests cadence. It serves both as an engineering plan and a handover guide.

**Context & Current State**
- App: Next.js + React (App Router) JSON‑RPC WebSocket client UI with Dummy Mode, batch sending, linked request/response visualization, statistics, and validation.
- Recent structural changes (Tidy First):
  - Added shared types: `types/connection.ts` (ConnectionStatus), `types/message.ts` (Message). All components now import these.
  - Centralized logic:
    - Message linking: `lib/message-link.ts` (findLinkedMessage), used by UI.
    - Batch response matching: `lib/batch-match.ts` (matchBatchResponse), used by WebSocket handler.
    - JSON rendering: `lib/html-escape.js` (escapeHtml) and `lib/json-highlight.ts` (highlightEscapedJson). UI escapes + highlights safely.
  - Began extracting connection/IO logic into a hook: `hooks/use-websocket-client.ts` (not yet fully wired throughout; see tasks below).
- Recent behavioral fixes (with tests):
  - JSON‑RPC validator now treats incoming notifications (no id + method) as requests for spec validation.
  - Batch response linkage and response time computation added.
  - XSS mitigation for message detail view (escape before highlighting).
- Tests (Vitest + Node’s built‑in test):
  - Unit tests for validator, message linking, batch matching, JSON highlighting.
  - Hook integration test scaffolding added (skipped for now due to timer environment instability).

**Guiding Principles**
- Tidy First → Tests: first isolate and simplify structure (no behavior change), then add tests; only then modify behavior.
- TDD cycle: Red → Green → Refactor. Small increments; clear, meaningful test names.
- Commit discipline: small, focused commits; separate structural from behavioral changes; ensure tests pass at each step.

**Immediate Tasks (Tidy First → Tests)**
1) Complete `useWebSocketClient` integration (Tidy First)
   - Goal: Move the remaining connection/IO and timer logic entirely into `hooks/use-websocket-client.ts`; keep `components/websocket-client.tsx` as a pure presenter.
   - Actions:
     - Remove any leftover WebSocket refs/timers from the component.
     - Ensure hook exports: `{ url, setUrl, status, messages, dummyMode, setDummyMode, connect, disconnect, sendMessage, sendBatchMessage, clearMessages }` are the sole interface.
     - Keep UI behavior unchanged (no visible/functional regressions).

2) Stabilize `useWebSocketClient` tests (Tests)
   - Goal: Deterministic tests for Dummy Mode and (optionally) WebSocket mode.
   - Actions:
     - Introduce a tiny abstraction for timers inside the hook (e.g., `Timer` interface with `setTimeout`, `setInterval`, `clear*`) and allow DI (defaulting to global timers). This enables clean fake timer control in Vitest.
     - (Optional) Introduce a `createWebSocket(url)` factory parameter (DI) to allow a fake WebSocket in tests.
     - Re‑enable and fix `tests/use-websocket-client.test.tsx` by controlling timers (vi.useFakeTimers), advancing time for activation and streaming, and asserting state transitions and message count.
     - Keep test focused on hook behavior (avoid unrelated UI assertions).

3) Expand JSON‑RPC validator coverage (Tests)
   - Goal: Cover edge cases thoroughly to prevent regressions.
   - Actions:
     - Request validation:
       - `id` types: string/number/null; negative/float; duplicate within batch (warning vs. ignore? document expected behavior).
       - `params` complex nesting (object/array), empty params, unexpected types in arrays.
       - `method` namespace patterns (e.g., `a.b.c`) are allowed (spec doesn’t forbid) — document behavior.
     - Response validation:
       - `error` object fields: optional `data` any; validate presence of `code` (number) and `message` (string).
       - Mixed responses in batch: some errors, some results; ensure aggregated errors/warnings are correct.
     - Batch validation:
       - Mixed notifications + requests; duplicate IDs across items; empty item shapes.
     - For any identified spec ambiguity, encode expectation in tests and document it in code comments for future maintainers.

4) Consolidate JSON rendering utilities (Tidy First)
   - Goal: Enforce a single path for escaping + highlighting.
   - Actions:
     - Ensure `components/message-detail-sidebar.tsx` only uses `escapeHtml` + `highlightEscapedJson` (done). Audit other components rendering JSON (none expected) for consistency.
     - Add a quick unit test explicitly covering strings that include `<`, `>`, `&`, quotes, and backslashes to guard against regressions.

5) Lint/TypeScript quality gates (Tidy First)
   - Goal: Return to standard quality gates.
   - Actions:
     - In `next.config.mjs`, plan to remove `ignoreBuildErrors` and `ignoreDuringBuilds` after test suite is stable.
     - Run `pnpm lint`/`tsc --noEmit` and address warnings/errors incrementally.
     - Keep commits small and scoped per fix.

**Short‑Term Enhancements (Post‑Stabilization)**
- WebSocket robustness (behavioral):
  - Optional auto‑reconnect with backoff and jitter.
  - Configurable default URL via env.
  - Graceful shutdown on unmount (hook already clears timers; ensure WebSocket is closed reliably in all cases).
- UI/UX:
  - Virtualize the message list for very long sessions.
  - Filter presets / quick search (by method, id, range).
  - Export messages to JSON.
- Security:
  - CSP recommendations in README.
  - Additional sanitization summary in the plan for any future HTML‑rendered content.

**How to Run**
- Dev server: `pnpm dev` → open http://localhost:3000
  - Dummy Mode: toggle in Connection panel → Connect → messages will stream.
  - Real WebSocket: set URL (e.g., `ws://localhost:8080`) → Connect.
- Tests:
  - Unit (Vitest): `pnpm test:unit`
  - Node built‑in tests: `npm test`

**Acceptance Criteria for Immediate Tasks**
- Hook integration complete: `components/websocket-client.tsx` should no longer instantiate or manage `WebSocket`/timers directly.
- Hook tests: Deterministic passing tests for Dummy Mode state transitions and message generation (unskipped).
- Validator tests: Coverage expanded to include additional id/params/error/data cases and mixed batch scenarios.
- JSON rendering: All JSON displays escape `<`, `>`, `&` before highlighting; tests cover representative strings.
- Quality gates: Lint/TS checks run clean locally; configuration no longer ignores errors.

**Risks & Mitigations**
- Timer/async flakiness in tests:
  - Mitigation: DI a simple timer abstraction; exclusively use fake timers; avoid real setInterval in tests.
- WebSocket environment differences:
  - Mitigation: DI a WebSocket factory for tests; keep real implementation as default in production.
- Over‑refactoring:
  - Mitigation: Keep changes small; assert behavior via tests between each step; avoid mixing structural with behavioral changes.

**File Map (Key Artifacts)**
- `types/connection.ts` — ConnectionStatus type (shared)
- `types/message.ts` — Message type (shared)
- `lib/message-link.ts` — findLinkedMessage(message[], message)
- `lib/batch-match.ts` — matchBatchResponse(pendingBatches, responseIds, now)
- `lib/html-escape.js` — escapeHtml(text)
- `lib/json-highlight.ts` — highlightEscapedJson(escapedJson)
- `hooks/use-websocket-client.ts` — Central IO/stream/timer/validation hook (to finalize integration)
- `components/websocket-client.tsx` — UI container (should be presenter only after integration)
- `tests/*.test.ts[x]` — Unit tests (Vitest) and Node built‑in tests

**Commit & Review Checklist**
- The change is a single logical unit; structural and behavioral changes are separate commits.
- All tests (unit + node) pass locally.
- Lint/TS warnings addressed or justified.
- PR includes brief rationale and a test plan.

**Suggested Next‑Commit Sequence**
1) Hook timer/WebSocket DI + unskip hook tests (Tests).
2) Finish moving remaining logic from component to hook (Tidy First).
3) Expand validator tests for id/params/error edge cases (Tests).
4) Re‑enable lint/TS gates and fix violations (Tidy First).
5) Optional: Add CI workflow (Vitest + Node tests) and a basic README “How to run tests”.

**Notes for Successor**
- Keep the Tidy First → Tests loop tight. When in doubt, extract logic to small pure helpers first, write tests, then modify behavior.
- Prefer DI for side‑effects (timers / WebSocket). It makes tests simpler and the code more modular.
- Maintain the JSON safety invariant: escape before highlight, never render raw innerHTML from untrusted data.

