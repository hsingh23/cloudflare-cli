# Cloudflare CLI

A zero-dependency CLI for managing Cloudflare DNS records, zone cache purges, and URL redirects. **Just needs Bun.**

The goal is fast, scriptable DNS and zone management without the dashboard: add/upsert records with sane proxy defaults, batch-apply record sets from data files, purge cache, and create apex-to-www style redirects — all from one small tool that also works as a Claude Code plugin/skill.

## Features

- 🚀 **Zero runtime dependencies** — uses only Bun's native APIs (`fetch`, `Bun.YAML`, `Bun.TOML`, `Bun.JSON5`)
- ➕ **DNS upsert** — `add` creates or updates records; re-running is safe
- 📦 **Multi-format batch support** — JSON, YAML, TOML, JSONL, JSON5
- 💾 **Local token storage** — no env var needed after setup
- ⚡ **Smart proxy defaults** — auto-disables for MX/TXT/SRV/NS; auto-disables when a custom TTL is set
- 🧹 **Cache purge** — whole-zone or selective (files, tags, hosts)
- ↪️ **Redirects** — apex-to-www (or any host-to-host) redirects via the Cloudflare Rulesets API
- 🤖 **Claude Code plugin** — works as a skill/command (`.claude-plugin/` + `skills/` + `commands/`)

## Stack

| Component | Version / notes |
|-----------|-----------------|
| Bun | Runtime and package manager (required) |
| TypeScript | `^5` (peer dependency); runs directly via Bun, no build step for CLI usage |
| `@types/bun` | `latest` (dev dependency) |
| Node/Bun stdlib | `fs`, `path`, `os` for token storage and cache I/O |

## Installation

```bash
git clone https://github.com/hsingh23/cloudflare-cli.git
cd cloudflare-cli
bun install
bun link
```

Optional: build a standalone binary (output goes to the git-ignored `bin/`):

```bash
bun build --compile --outfile bin/cloudflare-cli src/cli.ts
```

## Setup

Authentication uses a Cloudflare API token (create one in the Cloudflare dashboard under My Profile → API Tokens; it needs Zone → DNS Edit and Cache Purge permissions, and Zone → Rulesets Edit for redirects). Either:

```bash
# Store the token locally (written to ~/.config/cloudflare-cli/token with 0600 perms)
cloudflare-cli init --token your_cloudflare_api_token
```

…or set the environment variable `CLOUDFLARE_API_TOKEN`. The env var always wins over the stored token. `init` also refreshes the local zone cache (`.zones-cache.json` in the working directory).

## Usage

```bash
# Initialize / refresh zones cache (optionally saving a token first)
cloudflare-cli init --token your_cloudflare_api_token

# Add or update records
cloudflare-cli add blog.example.com hashnode.network CNAME
cloudflare-cli add example.com 1.2.3.4 A --ttl 3600
cloudflare-cli add example.com mx1.example.com MX --priority 10 --ttl 14400

# List records
cloudflare-cli list example.com
cloudflare-cli list example.com MX

# Delete records (matched by content)
cloudflare-cli delete example.com old-server.example.com A

# Batch processing (JSON, YAML, TOML, JSONL, JSON5)
cloudflare-cli batch records.yaml

# Purge cache
cloudflare-cli purge example.com                                # everything
cloudflare-cli purge example.com --files https://example.com/a  # specific URLs
cloudflare-cli purge example.com --tags tag1,tag2 --hosts a.com # by tags/hosts

# Redirects (Rulesets API, default 301, path + query preserved)
cloudflare-cli redirect example.com www.example.com
cloudflare-cli redirect example.com www.example.com --status 302 --no-preserve-path
```

Run `cloudflare-cli --help` for the full command reference.

## Proxy & TTL behavior

| Type | Default | Reason |
|------|---------|--------|
| A, AAAA, CNAME | Proxied | Protects origin |
| MX, TXT, SRV, NS | Not proxied | Needs direct access |

**Important**: Custom TTL values automatically disable proxy, since Cloudflare forces proxied records to use TTL "Auto" (1 second). If you specify `--ttl` with a value > 1, proxy will be auto-disabled unless you explicitly set `--proxied true` (which will trigger a warning).

Batch files follow the same rules when `proxied` is omitted. For multi-value types (MX, TXT, NS, SRV) the CLI matches existing records by content so re-running a batch updates rather than duplicates.

## Configuration & environment

| Name | Purpose |
|------|---------|
| `CLOUDFLARE_API_TOKEN` | Optional API token (overrides the locally stored token) |
| `~/.config/cloudflare-cli/token` | Locally stored token (created by `init --token`, mode 0600) |
| `.zones-cache.json` | Zone cache in the working directory (created by `init`, git-ignored) |

Never commit API tokens or real DNS config files; `hostinger-email.yaml` and `.env*` are git-ignored for this reason.

## Project structure

```
cloudflare-cli/
├── .claude-plugin/
│   ├── plugin.json           # Claude Code plugin manifest
│   └── marketplace.json      # Claude Code marketplace definition (hsingh23-tools)
├── skills/
│   └── cloudflare-dns/
│       └── SKILL.md          # Auto-invoked skill (Claude Code)
├── commands/
│   └── cloudflare-dns/
│       └── add.md            # /cloudflare-dns:add command (Claude Code)
├── src/
│   ├── cli.ts                # CLI entry: arg parsing + command dispatch
│   ├── cloudflare.ts         # CloudflareClient: API wrapper, zone cache, redirect rules
│   └── types.ts              # Zone / DNS record / cache interfaces
├── CHANGELOG.md              # Full commit history, newest first
├── AGENTS.md                 # Working notes for coding agents
├── architectural-diary/      # Decision records (why it looks like this)
└── prompt.md                 # One-shot prompt to recreate this project
```

## As a Claude Code plugin

**From Marketplace (recommended):**

```bash
# Add the marketplace
/plugin marketplace add github:hsingh23/cloudflare-cli

# Install the plugin
/plugin install cloudflare@hsingh23-tools
```

**Direct installation:**

```bash
# Install directly from GitHub
/install-plugin https://github.com/hsingh23/cloudflare-cli.git

# Or test locally
claude --plugin-dir /path/to/cloudflare-cli
```

Once installed, use:
- **Skill**: auto-activates when discussing DNS/Cloudflare
- **Command**: `/cloudflare-dns:add <domain> <target> [type]`

## License

MIT
