# 001 — Zero runtime dependencies on Bun

**Date:** 2026-01-27 · **Commits:** 3014d90 (initial, cac/yaml/toml/json5), 500a425 (removal), aa3d43f (README positioning)

## Decision

The CLI has an empty `dependencies` field. Command-line parsing is a hand-rolled `process.argv` parser (`getFlag`/`hasFlag` + `showHelp` + a `main()` switch), and batch-file parsing uses Bun's built-in `Bun.YAML.parse`, `Bun.TOML.parse`, and `Bun.JSON5.parse`. Only `@types/bun` remains as a dev dependency and `typescript ^5` as a peer.

## Context

The initial commit was built conventionally with `cac` for args and the `yaml`/`toml`/`json5` npm packages. Bun ships all four capabilities natively, so the dependency tree bought nothing except install time and supply-chain surface. The "zero deps, just needs Bun" pitch then became the README's headline (aa3d43f).

## Consequences

- `bun install` is effectively a no-op; `bun src/cli.ts` runs from a fresh clone immediately.
- New feature requests must be met with Bun/Node built-ins only — adding an npm runtime dependency violates a documented product promise (see AGENTS.md).
- The custom parser is minimal on purpose: flags are always `--name value` booleans/strings, no short flags, no negation except explicit ones like `--no-preserve-path`.
- Error handling consolidated into a single `main().catch` instead of per-command try/catch.
