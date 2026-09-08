# Changelog

All notable changes to this project are documented here, newest first.

> **Note on history:** On 2026-09-08 the commit messages on `main` were cleaned up via a
> messages-only history rewrite (`git filter-branch --msg-filter`). File contents, trees,
> authors, and dates are byte-identical to the previous history; only commit messages (and
> therefore commit hashes) changed. The entries below reference the post-rewrite hashes.

## 2026-02-02

- **26fd794** — Add redirect command for apex-to-www redirects via Cloudflare Rulesets API
  - New `redirect <from> <to>` CLI command creating a dynamic redirect rule (default 301) with `--status` and `--no-preserve-path` flags.
  - `createRedirectRule` / `listRedirectRules` in `CloudflareClient` operate on the `http_request_dynamic_redirect` ruleset phase.
  - Idempotent: reuses and updates the phase entrypoint ruleset when one already exists, and preserves query strings.

## 2026-01-27

- **a85cdaa** — feat: auto-disable proxy when custom TTL is specified
  - `add --ttl >1` now auto-disables the Cloudflare proxy unless `--proxied` is set explicitly, because Cloudflare forces proxied records to TTL "Auto" (1s).
  - Explicitly combining `--proxied true` with a custom TTL prints a warning.
  - Help text, `skills/cloudflare-dns/SKILL.md`, and README updated with the TTL/proxy behavior.

- **8837727** — fix: check proxied status in upsertRecord for proper updates
  - The skip-if-unchanged condition in `upsertRecord` now also compares `proxied`.
  - Re-adding a record with a changed proxy setting is now correctly applied instead of silently skipped.

- **fa6a6ea** — feat: add TTL and priority flags to add command
  - `add` gains `--ttl` and `--priority`, passed through to the Cloudflare API.
  - TTL is compared in the skip condition so TTL-only changes trigger an update.
  - Multi-record types (MX/TXT/NS/SRV) with matching content are updated rather than duplicated.
  - `hostinger-email.yaml` added to `.gitignore` to keep sensitive DNS config out of git.

- **3d0173c** — feat: add list and delete commands to CLI
  - New `list <domain> [type]` command printing type, content, priority, TTL, proxy state, and record id.
  - New `delete <domain> <content> [type]` command removing records matched by content.
  - New `CloudflareClient.deleteDNSRecord` wrapping the DNS records DELETE endpoint.

- **38772cc** — feat: add marketplace.json and restructure for Claude Code plugin marketplace
  - Adds `.claude-plugin/marketplace.json` defining the `hsingh23-tools` marketplace.
  - Extends `.claude-plugin/plugin.json` with homepage, keywords, and category metadata.
  - README gains marketplace-based install instructions (`/plugin marketplace add` + `/plugin install cloudflare@hsingh23-tools`).

- **ec26745** — feat: add purge cache command
  - New `purge <domain>` command defaulting to `purge_everything`.
  - Selective purging via `--files`, `--tags`, and `--hosts` flags.
  - New `CloudflareClient.purgeCache` calling the `purge_cache` endpoint; SKILL.md updated.

- **d972561** — chore: rename plugin to cloudflare, add name to add command
  - Plugin renamed from `cloudflare-dns` to `cloudflare` in `.claude-plugin/plugin.json`.
  - The add command gets an explicit `name: dns-add` frontmatter identifier.

- **3f94a8c** — feat: restructure repo as installable Claude Code plugin
  - Adopts the official Claude Code plugin layout: `.claude-plugin/plugin.json` manifest plus top-level `skills/cloudflare-dns/SKILL.md` and `commands/cloudflare-dns/add.md`.
  - README rewritten to document installation via `claude --plugin-dir` or `/install-plugin`, replacing manual clone/symlink/copy instructions.
  - No CLI behavior changes.

- **585b7e7** — docs: document manual Claude Code plugin setup in README
  - Adds a Claude Code plugin bullet and an installation section covering clone-and-symlink and copy-the-files setup of the `.claude` assets.
  - Adds a "Claude Code Commands" section; trims redundant batch examples. (Superseded later the same day by 3f94a8c.)

- **aa3d43f** — docs: rewrite README around zero-dependency positioning
  - Reframes the project as a zero-dependency CLI that "just needs Bun", with a feature list.
  - Drops the Requirements section, `bun build --compile` instructions, and the env-var setup option.
  - Converts proxy-behavior notes into a table.

- **500a425** — refactor: drop runtime deps in favor of Bun native APIs
  - Removes `cac`, `json5`, `toml`, and `yaml` from dependencies.
  - Replaces them with a hand-rolled `process.argv` parser and `Bun.YAML.parse` / `Bun.TOML.parse` / `Bun.JSON5.parse` for batch files.
  - Consolidates error handling into a single `main().catch`; command semantics unchanged.

- **ffa6701** — chore: remove unused bun-init scaffold files
  - Deletes the boilerplate `CLAUDE.md` and placeholder `index.ts` left over from project scaffolding.

- **f3a80db** — chore: untrack compiled binary and add agent skill docs
  - Deletes the ~55 MB committed `cloudflare-cli` binary from the repo root.
  - Ignores `bin/` (build output) and `.zones-cache.json` (zone cache).
  - Adds `.agent/SKILL.md` and `.agent/workflows/add-dns-records.md` agent docs; documents the optional standalone-binary build.

- **3014d90** — feat: add Cloudflare DNS CLI with batch support and zone caching
  - Initial commit. Bun-based CLI with `init` (save token, cache zones), `add`/`add-record` (upsert with smart proxy defaults), and `batch` (JSON/YAML/TOML/JSONL/JSON5 files).
  - `CloudflareClient` with zone pagination, `.zones-cache.json` cache, longest-suffix zone resolution with refresh-on-miss, and DNS record CRUD.
  - Includes README, project config, and `.claude/` skill/command docs for Claude Code.

## 2026-09-08

- **docs: add README, AGENTS.md, CHANGELOG, architectural diary, and one-shot recreation prompt**
  - Adds this changelog, an expanded README, agent working notes (AGENTS.md), the architectural diary under `architectural-diary/`, and `prompt.md` for one-shot project recreation.
