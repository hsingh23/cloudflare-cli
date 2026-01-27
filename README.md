# Cloudflare CLI

A zero-dependency CLI for managing Cloudflare DNS records. **Just needs Bun.**

## Features

- 🚀 **Zero runtime dependencies** - uses only Bun's native APIs
- 📦 **Multi-format batch support** - JSON, YAML, TOML, JSONL, JSON5
- 💾 **Local token storage** - no env var needed after setup
- ⚡ **Smart proxy defaults** - auto-disables for MX/TXT/SRV/NS
- 🤖 **Claude Code plugin** - works as a skill/command in Claude Code

## Installation

### As a CLI tool

```bash
git clone https://github.com/hsingh23/cloudflare-cli.git
cd cloudflare-cli
bun install
bun link
```

### As a Claude Code plugin

Add this to your project or home directory:

```bash
# Option 1: Clone into your project
git clone https://github.com/hsingh23/cloudflare-cli.git .claude-plugins/cloudflare-cli

# Option 2: Clone globally
git clone https://github.com/hsingh23/cloudflare-cli.git ~/.claude-plugins/cloudflare-cli
```

Then symlink the `.claude` folder to your project:
```bash
ln -s ~/.claude-plugins/cloudflare-cli/.claude .claude
```

Or copy the skill/command files directly:
```bash
mkdir -p .claude/skills .claude/commands
cp ~/.claude-plugins/cloudflare-cli/.claude/skills/* .claude/skills/
cp ~/.claude-plugins/cloudflare-cli/.claude/commands/* .claude/commands/
```

## Setup

```bash
# Save token locally (recommended)
cloudflare-cli init --token your_cloudflare_api_token
```

## Usage

```bash
# Add records
cloudflare-cli add blog.example.com hashnode.network CNAME
cloudflare-cli add example.com 1.2.3.4 A

# Batch processing (any format)
cloudflare-cli batch records.yaml
```

## Claude Code Commands

Once installed as a plugin:
- **Skill**: Auto-activates when discussing DNS/Cloudflare
- **Command**: Use `/cloudflare-dns` to manage records

## Proxy Behavior

| Type | Default | Reason |
|------|---------|--------|
| A, AAAA, CNAME | Proxied | Protects origin |
| MX, TXT, SRV, NS | Not proxied | Needs direct access |

## License

MIT
