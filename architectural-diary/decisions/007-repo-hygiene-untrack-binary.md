# 007 — Repo hygiene: untrack the binary, keep agent docs

**Date:** 2026-01-27 · **Commit:** f3a80db (and ffa6701 for scaffold cleanup)

## Decision

The ~55 MB compiled `cloudflare-cli` binary that had been committed to the repo root in the initial commit was removed from tracking (its blob remains in history — GitHub still warns about it). `bin/` became the documented, git-ignored build-output location (`bun build --compile --outfile bin/cloudflare-cli src/cli.ts`), and `.zones-cache.json` was added to `.gitignore`. In the same commit, an `.agent/` folder with `SKILL.md` and `workflows/add-dns-records.md` was added as agent-facing documentation. Leftover `bun init` scaffolding (`CLAUDE.md` boilerplate, placeholder `index.ts`) was deleted in ffa6701.

## Context

Compiled artifacts in git bloat every clone and every future commit's history; the binary was a build output, not source. The `.agent/` docs predate the move to the official Claude Code plugin layout (decision 005) and represent an earlier convention for teaching coding agents to use the CLI.

## Consequences

- Clones are small; binaries are built on demand into an ignored directory.
- The 55 MB blob is permanently in the git history of the initial commit; fully removing it would require an object-rewriting pass (e.g. `git filter-repo`), which has deliberately not been done.
- `.agent/` overlaps in purpose with `skills/` + `commands/`; the repo owner has since staged its deletion (2026-09-08), leaving the plugin-layout docs as the canonical agent surface.
