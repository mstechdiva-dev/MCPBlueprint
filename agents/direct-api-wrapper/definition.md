# Direct API Wrapper Agent

## What It Does

The Direct API Wrapper agent connects to a single external API through the MCP server with no intermediary logic. It's the simplest agent pattern - one agent, one API, clean integration.

## When to Use It

- Your agent needs to call one external service and return the result
- You want the cleanest possible connection with the least moving parts
- You are starting simple and may add complexity later

## When Not to Use It

- You need to call multiple APIs as part of a single workflow (use Composite Service instead)
- The API response needs significant transformation before it is useful
- You need real-time event listening rather than request/response calls (use Event-Driven instead)

## How It Works

```
Agent → MCP Server → External API → Response returned to agent
```

No middleware. No aggregation. The agent makes a call, gets a response, passes it along.

## Configuration

See `config.example.json` for a working example.

Key fields:
- `api_endpoint` - the base URL of the external API
- `auth_method` - how the agent authenticates (api_key, oauth, bearer_token)
- `allowed_methods` - which HTTP methods this agent is permitted to use (GET, POST, etc.)
- `timeout_ms` - maximum wait time before the call is considered failed
- `retry_limit` - how many times to retry on failure before surfacing an error

## Common Use Cases

- Fetching data from a public data API
- Posting to a webhook endpoint
- Retrieving configuration from an external service
- Checking the status of a third-party resource

## Guardrail Considerations

The guardrail agent should monitor this agent for:
- Calls to endpoints outside the defined `api_endpoint`
- Auth credential exposure in response payloads
- Call volume spikes that may indicate a loop
