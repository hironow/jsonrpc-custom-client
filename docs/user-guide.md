# JSONRPC WebSocket Client — User Guide

This guide covers practical UI operations for working with JSON‑RPC 2.0 over WebSocket. For developer policies and testing details, see the repository README and documents under `docs/`.

---

## 1. Getting Started

- Install dependencies
  - `pnpm install`
- Start the dev server
  - `pnpm dev` → open `http://localhost:3000` in your browser
- Default WebSocket URL
  - Set `NEXT_PUBLIC_WS_URL_DEFAULT` to change the initial URL shown in the UI.
  - The example in `.env.example` targets the bundled Go server: `ws://localhost:9999/ws`.
  - If unset, the app falls back to `ws://localhost:8080`.

---

## 2. Connect (Connection panel)

- Dummy Mode
  - When ON, the app generates a simulated stream without any backend.
  - Use Connect/Disconnect to start/stop. The URL field is disabled while Dummy Mode is ON.
- Real server connection
  - Turn OFF Dummy Mode, enter a WebSocket URL, and click Connect.
  - Status is shown as a badge: Disconnected / Connecting / Connected / Error.

---

## 3. Sending Requests (Request form)

- Single request
  - Enter the `Method` (e.g., `user.get`).
  - Enter JSON in `Parameters (JSON)`. Use `Format` to pretty‑print.
  - Click `Send Request`. The JSON is validated with Zod; format errors are surfaced in the UI.
- Batch requests
  - Turn ON `Batch Mode`, then `Add Request` to add rows.
  - For each row, set `Method` and `Params (JSON)`.
  - Click `Send Batch` to send all at once.

---

## 4. Messages list

- Header actions
  - `Auto` — toggle auto scroll
  - `Export` — download currently visible messages as JSON
  - `Clear` — clear all messages
- Tabs
  - Filter by `All / Sent / Recv / Notif / Err`. Badges show counts for the currently visible set (after quick filter).
- Time headers
  - The list is grouped by elapsed time; an overlay shows the current time bucket while scrolling.

### Quick filter presets

- `Method:user` — includes messages whose method contains `user`
- `ID:1` — matches JSON‑RPC `id` (single, inside batch items, and `Message.requestId`)
- `Text:error` — includes when the payload JSON contains the substring `error`
- `Reset Preset` — clears the preset

Note: Export includes only the currently visible set (after quick filter). The filename reflects the filter, e.g., `messages-filtered-method-user-YYYY...json`.

---

## 5. Right pane (Details / Notifications)

- Details
  - Click a message to view details. JSON is syntax‑highlighted and HTML‑escaped for safe display.
  - Requests and responses are visually linked, making round‑trips easy to follow.
  - Batches show aligned request/response pairs.
  - JSON‑RPC 2.0 validation errors/warnings appear as badges and lists.
- Notifications
  - Lists only notifications (`isNotification`). Selecting an item shows its content in the Details tab.

---

## 6. Performance (Performance tab)

- Message Buffer Limit
  - Upper bound of the in‑memory ring buffer. When reduced, trimming happens immediately.
  - Default comes from `NEXT_PUBLIC_MESSAGE_BUFFER_LIMIT` (fallback `2000`).
- Buffer Trim Strategy
  - `Prefer Pending` — keep in‑flight messages preferentially
  - `Prefer Batches` — keep batches preferentially
  - `Drop Chunk Size` — forced drop size for over‑limit trimming
- Row Height Estimate
  - Switch between `Heuristic` and `Fixed (88px)`. Heuristics help for large payloads and batches.

---

## 7. Reconnect

- On disconnect, the client retries with exponential backoff (cap/jitter supported via DI in the hook).
- Successful connection resets attempts. Clicking `Disconnect` cancels pending reconnects.

---

## 8. Using Dummy Mode

- Validate most UI flows without a backend (send/receive, batches, notifications, linking, etc.).
- Developer options (optional) — pass options to the hook for deterministic behavior:
  - `rng: () => number` — provide your own RNG
  - `dummy.autoRequestIntervalMs` / `dummy.notificationIntervalMs` — adjust simulated event intervals

---

## 9. Troubleshooting

- Cannot connect / disconnects immediately
  - Check URL, CORS/CSP, and any proxy/firewall in between.
- JSON won’t send / shows an error
  - `Parameters (JSON)` must be an array or an object. Use `Format` to catch syntax issues.
- UI feels heavy
  - Lower `Performance → Message Buffer Limit`, and/or adjust `Prefer Pending/Batches` and `Drop Chunk Size`.

---

## 10. FAQ

- What does Export include?
  - Only the currently visible set after quick filter. Timestamps are saved as ISO strings and round‑trip back to Date on import.
- Can I change the default endpoint?
  - Yes. Set `NEXT_PUBLIC_WS_URL_DEFAULT`. The example config uses `ws://localhost:9999/ws` for the bundled Go server.
- What are the validation rules?
  - Follows JSON‑RPC 2.0. For responses, `error.code` must be an integer; reserved codes produce warnings.

Start with Dummy Mode, then try a single request, a batch, apply filters, export, and inspect details/linking.
