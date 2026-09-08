# Architectural Diary — cloudflare-cli

An index of the design decisions that shaped this repository, in roughly chronological order. Each entry records the decision, the context, and its consequences. Commit references point at the messages-only-rewritten history of 2026-09-08 (see CHANGELOG.md).

| # | Decision | Commit | Date |
|---|----------|--------|------|
| 001 | [Zero runtime dependencies on Bun](decisions/001-zero-dependency-bun-runtime.md) | 3014d90 → 500a425 | 2026-01-27 |
| 002 | [Zone cache with longest-suffix resolution](decisions/002-zone-cache-longest-suffix.md) | 3014d90 | 2026-01-27 |
| 003 | [Upsert semantics and multi-value record types](decisions/003-upsert-semantics-multi-record-types.md) | 3014d90 → fa6a6ea → 8837727 | 2026-01-27 |
| 004 | [Auto-disable proxy when a custom TTL is set](decisions/004-proxy-ttl-auto-disable.md) | a85cdaa | 2026-01-27 |
| 005 | [Distribute as a Claude Code plugin](decisions/005-distribution-as-claude-code-plugin.md) | 3f94a8c → d972561 → 38772cc | 2026-01-27 |
| 006 | [Redirects via the Rulesets API](decisions/006-redirects-via-rulesets.md) | 26fd794 | 2026-02-02 |
| 007 | [Repo hygiene: untrack the binary, keep agent docs](decisions/007-repo-hygiene-untrack-binary.md) | f3a80db | 2026-01-27 |

## Timeline narrative

The project was bootstrapped on 2026-01-27 in a single initial commit (3014d90): a Bun + TypeScript CLI around a `CloudflareClient` class, with zone caching, record upsert, and multi-format batch files. Within hours it went through a rapid hygiene and positioning phase — the accidentally committed ~55 MB binary was untracked (f3a80db, decision 007), scaffold files were dropped, the README was rewritten around the zero-dependency pitch (aa3d43f), and all four runtime dependencies were replaced with Bun native APIs (500a425, decision 001). Feature work the same day added list/delete (3d0173c), TTL + priority flags (fa6a6ea), the proxied-status fix (8837727), cache purge (ec26745), and the proxy/TTL auto-disable rule (a85cdaa, decision 004). In parallel, the repo adopted the Claude Code plugin layout and marketplace distribution (decision 005). A week later the redirect command (26fd794, decision 006) extended the tool past pure DNS into Rulesets territory, and hinted at the eventual rename from `cloudflare-dns` to `cloudflare` (d972561).
