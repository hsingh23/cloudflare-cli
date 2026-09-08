# 004 — Auto-disable proxy when a custom TTL is set

**Date:** 2026-01-27 · **Commit:** a85cdaa (behavior), fa6a6ea (`--ttl` flag)

## Decision

In `add`, the proxy decision cascade is: (1) MX/TXT/SRV/NS → never proxied; (2) `--ttl > 1` without an explicit `--proxied` → proxy auto-disabled with a log line; (3) explicit `--proxied` wins, but combining `--proxied true` with `--ttl > 1` prints a warning. The default TTL is `1` (= Cloudflare "Auto").

## Context

Cloudflare forces proxied records to TTL Auto (1 second); a custom TTL on a proxied record is silently ignored. Users specifying `--ttl 3600` were therefore not getting the TTL they asked for. Rather than rejecting the combination, the CLI resolves the conflict in favor of the TTL (the more explicit intent) and only warns when the user insists on both.

## Consequences

- `--ttl` always takes effect: either the record keeps its custom TTL unproxied, or the user is warned.
- Batch processing inherits the same rules via per-record `proxied` defaults (proxy on unless the type forbids it), though batch records may set `proxied: true` with a custom TTL without the warning path — a known asymmetry.
- The behavior is documented in three places on purpose (help text, SKILL.md, README) because agents and users both read different subsets of them.
