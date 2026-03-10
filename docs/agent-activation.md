# Agent Activation

## How Agents Are Activated

Agents in MCPBlueprint are opt-in. Nothing runs until you turn it on. Activation is managed through the admin panel or directly in your `config/platform.json` file.

---

## Using the Admin Panel

Open your Vercel deployment URL and navigate to the **Agents** tab. Each agent shows:
- Current status (active / inactive)
- Last activity timestamp
- Link to its definition and test file
- Toggle to activate or deactivate

Changes take effect immediately. No restart required.

---

## Using the Config File Directly

Each agent has an entry in `config/platform.json`:

```json
{
  "agents": {
    "direct-api-wrapper": { "active": false },
    "composite-service": { "active": true },
    "mcp-to-agent": { "active": false },
    "event-driven": { "active": true },
    "configuration-use": { "active": false },
    "analytics-data-access": { "active": true },
    "hierarchical-mcp": { "active": false },
    "local-resource-access": { "active": false },
    "guardrail": { "active": true }
  }
}
```

Set `"active": true` to enable, `"active": false` to disable.

---

## Recommended Activation Order

If you are setting up for the first time:

1. **Guardrail** - activate this first, before anything else
2. **Whichever agents your platform needs** - activate based on your use case
3. **Hierarchical MCP** - only if you are running multiple agents that need to coordinate

Do not activate the Hierarchical MCP agent before you have at least two other agents running and tested.

---

## Deactivating an Agent

Deactivating an agent stops it from running but doesn't delete its configuration. You can reactivate it at any time without reconfiguring.

If you want to fully remove an agent from your setup, delete its entry from `config/platform.json`. Its definition files in the `/agents` folder remain untouched.

---

## Checking What's Active

The admin panel dashboard shows all active agents and their current state. Open your Vercel deployment URL - the dashboard is the default view.
