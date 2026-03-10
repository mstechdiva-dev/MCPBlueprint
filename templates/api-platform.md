# Template: API-Heavy Platform

## Platform Type

Platforms that connect to multiple external APIs and need clean orchestration across all of them.

## Recommended Agents

1. Guardrail
2. Direct API Wrapper (one per major external API)
3. Composite Service (to unify multi-API calls)
4. Analytics Data Access (to track usage and performance across APIs)

## Starting Configuration

```json
{
  "agents": {
    "guardrail": { "active": true, "mode": "alert" },
    "direct-api-wrapper": { "active": true },
    "composite-service": { "active": true },
    "analytics-data-access": { "active": true }
  }
}
```

## Risk Notes

- API scope is the primary risk area - run the scanner with close attention to the `api-scope` rule category
- Watch for agents accumulating broader permissions over time as features are added
- Composite service agents are harder to scope-check than direct wrappers - review their service lists regularly

## When to Expand

Add Event-Driven if you need to react to API events rather than polling. Add Hierarchical MCP if the number of APIs grows to the point where coordination logic is hard to reason about.
