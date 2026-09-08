# 006 — Redirects via the Rulesets API

**Date:** 2026-02-02 · **Commit:** 26fd794

## Decision

`redirect <from> <to>` creates a Cloudflare **dynamic redirect rule** in the zone's `http_request_dynamic_redirect` ruleset phase rather than using page rules or DNS-level forwarding. The rule matches `http.host eq "<from>"` and redirects to `concat("https://<to>", http.request.uri.path)` (path preserved, query string preserved, default status 301; `--status` and `--no-preserve-path` adjust both). `createRedirectRule` first tries to POST a fresh "Dynamic Redirects" ruleset; if the phase entrypoint already exists it PUTs the full rule list — updating the rule if the expression or description matches, appending otherwise. The target host is always forced to `https://`.

## Context

The motivating case is apex-to-www redirects (`example.com` → `www.example.com`), which Cloudflare no longer supports as a free DNS record type. The Rulesets API is the modern replacement; doing it from the CLI lets an agent complete "make the apex redirect to www" without dashboard access. Zone name is derived in the CLI from the last two labels of `from`.

## Consequences

- Redirects are created, updated, and de-duplicated programmatically; re-running the command converges instead of stacking duplicate rules.
- The PUT sends the whole rule list, so rules edited concurrently in the dashboard can be clobbered — a documented gotcha.
- Only host-level redirects are supported (no path-specific rules), and `http` → `https` for the target is hard-coded.
- The redirect target zone is derived from `from` (last two labels), so `redirect sub.example.com www.sub.example.com` requires the `example.com` zone to exist; third-level zones would need a cache hit.
