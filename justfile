# https://just.systems

# Use bash for consistent behavior
set shell := ["bash", "-cu"]

default: help

# List all recipes
help:
    @just --list --unsorted

# Run CI checks locally
test-ci:
    pnpm tsc --noEmit
    pnpm test:unit

# Format the codebase with Biome
format:
    pnpm run format
    # Optionally format Go server (skip if Go is not installed)
    (cd scripts/ws-jsonrpc-server && go fmt ./...) || echo "Skipping Go formatting (go not installed?)"

# Lint the codebase (ESLint via Next)
lint:
    pnpm run lint

# Run local E2E smoke tests
e2e:
    pnpm playwright:install
    pnpm run test:e2e

# Run E2E against local real WebSocket server
e2e-real ws_url='ws://localhost:9191/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    started=0
    port_open() {
      if command -v nc >/dev/null 2>&1; then
        nc -z 127.0.0.1 9191 >/dev/null 2>&1
      else
        (echo >/dev/tcp/127.0.0.1/9191) >/dev/null 2>&1 || return 1
      fi
    }
    if ! port_open; then
      if ! command -v go >/dev/null 2>&1; then
        echo "Go not found (required to run local WS server)." >&2
        exit 1
      fi
      echo "Starting local WS JSON-RPC server at :9191 ..."
      mkdir -p scripts/ws-jsonrpc-server/logs
      (
        cd scripts/ws-jsonrpc-server && \
        GOSUMDB=off GOFLAGS= go mod download || true && \
        GOSUMDB=off GOFLAGS= go build -o server . && \
        ./server --addr :9191 --path /ws
      ) > scripts/ws-jsonrpc-server/logs/server.log 2>&1 &
      srv_pid=$!
      started=1
      # Wait until port is open (max ~30s)
      ready=0
      for i in {1..60}; do
        if port_open; then
          echo "WS server is up."
          ready=1
          break
        fi
        sleep 0.5
      done
      if [ "$ready" -ne 1 ]; then
        echo "WS server failed to start on :9191 within timeout" >&2
        echo "--- server.log (last 100 lines) ---" >&2
        tail -n 100 scripts/ws-jsonrpc-server/logs/server.log >&2 || true
        exit 1
      fi
    fi
    set +e
    E2E_REAL_WS_URL={{ws_url}} pnpm run test:e2e
    status=$?
    set -e
    if [ "$started" -eq 1 ]; then
      echo "Stopping WS server (pid $srv_pid)..."
      kill "$srv_pid" >/dev/null 2>&1 || true
      wait "$srv_pid" >/dev/null 2>&1 || true
    fi
    exit $status
