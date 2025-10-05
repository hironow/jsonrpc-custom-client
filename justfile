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
    # Install Playwright browsers only for local runs; CI pre-installs & caches them
    if [ -z "${CI:-}" ]; then pnpm playwright:install; fi
    pnpm run test:e2e

# Run E2E against local real WebSocket server
e2e-real ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    cleanup() {
      if [ "${started:-0}" -eq 1 ] && [ -n "${srv_pid:-}" ]; then
        if kill -0 "$srv_pid" >/dev/null 2>&1; then
          echo "Stopping WS server (pid $srv_pid)..."
          kill "$srv_pid" >/dev/null 2>&1 || true
          wait "$srv_pid" >/dev/null 2>&1 || true
        fi
      fi
    }
    trap cleanup EXIT INT TERM
    started=0
    port_open() {
      if command -v nc >/dev/null 2>&1; then
        nc -z 127.0.0.1 9999 >/dev/null 2>&1
      else
        (echo >/dev/tcp/127.0.0.1/9999) >/dev/null 2>&1 || return 1
      fi
    }
    if ! port_open; then
      if ! command -v go >/dev/null 2>&1; then
        echo "Go not found (required to run local WS server)." >&2
        exit 1
      fi
      echo "Starting local WS JSONRPC server at :9999 ..."
      mkdir -p scripts/ws-jsonrpc-server/logs
      sh -c '
        set -e
        cd scripts/ws-jsonrpc-server
        GOSUMDB=off GOFLAGS= go mod download || true
        GOSUMDB=off GOFLAGS= go build -o server .
        exec ./server --addr :9999 --path /ws
      ' > scripts/ws-jsonrpc-server/logs/server.log 2>&1 & srv_pid=$!
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
        echo "WS server failed to start on :9999 within timeout" >&2
        echo "--- server.log (last 100 lines) ---" >&2
        tail -n 100 scripts/ws-jsonrpc-server/logs/server.log >&2 || true
        exit 1
      fi
    fi
    set +e
    E2E_REAL_WS_URL={{ws_url}} pnpm run test:e2e
    status=$?
    set -e
    exit $status

# Deploy the Go WS server to Cloud Run
# Requires: gcloud CLI logged in; Project set (via GCP_PROJECT or gcloud config); REGION optional (default asia-northeast1 / Tokyo)
deploy-ws-server service_name='jsonrpc-ws' region='asia-northeast1' concurrency='80' min_instances='0' max_instances='3' port='8080':
    #!/usr/bin/env bash
    set -euo pipefail
    # Resolve project from env or gcloud config
    PROJECT_ID=${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}
    if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "(unset)" ]; then
      echo "GCP project is not set. Set GCP_PROJECT or run: gcloud config set project <PROJECT_ID>" >&2
      exit 1
    fi
    SVC={{service_name}}
    REGION={{region}}
    CONC={{concurrency}}
    MIN={{min_instances}}
    MAX={{max_instances}}
    PORT={{port}}
    IMAGE="gcr.io/${PROJECT_ID}/${SVC}:$(date +%Y%m%d-%H%M%S)"
    echo "Project: ${PROJECT_ID}"
    echo "Region : ${REGION}"
    echo "Service: ${SVC}"
    echo "Image  : ${IMAGE}"
    echo "Flags  : --concurrency ${CONC} --min-instances ${MIN} --max-instances ${MAX} --port ${PORT}"
    pushd scripts/ws-jsonrpc-server >/dev/null
    # Build & push image using Cloud Build
    gcloud builds submit --quiet --tag "${IMAGE}"
    popd >/dev/null
    # Deploy to Cloud Run (managed)
    gcloud run deploy "${SVC}" \
      --image "${IMAGE}" \
      --platform managed \
      --region "${REGION}" \
      --allow-unauthenticated \
      --port "${PORT}" \
      --concurrency "${CONC}" \
      --min-instances "${MIN}" \
      --max-instances "${MAX}"
    echo "-- Deployed. You can connect your client to:"
    URL=$(gcloud run services describe "${SVC}" --region "${REGION}" --format='value(status.url)')
    echo "   ${URL}/ws"

# k6: WebSocket scenario
k6 ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/basic-jsonrpc-ws.js

k6-batch ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/batch-jsonrpc-ws.js

k6-error ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/error-jsonrpc-ws.js

k6-notify ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/notification-stream-ws.js

k6-local ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    cleanup() {
      if [ "${started:-0}" -eq 1 ] && [ -n "${srv_pid:-}" ]; then
        if kill -0 "$srv_pid" >/dev/null 2>&1; then
          echo "Stopping WS server (pid $srv_pid)..."
          kill "$srv_pid" >/dev/null 2>&1 || true
          wait "$srv_pid" >/dev/null 2>&1 || true
        fi
      fi
    }
    trap cleanup EXIT INT TERM
    started=0
    port_open() {
      if command -v nc >/dev/null 2>&1; then
        nc -z 127.0.0.1 9999 >/dev/null 2>&1
      else
        (echo >/dev/tcp/127.0.0.1/9999) >/dev/null 2>&1 || return 1
      fi
    }
    if ! port_open; then
      if ! command -v go >/dev/null 2>&1; then
        echo "Go not found (required to run local WS server)." >&2
        exit 1
      fi
      echo "Starting local WS JSONRPC server at :9999 ..."
      mkdir -p scripts/ws-jsonrpc-server/logs
      sh -c '
        set -e
        cd scripts/ws-jsonrpc-server
        GOSUMDB=off GOFLAGS= go mod download || true
        GOSUMDB=off GOFLAGS= go build -o server .
        exec ./server --addr :9999 --path /ws
      ' > scripts/ws-jsonrpc-server/logs/server.log 2>&1 & srv_pid=$!
      started=1
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
        echo "WS server failed to start on :9999 within timeout" >&2
        echo "--- server.log (last 100 lines) ---" >&2
        tail -n 100 scripts/ws-jsonrpc-server/logs/server.log >&2 || true
        exit 1
      fi
    fi
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    # Run all WS scenarios (basic, batch, error, notification)
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/basic-jsonrpc-ws.js
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/batch-jsonrpc-ws.js
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/error-jsonrpc-ws.js
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/notification-stream-ws.js

k6-local-batch ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    cleanup() {
      if [ "${started:-0}" -eq 1 ] && [ -n "${srv_pid:-}" ]; then
        if kill -0 "$srv_pid" >/dev/null 2>&1; then
          echo "Stopping WS server (pid $srv_pid)..."
          kill "$srv_pid" >/dev/null 2>&1 || true
          wait "$srv_pid" >/dev/null 2>&1 || true
        fi
      fi
    }
    trap cleanup EXIT INT TERM
    started=0
    port_open() {
      if command -v nc >/dev/null 2>&1; then
        nc -z 127.0.0.1 9999 >/dev/null 2>&1
      else
        (echo >/dev/tcp/127.0.0.1/9999) >/dev/null 2>&1 || return 1
      fi
    }
    if ! port_open; then
      if ! command -v go >/dev/null 2>&1; then
        echo "Go not found (required to run local WS server)." >&2
        exit 1
      fi
      echo "Starting local WS JSONRPC server at :9999 ..."
      mkdir -p scripts/ws-jsonrpc-server/logs
      sh -c '
        set -e
        cd scripts/ws-jsonrpc-server
        GOSUMDB=off GOFLAGS= go mod download || true
        GOSUMDB=off GOFLAGS= go build -o server .
        exec ./server --addr :9999 --path /ws
      ' > scripts/ws-jsonrpc-server/logs/server.log 2>&1 & srv_pid=$!
      started=1
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
        echo "WS server failed to start on :9999 within timeout" >&2
        echo "--- server.log (last 100 lines) ---" >&2
        tail -n 100 scripts/ws-jsonrpc-server/logs/server.log >&2 || true
        exit 1
      fi
    fi
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/batch-jsonrpc-ws.js

k6-local-error ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    cleanup() {
      if [ "${started:-0}" -eq 1 ] && [ -n "${srv_pid:-}" ]; then
        if kill -0 "$srv_pid" >/dev/null 2>&1; then
          echo "Stopping WS server (pid $srv_pid)..."
          kill "$srv_pid" >/dev/null 2>&1 || true
          wait "$srv_pid" >/dev/null 2>&1 || true
        fi
      fi
    }
    trap cleanup EXIT INT TERM
    started=0
    port_open() {
      if command -v nc >/dev/null 2>&1; then
        nc -z 127.0.0.1 9999 >/dev/null 2>&1
      else
        (echo >/dev/tcp/127.0.0.1/9999) >/dev/null 2>&1 || return 1
      fi
    }
    if ! port_open; then
      if ! command -v go >/dev/null 2>&1; then
        echo "Go not found (required to run local WS server)." >&2
        exit 1
      fi
      echo "Starting local WS JSONRPC server at :9999 ..."
      mkdir -p scripts/ws-jsonrpc-server/logs
      sh -c '
        set -e
        cd scripts/ws-jsonrpc-server
        GOSUMDB=off GOFLAGS= go mod download || true
        GOSUMDB=off GOFLAGS= go build -o server .
        exec ./server --addr :9999 --path /ws
      ' > scripts/ws-jsonrpc-server/logs/server.log 2>&1 & srv_pid=$!
      started=1
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
        echo "WS server failed to start on :9999 within timeout" >&2
        echo "--- server.log (last 100 lines) ---" >&2
        tail -n 100 scripts/ws-jsonrpc-server/logs/server.log >&2 || true
        exit 1
      fi
    fi
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/error-jsonrpc-ws.js

k6-local-notify ws_url='ws://localhost:9999/ws':
    #!/usr/bin/env bash
    set -euo pipefail
    cleanup() {
      if [ "${started:-0}" -eq 1 ] && [ -n "${srv_pid:-}" ]; then
        if kill -0 "$srv_pid" >/dev/null 2>&1; then
          echo "Stopping WS server (pid $srv_pid)..."
          kill "$srv_pid" >/dev/null 2>&1 || true
          wait "$srv_pid" >/dev/null 2>&1 || true
        fi
      fi
    }
    trap cleanup EXIT INT TERM
    started=0
    port_open() {
      if command -v nc >/dev/null 2>&1; then
        nc -z 127.0.0.1 9999 >/dev/null 2>&1
      else
        (echo >/dev/tcp/127.0.0.1/9999) >/dev/null 2>&1 || return 1
      fi
    }
    if ! port_open; then
      if ! command -v go >/dev/null 2>&1; then
        echo "Go not found (required to run local WS server)." >&2
        exit 1
      fi
      echo "Starting local WS JSONRPC server at :9999 ..."
      mkdir -p scripts/ws-jsonrpc-server/logs
      sh -c '
        set -e
        cd scripts/ws-jsonrpc-server
        GOSUMDB=off GOFLAGS= go mod download || true
        GOSUMDB=off GOFLAGS= go build -o server .
        exec ./server --addr :9999 --path /ws
      ' > scripts/ws-jsonrpc-server/logs/server.log 2>&1 & srv_pid=$!
      started=1
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
        echo "WS server failed to start on :9999 within timeout" >&2
        echo "--- server.log (last 100 lines) ---" >&2
        tail -n 100 scripts/ws-jsonrpc-server/logs/server.log >&2 || true
        exit 1
      fi
    fi
    if ! command -v k6 >/dev/null 2>&1; then
      echo "k6 is not installed. Install: brew install k6 or see https://k6.io/docs/getting-started/installation/" >&2
      exit 1
    fi
    K6_WS_URL={{ws_url}} K6_WS_TIMEOUT_MS=${K6_WS_TIMEOUT_MS:-5000} k6 run tests/k6/notification-stream-ws.js
