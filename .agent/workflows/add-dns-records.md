---
description: Add Cloudflare DNS records for a domain
---

// turbo-all

1. Check if `cloudflare-cli` is available:
```bash
which cloudflare-cli || echo "Not installed - run 'bun link' in cloudflare-cli-skill directory"
```

2. Initialize if needed:
```bash
cloudflare-cli init
```

3. Add the requested records using the batch or add command.
