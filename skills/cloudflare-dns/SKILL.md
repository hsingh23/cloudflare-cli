---
name: cloudflare-dns
description: Manage Cloudflare DNS records and cache. Use when user asks about DNS, domains, MX records, CNAME, cache purge, or Cloudflare configuration.
---

# Cloudflare DNS Manager

Manage Cloudflare DNS records and cache using the `cloudflare-cli` tool.

## Prerequisites

Install the CLI:
```bash
git clone https://github.com/hsingh23/cloudflare-cli.git
cd cloudflare-cli && bun install && bun link
```

Set up token:
```bash
cloudflare-cli init --token YOUR_CLOUDFLARE_API_TOKEN
```

## Commands

```bash
# Add single record
cloudflare-cli add <domain> <target> [type] [--proxied true|false] [--ttl seconds] [--priority number]

# Batch processing (JSON, YAML, TOML, JSONL, JSON5)
cloudflare-cli batch <file>

# List records
cloudflare-cli list <domain> [type]

# Delete records
cloudflare-cli delete <domain> <content> [type]

# Purge cache (entire zone)
cloudflare-cli purge <domain>

# Purge specific URLs
cloudflare-cli purge <domain> --files https://example.com/page1,https://example.com/page2

# Refresh zone cache
cloudflare-cli init
```

## Proxy Guidelines

| Type | Proxied | Reason |
|------|---------|--------|
| A, AAAA, CNAME | Yes (default) | Protects origin IP |
| MX, TXT, SRV, NS | No (auto) | Needs direct access |

**Important**: Custom TTL values automatically disable proxy, since Cloudflare forces proxied records to use TTL "Auto" (1 second). If you specify `--ttl` with a value > 1, proxy will be auto-disabled unless you explicitly set `--proxied true` (which will trigger a warning).
