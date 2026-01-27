---
description: Cloudflare DNS management - use when user asks about managing DNS records, zones, or Cloudflare configuration
---

# Cloudflare DNS Manager Skill

This skill enables management of Cloudflare DNS records using the `cloudflare-cli` tool.

## Prerequisites

### Installation
If `cloudflare-cli` is not available, install it:
```bash
cd /path/to/cloudflare-cli-skill
bun link
```
This registers the CLI globally. Alternatively, run directly:
```bash
bun run src/cli.ts <command>
```

### Authentication
Set the Cloudflare API token:
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```
Or initialize once to cache zones (token still required per session).

## Commands

### Initialize Cache
```bash
cloudflare-cli init
```

### Add Single Record
```bash
cloudflare-cli add <full-domain> <target> [type] [--proxied true|false]
```

### Batch Processing
```bash
cloudflare-cli batch <file.json>
```

## Proxy Guidelines
| Record Type | Proxy Setting | Reason |
|-------------|---------------|--------|
| A, AAAA, CNAME (web) | `--proxied true` (default) | Protects origin IP |
| MX | `--proxied false` | Mail servers need direct access |
| TXT | `--proxied false` | SPF/DKIM verification |
| SRV, NS | `--proxied false` | Non-HTTP services |

The CLI auto-disables proxy for MX/TXT/SRV/NS if not explicitly set.

## Batch File Format
```json
[
  { "type": "MX", "name": "example.com", "content": "mx1.mail.com", "priority": 5 },
  { "type": "TXT", "name": "example.com", "content": "v=spf1 include:_spf.mail.com ~all" },
  { "type": "CNAME", "name": "www.example.com", "content": "example.com", "proxied": true }
]
```

## When to Use
- User asks to add/update DNS records on Cloudflare
- User wants to configure domains (MX, CNAME, A, TXT records)
- User mentions setting up email (MX records, SPF, DKIM)
- User wants to point a domain to a new server/service
