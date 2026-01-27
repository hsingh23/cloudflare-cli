---
description: Add or update Cloudflare DNS records for a domain
---

# /cloudflare-dns Command

Manage Cloudflare DNS records directly.

## Prerequisites

If `cloudflare-cli` command is not found:
```bash
cd /path/to/cloudflare-cli-skill
bun link
```

Set your token:
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```

## Usage

### Single Record
```bash
cloudflare-cli add <domain> <target> [type]
```

Example:
```bash
cloudflare-cli add blog.example.com hashnode.network CNAME
```

### Batch Mode
```bash
cloudflare-cli batch records.json
```

### Initialize/Refresh Zone Cache
```bash
cloudflare-cli init
```

## Options
- `--proxied true|false`: Enable/disable Cloudflare proxy
  - Default: `true` for A/AAAA/CNAME
  - Auto-disabled for MX/TXT/SRV/NS

## Notes
- Requires `CLOUDFLARE_API_TOKEN` environment variable
- Run `init` first to cache your zones locally
