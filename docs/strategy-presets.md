# Strategy Presets

This document summarizes a few practical presets you can apply via the Performance → Settings panel (or programmatically via `useWebSocketClient`). These are heuristics, not guarantees; pick what fits your stream.

- Favor Freshness
  - `preferPending = false`
  - `preferBatches = false`
  - `dropChunkSize = 8`
  - Intent: aggressively drop oldest messages to keep the feed current when rate spikes; pending/in-flight requests are not privileged.

- Favor In‑flight
  - `preferPending = true`
  - `preferBatches = true`
  - `dropChunkSize = 1`
  - Intent: keep pending requests and batch pairs visible, even if it means older received messages drop first.

- Balanced (Default)
  - `preferPending = true`
  - `preferBatches = false`
  - `dropChunkSize = 1`
  - Intent: protect in-flight requests while not over-favoring batches.

Tip: After changing options, the hook trims immediately to respect the limit. If you’re experimenting, consider increasing the limit temporarily to observe behavior without drops.
