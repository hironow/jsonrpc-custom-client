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

# Lint the codebase (ESLint via Next)
lint:
    pnpm run lint

# Run local E2E smoke tests
e2e:
    pnpm playwright:install
    pnpm run test:e2e

# Run E2E against local real WebSocket server
e2e-real ws_url='ws://localhost:9999/ws':
    E2E_REAL_WS_URL={{ws_url}} pnpm run test:e2e
