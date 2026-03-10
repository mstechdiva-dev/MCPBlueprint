# Admin Panel

The MCPBlueprint admin panel is the control surface for managing your agents. It gives you visibility into what is active, what has been flagged, and what your current configuration looks like - without touching config files directly.

## Accessing the Panel

The admin panel runs as part of your Vercel deployment. After deploying, open your Vercel project URL - the panel is available at the root.

```bash
vercel deploy
```

Set the following in your Vercel project settings before deploying. See `.env.example` for the full list.

| Variable | Required | Description |
|----------|----------|-------------|
| `INTERNAL_AGENT_TOKEN` | Yes | Shared bearer token for internal agent-to-agent calls. Guardrail won't start without it. |
| `ADMIN_SECRET` | Recommended | Secret passed via `X-Admin-Secret` header to gate panel access. |
| `ALERT_WEBHOOK_URL` | Recommended | Webhook URL where guardrail and event-driven agents send alerts (Slack, PagerDuty, etc.). |
| `GUARDRAIL_MODE` | No | `alert` or `intervene`. Defaults to `alert`. |
| `PLATFORM_CONFIG_PATH` | No | Path to platform.json. Defaults to `./config/platform.json`. |
| `RISK_PROFILE_PATH` | No | Path to risk-profile.json. Defaults to `./risk-scanner/output/risk-profile.json`. |

## What You Can Do From the Panel

See [features.md](features.md) for the full feature list.

## Uploading Markdown Files

Agent definitions can be updated by uploading new markdown files through the panel. See [upload-spec.md](upload-spec.md) for the expected format and what gets updated when you upload.

## Security Note

Do not expose the admin panel publicly without adding authentication. No auth layer is included by default - this is intentional to keep the setup simple. If you deploy to Vercel or any public server, set `ADMIN_SECRET` and add your own auth layer before sharing the URL.
