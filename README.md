# Cloudflare CLI

A zero-dependency CLI for managing Cloudflare DNS records. **Just needs Bun.**

## Features

- 🚀 **Zero runtime dependencies** - uses only Bun's native APIs
- 📦 **Multi-format batch support** - JSON, YAML, TOML, JSONL, JSON5
- 💾 **Local token storage** - no env var needed after setup
- ⚡ **Smart proxy defaults** - auto-disables for MX/TXT/SRV/NS

## Installation

```bash
# Clone and install
git clone https://github.com/hsingh23/cloudflare-cli.git
cd cloudflare-cli
bun install
bun link
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
cloudflare-cli batch records.toml
cloudflare-cli batch records.json5
```

## Proxy Behavior

| Type | Default | Reason |
|------|---------|--------|
| A, AAAA, CNAME | Proxied | Protects origin |
| MX, TXT, SRV, NS | Not proxied | Needs direct access |

Override with `--proxied true` or `--proxied false`.

## License

MIT
