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
    pnpm exec biome format --write .

# Lint the codebase (ESLint via Next)
lint:
    pnpm lint
