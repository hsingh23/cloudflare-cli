---
name: cloudflare-dns
description: Manage Cloudflare DNS records. Use when user asks about DNS, domains, MX records, CNAME, or Cloudflare configuration.
---

# Cloudflare DNS Manager

Manage Cloudflare DNS records using the `cloudflare-cli` tool.

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
cloudflare-cli add <domain> <target> [type] [--proxied true|false]

# Batch processing (JSON, YAML, TOML, JSONL, JSON5)
cloudflare-cli batch <file>

# Refresh zone cache
cloudflare-cli init
```

## Proxy Guidelines

| Type | Proxied | Reason |
|------|---------|--------|
| A, AAAA, CNAME | Yes (default) | Protects origin IP |
| MX, TXT, SRV, NS | No (auto) | Needs direct access |
