# CI green checklist

See root **AGENTS.md** for agent/ChatGPT rules.

```bash
node scripts/ci-guard.mjs   # version + exports + PLACEHOLDER
npm run test:unit
npm run build
```

Missing Cloudflare or Android keystore secrets must **warn and skip**, not fail the workflow.
