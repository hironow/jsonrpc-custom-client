# JSONRPC WebSocket Client

Next.js + React UI to explore JSON‑RPC over WebSocket.

## Quick Start

- Install deps: `pnpm install`
- Configure env (optional): copy [.env.example](.env.example) → [.env.local](.env.local) and adjust
  - `NEXT_PUBLIC_WS_URL_DEFAULT` – initial WS URL in UI
    - Example in [.env.example](.env.example) points to the bundled Go server: `ws://localhost:9999/ws`
    - If unset, the app falls back to `ws://localhost:8080`
  - `NEXT_PUBLIC_MESSAGE_BUFFER_LIMIT` – ring buffer limit (default `2000`)
  - `NEXT_PUBLIC_ENABLE_ANALYTICS` – render Vercel Analytics when `true` or `1` (default disabled)
- Run dev server: `pnpm dev` → open `http://localhost:3000`
- Try Dummy Mode in the Connection panel and send a request.

## Documentation

- User Guide: [docs/user-guide.md](docs/user-guide.md)
- Development & Testing Guide: [docs/development.md](docs/development.md)
- Buffer Strategy Presets: [docs/strategy-presets.md](docs/strategy-presets.md)

## Notes for Contributors

We use a Tidy First → Tests workflow. See [docs/development.md](docs/development.md) for detailed policies and test setup.

## License

MIT — see [LICENSE](LICENSE).
