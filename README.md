# Cloudflare CLI

A command-line tool for managing Cloudflare DNS records with local caching.

## Requirements

- **Bun** (not Node.js) - [Install Bun](https://bun.sh)

## Installation

```bash
# Clone or download this repository
cd cloudflare-cli-skill

# Install dependencies
bun install

# Link globally
bun link
```

## Setup

### Option 1: Save token locally (recommended)
```bash
cloudflare-cli init --token your_cloudflare_api_token
```
This saves the token to `~/.config/cloudflare-cli/token` and caches your zones.

### Option 2: Environment variable
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
cloudflare-cli init
```

## Usage

### Add a single record
```bash
cloudflare-cli add blog.example.com hashnode.network CNAME
cloudflare-cli add example.com 1.2.3.4 A
```

### Batch processing
Supports **JSON**, **YAML**, **TOML**, **JSONL**, and **JSON5** formats:

```bash
cloudflare-cli batch records.yaml
cloudflare-cli batch records.toml
cloudflare-cli batch records.jsonl
```

### Refresh zone cache
```bash
cloudflare-cli init
```

## Proxy Behavior

- **A, AAAA, CNAME**: Proxied by default (orange cloud)
- **MX, TXT, SRV, NS**: Auto-disabled (grey cloud)

Override with `--proxied true` or `--proxied false`.

## License

MIT
