# prompt.md — one-shot recreation prompt for cloudflare-cli

Use the prompt below to recreate this project from scratch in a single agent session. It encodes the goal, exact stack, build order, every design decision, the data model, the Cloudflare API endpoints by name, and acceptance criteria.

---

Build a zero-dependency command-line tool called **cloudflare-cli** that manages Cloudflare DNS records, zone cache purges, and host-to-host redirects. It must run on Bun with an empty `dependencies` field in `package.json` (only `@types/bun` as devDependency and `typescript ^5` as peerDependency), be written in TypeScript executed directly by Bun (no committed build artifacts), and double as a Claude Code plugin.

## Exact stack

- Runtime & package manager: **Bun** (also provides `fetch`, `Bun.YAML.parse`, `Bun.TOML.parse`, `Bun.JSON5.parse`)
- Language: TypeScript (strict types in `src/types.ts`; CLI runs via `bun src/cli.ts`, shebang `#!/usr/bin/env bun`)
- Node stdlib only beyond Bun built-ins: `fs`, `path`, `os`
- No test framework, no linter, no build step committed

## Architecture (three source files)

1. **`src/types.ts`** — data model:
   - `CloudflareZone { id: string; name: string; status: string }`
   - `DNSRecord { id: string; type: string; name: string; content: string; proxied: boolean; ttl: number; priority?: number }`
   - `ZoneCache { lastUpdated: string; zones: CloudflareZone[] }`
2. **`src/cloudflare.ts`** — class `CloudflareClient(apiToken)`, the only code that touches the network. API base `https://api.cloudflare.com/client/v4`, `Authorization: Bearer <token>`. A private `fetchAPI(endpoint, options)` unwraps the standard `{ success, errors[], result, result_info }` envelope and throws `Cloudflare API Error: <first error message>` on failure. Methods:
   - `getAllZones()` — paginate `GET /zones?per_page=50&page=N` until `result_info.total_pages`
   - `saveCache(zones)` / `loadCache()` — read/write `.zones-cache.json` (in the **current working directory**) as `ZoneCache`
   - `getZoneId(domain)` — longest-suffix zone resolution: split the domain into labels and try each suffix (`sub.example.com`, then `example.com`, …) against the cache; on miss, refetch all zones, save cache, retry once; throw `No zone found for domain: <domain>` if still unmatched
   - `getDNSRecords(zoneId, name, type?)` — `GET /zones/{zoneId}/dns_records?name=<name>[&type=<type>]`
   - `createDNSRecord(zoneId, record)` — `POST /zones/{zoneId}/dns_records`
   - `updateDNSRecord(zoneId, recordId, record)` — `PUT /zones/{zoneId}/dns_records/{recordId}`
   - `deleteDNSRecord(zoneId, recordId)` — `DELETE /zones/{zoneId}/dns_records/{recordId}`
   - `purgeCache(zoneId, options?)` — `POST /zones/{zoneId}/purge_cache` with either the given `{ files | tags | hosts }` arrays or `{ purge_everything: true }`
   - `createRedirectRule(zoneId, zoneName, fromHost, toHost, preservePath = true, statusCode = 301)` — Rulesets API: try `POST /zones/{zoneId}/rulesets` creating a ruleset `{ name: "Dynamic Redirects", kind: "zone", phase: "http_request_dynamic_redirect", rules: [rule] }`; if the API answers that it already exists / a phase entrypoint exists, `GET /zones/{zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint` and `PUT /zones/{zoneId}/rulesets/{rulesetId}` with the rule updated (matched by expression or description) or appended. Rule shape: `{ action: "redirect", action_parameters: { from_value: { status_code, target_url: { expression: preservePath ? 'concat("https://<toHost>", http.request.uri.path)' : '"https://<toHost>/"' }, preserve_query_string: true } }, expression: '(http.host eq "<fromHost>")', description: "Redirect <fromHost> to <toHost>", enabled: true }`
   - `listRedirectRules(zoneId)` — read the same phase entrypoint, returning `[]` when the ruleset does not exist yet
3. **`src/cli.ts`** — entry point. Hand-rolled argv parsing (`getFlag(name)` returns the token after `--name`; `hasFlag(name)` for booleans), a `showHelp()` text block, a `switch` in `main()`, and one top-level `main().catch(err => print + exit 1)`.

## Authentication (design decision)

Token resolution order: environment variable `CLOUDFLARE_API_TOKEN` first, then the file `~/.config/cloudflare-cli/token` (created by `init --token` with `writeFileSync(..., { mode: 0o600 })`). No token → exit 1 with instructions naming both options. Never log the token.

## Command surface & semantics

- `init [--token <t>]` — optionally save the token, then fetch all zones and (re)write the zone cache.
- `add <domain> <target> [type=CNAME] [--proxied true|false] [--ttl seconds=1] [--priority n]` (alias `add-record`) — **upsert**, see proxy rules below. Type is upper-cased.
- `batch <file>` — parse a file by extension: `.yaml/.yml` → `Bun.YAML.parse`, `.toml` → `Bun.TOML.parse` (accept either a top-level array or a `records` key), `.jsonl` → one JSON object per line, `.json5` → `Bun.JSON5.parse`, anything else → `JSON.parse`. Must yield an array of `{ name, content, type?, proxied?, priority?, ttl? }`; apply each through the same upsert.
- `list <domain> [type]` — print each record's type, name, content, optional priority, TTL, proxied, id.
- `delete <domain> <content> [type]` — find records matching the content (optionally filtered by type) and **delete every match**.
- `purge <domain> [--files u1,u2] [--tags t1,t2] [--hosts h1,h2]` — whole-zone purge when no flags given.
- `redirect <from> <to> [--status 301|302] [--no-preserve-path]` — derive the zone from the last two labels of `from`, then create/update the redirect rule (default 301, path and query string preserved).

**Proxy rules (product behavior, in this priority order):** MX/TXT/SRV/NS are never proxied (log "Auto-disabling proxy for <type> record."); a custom TTL (`> 1`) with no explicit `--proxied` auto-disables the proxy with a log line, because Cloudflare forces proxied records to TTL Auto (1 s); an explicit `--proxied` wins, but `--proxied true` together with `--ttl > 1` prints a warning that Cloudflare will force TTL to Auto. Batch records default `proxied` the same way (on unless the type forbids it).

**Upsert rules:** fetch existing records by name+type. Multi-value types `MX, TXT, NS, SRV` match by content so several may coexist (update on content match, create-additional otherwise). Single-value types update the found record in place. Skip only when content AND priority AND ttl AND proxied all match — each attribute was added to this skip condition after a real bug where changes were silently dropped.

## Claude Code plugin layer (decision: one repo, two audiences)

Ship `.claude-plugin/plugin.json` (name `cloudflare`, version 1.0.0, MIT), `.claude-plugin/marketplace.json` (marketplace `hsingh23-tools` registering the plugin from `./`), `skills/cloudflare-dns/SKILL.md` (frontmatter name `cloudflare-dns`; description triggers on DNS/domains/MX/CNAME/cache purge/Cloudflare topics; body documents install, token setup, every command, and the proxy table), and `commands/cloudflare-dns/add.md` (frontmatter `name: dns-add`; body shows `$ARGUMENTS` usage). README documents three installs: `bun install && bun link` as a CLI, `/plugin marketplace add github:hsingh23/cloudflare-cli` + `/plugin install cloudflare@hsingh23-tools`, and `/install-plugin <repo url>` / `claude --plugin-dir`.

## Build order (phases)

1. Scaffold: `bun init`-style `package.json` (`name: cloudflare-cli-skill`, `bin: { "cloudflare-cli": "src/cli.ts" }`, `type: module`), `tsconfig.json`, `.gitignore` covering `node_modules`, `bin/`, `.zones-cache.json`, `.env*`, `hostinger-email.yaml`, build output.
2. `src/types.ts` + `CloudflareClient` with `fetchAPI`, zone pagination, cache save/load, `getZoneId`, DNS record CRUD.
3. `src/cli.ts` with token handling, `init`, `add` upsert (proxy rules), `batch` multi-format parsing.
4. `list`, `delete`, `purge` commands; `--ttl`/`--priority` flags; complete the skip-condition conjunction (content+priority+ttl+proxied).
5. `redirect` command + ruleset methods.
6. Plugin layer: manifests, SKILL.md, command, README with proxy/TTL table and install paths.
7. Hygiene: no committed binaries (`bun build --compile` output goes to ignored `bin/`), no scaffold leftovers (`index.ts`, boilerplate `CLAUDE.md`), zero runtime deps verified by `bun install` pulling nothing.

## Acceptance criteria

- `bun install` installs no runtime packages; `bunx tsc --noEmit` passes.
- `bun src/cli.ts --help` prints all seven commands with flags.
- With a valid token: `init` writes `~/.config/cloudflare-cli/token` (mode 600) and `.zones-cache.json`; `add` creates then updates the same record on re-run (no duplicates); `add --ttl 3600` unproxied automatically; MX records get `--priority` and are never proxied; `batch` consumes all five formats; `list` output includes record ids; `delete` removes matching content; `purge` accepts selective flags; `redirect example.com www.example.com` produces exactly one 301 rule with path+query preserved, and re-running it updates rather than duplicates the rule.
- No API token value, `.env` content, or zone cache file is ever committed; docs mention only the env var name `CLOUDFLARE_API_TOKEN`.
