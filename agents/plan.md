# JSON-RPC WebSocket Client - Agent Plan

> **Purpose**: AI Agent向けのプロジェクトコンテキストと作業計画

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 + React 19 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + Radix UI |
| Testing | Vitest (unit), Playwright (E2E), k6 (load) |
| Package Manager | pnpm |
| Task Runner | just |

---

## Architecture (Key Files)

```
hooks/use-websocket-client.ts   # Core hook: connection, buffer, reconnect, DI
lib/jsonrpc-validator.ts        # JSON-RPC 2.0 spec validation
lib/message-buffer.ts           # Ring buffer + trim strategies
lib/message-link.ts             # Request ↔ Response linking
lib/batch-match.ts              # Batch response matching
lib/export.ts                   # JSON export utilities
components/websocket-client.tsx # Main UI orchestrator
components/message-list.tsx     # Virtual scroll message list
components/request-form.tsx     # Zod-validated request form
types/message.ts                # Message type definitions
types/connection.ts             # ConnectionStatus union
```

---

## Development Workflow

### TDD (Red → Green → Refactor)

1. Write the simplest failing test first
2. Implement minimum code to pass
3. Refactor only after tests pass
4. Structural/Behavioral commits are separate

### Commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` |
| Unit tests | `pnpm test:unit` |
| E2E tests | `pnpm test:e2e` |
| CI (local) | `just test-ci` |
| Format | `just format` |
| Lint | `just lint` |
| k6 (local) | `just k6-local` |

---

## Quality Gates

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test:unit` green
- [ ] `pnpm lint` clean
- [ ] Biome formatted (`just format`)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| JSDOM lacks `crypto.randomUUID` | Stub in tests (see use-websocket tests) |
| RTL "Multiple elements found" | Use role/name queries or `getAllBy*` |
| Playwright "Connecting…" flaky | Use partial text regex (`/Connecting/`) |
| Timer/async flakiness | `withFakeTimers` + DI timers |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Timer/async flakiness | DI timers, deterministic tests |
| WebSocket env variance | DI wsFactory, Dummy Mode for stability |
| Large payload UI perf | Buffer limit + strategy presets |

---

## Backlog

> TDD-first: Write failing test before implementation

（現時点なし）

---

## Commit Checklist

- [ ] Single logical change per commit
- [ ] Structural vs behavioral separated
- [ ] Tests added/updated
- [ ] All tests pass locally
- [ ] Lint/TS clean
- [ ] Biome formatted
