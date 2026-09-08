# 005 — Distribute as a Claude Code plugin

**Date:** 2026-01-27 · **Commits:** 585b7e7 (manual docs), 3f94a8c (plugin layout), d972561 (rename), 38772cc (marketplace)

## Decision

The repository is simultaneously a plain CLI and a Claude Code plugin. It follows the official plugin layout: `.claude-plugin/plugin.json` manifest, `skills/cloudflare-dns/SKILL.md` (auto-invoked skill), and `commands/cloudflare-dns/add.md` (the `/cloudflare-dns:add` slash command), plus `.claude-plugin/marketplace.json` defining the personal `hsingh23-tools` marketplace so users can install with `/plugin marketplace add github:hsingh23/cloudflare-cli` and `/plugin install cloudflare@hsingh23-tools`. The plugin was renamed from `cloudflare-dns` to `cloudflare` (d972561) as its scope grew past DNS.

## Context

The tool was originally wired into Claude Code through repo-local `.claude/` files copied or symlinked into each project (documented in 585b7e7, superseded within the hour). Claude Code's plugin system made the repo itself installable as a unit, which removed the per-project copy step and let the skill/command docs live next to the code they describe.

## Consequences

- One repo, two audiences: humans get `bun link` + `cloudflare-cli`, agents get the skill/command/plugin surfaces.
- The skill/command markdown must be kept in sync with CLI behavior by hand; the TTL/proxy notes exist in README, SKILL.md, and `--help` for this reason.
- The plugin name (`cloudflare`) is now broader than the skill name (`cloudflare-dns`); new non-DNS features (purge, redirect) ride under the same plugin, with the skill description covering cache/redirect topics.
- Marketplace metadata (`.claude-plugin/marketplace.json`) duplicates description/version fields from `plugin.json` and must be updated together.
