# 002 — Zone cache with longest-suffix resolution

**Date:** 2026-01-27 · **Commit:** 3014d90 (initial)

## Decision

Zone IDs are resolved through a local file cache, `.zones-cache.json`, written to the **current working directory** by `cloudflare-cli init` (or lazily refreshed). `getZoneId(domain)` walks the domain's labels from the full name up (`sub.example.com` → `example.com` → `com`) and returns the first cached zone whose name matches. On a miss it refetches *all* zones (paginated, 50 per page), rewrites the cache, and retries once before failing.

## Context

Every DNS/cache/redirect operation needs a zone ID, and the Cloudflare API resolves zones only by exact name. Accounts often hold many zones, and a record like `blog.example.com` must map to the `example.com` zone. Caching avoids a zone list round-trip on every invocation, which matters most when the CLI is invoked repeatedly by an agent workflow.

## Consequences

- Repeated CLI calls are fast (no zone-list call when the cache hits).
- The cache can go stale when zones are added/removed elsewhere; the refresh-on-miss path self-heals for *new* zones but a removed zone lingers until a manual `init`.
- Cache location is cwd, so running from different directories maintains separate caches — documented as a gotcha in AGENTS.md.
- The cache file contains zone names and IDs and is git-ignored; it must never be committed.
