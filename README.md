# Cloudflare CLI

A zero-dependency CLI for managing Cloudflare DNS records. **Just needs Bun.**

## Features

- 🚀 **Zero runtime dependencies** - uses only Bun's native APIs
- 📦 **Multi-format batch support** - JSON, YAML, TOML, JSONL, JSON5
- 💾 **Local token storage** - no env var needed after setup
- ⚡ **Smart proxy defaults** - auto-disables for MX/TXT/SRV/NS
- 🤖 **Claude Code plugin** - works as a skill/command

## Installation

### As a CLI tool

```bash
git clone https://github.com/hsingh23/cloudflare-cli.git
cd cloudflare-cli
bun install
bun link
```

### As a Claude Code plugin

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
- **Skill**: Auto-activates when discussing DNS/Cloudflare
- **Command**: `/cloudflare-dns:add <domain> <target> [type]`

## Setup

```bash
cloudflare-cli init --token your_cloudflare_api_token
```

## Usage

```bash
# Add records
cloudflare-cli add blog.example.com hashnode.network CNAME
cloudflare-cli add example.com 1.2.3.4 A --ttl 3600
cloudflare-cli add example.com mx1.example.com MX --priority 10 --ttl 14400

# List records
cloudflare-cli list example.com
cloudflare-cli list example.com MX

# Delete records
cloudflare-cli delete example.com old-server.example.com A

# Batch processing
cloudflare-cli batch records.yaml
```

## Proxy Behavior

| Type | Default | Reason |
|------|---------|--------|
| A, AAAA, CNAME | Proxied | Protects origin |
| MX, TXT, SRV, NS | Not proxied | Needs direct access |

**Important**: Custom TTL values automatically disable proxy, since Cloudflare forces proxied records to use TTL "Auto" (1 second). If you specify `--ttl` with a value > 1, proxy will be auto-disabled unless you explicitly set `--proxied true` (which will trigger a warning).

## Plugin Structure

```
cloudflare-cli/
├── .claude-plugin/
│   └── plugin.json       # Plugin manifest
├── skills/
│   └── cloudflare-dns/
│       └── SKILL.md      # Auto-invoked skill
├── commands/
│   └── cloudflare-dns/
│       └── add.md        # /cloudflare-dns:add command
└── src/
    └── cli.ts            # CLI implementation
```

## License

MIT
