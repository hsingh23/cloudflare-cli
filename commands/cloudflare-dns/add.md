---
description: Add or update Cloudflare DNS records
---

# Cloudflare DNS Command

Add or update DNS records using `cloudflare-cli`.

## Usage

```bash
# Single record
cloudflare-cli add $ARGUMENTS

# Batch mode
cloudflare-cli batch <file.yaml>
```

## Examples

```bash
cloudflare-cli add blog.example.com hashnode.network CNAME
cloudflare-cli add example.com 1.2.3.4 A --proxied false
```
