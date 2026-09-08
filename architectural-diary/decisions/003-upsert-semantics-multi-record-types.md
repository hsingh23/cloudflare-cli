# 003 — Upsert semantics and multi-value record types

**Date:** 2026-01-27 · **Commits:** 3014d90 (initial), fa6a6ea (TTL/priority), 8837727 (proxied fix)

## Decision

`add` is an **upsert**, implemented in `upsertRecord`: existing records for name+type are fetched, and the CLI decides between update, create-additional, or skip. Record types are split into two classes:

- **Single-value types** (A, AAAA, CNAME, …): any existing record with the same name+type is updated in place.
- **Multi-value types** (MX, TXT, NS, SRV — `allowMultiple`): records are matched by content; a matching content is updated, a new content creates an additional record so sets of MX/TXT records coexist.

Skip happens only when content, priority, TTL, *and* proxied all already match — each of those equality checks was added as bugs surfaced (TTL in fa6a6ea, proxied in 8837727). `delete` mirrors this model by matching on **content**, deleting every match.

## Context

The tool exists to make repeated, idempotent changes — an agent applying "point blog.example.com at X" must not duplicate records on every run, yet mail setups legitimately need several MX records at one name.

## Consequences

- Re-running `add`/`batch` converges DNS state instead of appending duplicates.
- The skip condition is a conjunction that has grown over time; any new record attribute (e.g. comments) must be added there or changes to it will be silently skipped.
- Deleting by content can remove several records at once; callers must treat it as a bulk operation.
