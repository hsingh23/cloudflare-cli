# AGENTS.md — working notes for coding agents

Practical guide for agents (and humans) making changes in this repository.

## Commands

```bash
bun install                     # one-time; only dev deps (@types/bun)
bun src/cli.ts --help           # run the CLI directly (no build step needed)
bun link                        # expose `cloudflare-cli` globally (optional)
bunx tsc --noEmit               # type-check (peer dep typescript ^5)
bun build --compile --outfile bin/cloudflare-cli src/cli.ts   # standalone binary (bin/ is git-ignored)
```

There are no tests and no lint config in this repo. Verification is manual: `--help`, plus type-check.

## Verify your changes

1. `bunx tsc --noEmit` must pass.
2. `bun src/cli.ts --help` must print the full command reference.
3. For command-logic changes, dry-run against the real API only if a token is available (`CLOUDFLARE_API_TOKEN` or `~/.config/cloudflare-cli/token`); otherwise review the code path and arg parsing (`getFlag` / `hasFlag`) by hand.
4. Never run commands that mutate DNS/redirect state unless explicitly asked. Listing (`bun src/cli.ts list example.com`) is the safest live check.

## Architecture map

```
src/cli.ts        CLI entry. Hand-rolled argv parser (getFlag/hasFlag), showHelp(),
                  main() switch dispatching: init | add/add-record | batch | list |
                  delete | purge | redirect. Single main().catch error handler.
src/cloudflare.ts CloudflareClient class = the only place that talks to the Cloudflare
                  API (api.cloudflare.com/client/v4, Bearer auth). fetchAPI() unwraps
                  { success, errors, result }. Zone pagination (50/page), zone cache
                  (.zones-cache.json in cwd, longest-suffix match with refresh-on-miss),
                  DNS record CRUD, purge_cache, dynamic-redirect rulesets.
src/types.ts      CloudflareZone, DNSRecord, ZoneCache interfaces.
skills/,          Claude Code plugin surface: SKILL.md auto-invoked skill,
commands/,        /cloudflare-dns:add slash command, .claude-plugin/ manifests.
.claude-plugin/
```

Key flows:

- **Token resolution** (`cli.ts`): env `CLOUDFLARE_API_TOKEN` wins, else `~/.config/cloudflare-cli/token` (0600). Missing token → exit 1 with instructions.
- **Zone resolution** (`cloudflare.ts getZoneId`): read `.zones-cache.json`, try the domain and each parent suffix; on miss, refetch all zones, save cache, retry; still nothing → throw.
- **Upsert** (`cli.ts upsertRecord`): fetch existing records by name+type. Multi-value types (MX, TXT, NS, SRV) match by content and may coexist; single-value types update in place. Skip only when content, priority, TTL, AND proxied all match.

## Conventions

- **Zero runtime dependencies is a hard rule.** Use only Bun built-ins (`Bun.YAML`, `Bun.TOML`, `Bun.JSON5`, `fetch`) and Node stdlib (`fs`, `path`, `os`). Do not add packages to `dependencies`. (Decision: `architectural-diary/decisions/001-zero-dependency-bun-runtime.md`.)
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), subject ≤ 72 chars, body explains why.
- TypeScript strict-ish style as configured in `tsconfig.json`; run directly on Bun — no build artifacts are committed.
- Proxy semantics are product behavior, not accidents: proxied by default for A/AAAA/CNAME, never for MX/TXT/SRV/NS, auto-off with custom TTL. See `architectural-diary/decisions/004-proxy-ttl-auto-disable.md` before touching that logic.

## Gotchas

- **Cloudflare forces proxied records to TTL Auto (1s).** Any `--ttl > 1` silently does nothing on proxied records — hence the auto-disable logic. Preserve it.
- **`.zones-cache.json` lives in the current working directory**, not next to the token. Running the CLI from another directory creates a second cache file. It is git-ignored; never commit it.
- **Secrets:** never commit API tokens, `.env*` files, or real DNS configs (`hostinger-email.yaml` is git-ignored for this reason). The token file must keep mode 0600.
- **`add` is upsert, `delete` matches by content** (not by name+type), and deletes every match. Warn users before bulk deletes.
- **Batch files** must contain an array of records (TOML may wrap them under a `records` key). Unknown extensions fall back to JSON parsing.
- **Redirect rules are idempotent-ish**: the client creates a "Dynamic Redirects" phase ruleset on first use and PUTs the full rule list afterwards — concurrent edits from the dashboard can be overwritten.
- `.agent/` contains agent-facing docs that are currently staged for deletion by the repo owner — do not "restore" them without being asked.

## Pointers

- Full commit-by-commit history: `CHANGELOG.md`
- Design decisions and rationale: `architectural-diary/main.md` (index) and `architectural-diary/decisions/`
- One-shot recreation prompt (spec of the whole system): `prompt.md`
